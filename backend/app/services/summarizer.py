import json
from groq import Groq
from app.core.config import settings

# ── Model config ─────────────────────────────────────────────────────────────
MODEL_ID = "llama-3.3-70b-versatile"
MAX_CONTEXT_WORDS = 6000
MAX_OUTPUT_TOKENS = 2048

# ── Singleton client ──────────────────────────────────────────────────────────
_client: Groq | None = None


def get_client() -> Groq:
    global _client
    if _client is None:
        if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your_groq_api_key_here":
            raise RuntimeError(
                "GROQ_API_KEY is not set. Add it to backend/.env and restart."
            )
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


# ── Prompt builder ────────────────────────────────────────────────────────────
def _build_prompt(text: str, length: str, tone: str) -> str:
    detail_level = (
        "Be concise. Use 1-2 sentences for the executive summary and 3-4 bullet points."
        if length == "concise"
        else "Be thorough. Use 3-5 sentences for the executive summary and 5-8 bullet points."
    )
    tone_instruction = (
        "Use a formal, professional business tone."
        if tone == "professional"
        else "Use a friendly, casual, conversational tone."
    )

    return f"""You are an expert document analyst and summarization assistant.

Analyze the following text and return a structured JSON response with EXACTLY these fields:

{{
  "summary_concise": "<A clear, brief 1-2 sentence summary of the entire text>",
  "summary_detailed": "<A thorough, comprehensive 4-6 sentence detailed summary>",
  "key_points": ["<point 1>", "<point 2>", "<point 3>", "..."],
  "important_insights": ["<insight 1>", "<insight 2>", "..."],
  "keywords": ["<keyword1>", "<keyword2>", "<keyword3>", "...up to 8 keywords>"],
  "metadata_insights": {{
    "detected_topic": "<Main topic or subject matter>",
    "reading_difficulty": "<Beginner | Intermediate | Advanced | Expert>",
    "content_complexity": "<Low | Medium | High | Very High>",
    "estimated_audience": "<Target audience demographic>",
    "category": "<Industry or broad category>",
    "writing_style": "<e.g., Analytical, Narrative, Persuasive, Academic>"
  }},
  "tone_analysis": {{
    "overall_tone": "<e.g. Informative, Persuasive, Analytical, Critical, Neutral>",
    "sentiment": "<Positive | Negative | Neutral>",
    "formality": "<Formal | Semi-Formal | Informal>",
    "confidence": "<High | Medium | Low>",
    "confidence_score": <integer 0-100 representing confidence percentage>,
    "sentiment_scores": {{
      "positive": <integer 0-100>,
      "negative": <integer 0-100>,
      "neutral": <integer 0-100>
    }}
  }}
}}

Rules:
- {tone_instruction}
- Only use information from the provided text.
- Return ONLY valid JSON — no markdown, no code fences, no extra text.
- key_points and important_insights must be arrays of strings.
- keywords must be single words or short phrases.
- sentiment_scores.positive + sentiment_scores.negative + sentiment_scores.neutral MUST equal exactly 100.
- confidence_score should reflect how clearly the text expresses its sentiment (0 = very ambiguous, 100 = crystal clear).

TEXT TO ANALYZE:
\"\"\"
{text}
\"\"\"
"""



# ── Chunking for long docs ────────────────────────────────────────────────────
def _chunk_text(text: str, max_words: int = MAX_CONTEXT_WORDS) -> list[str]:
    words = text.split()
    return [
        " ".join(words[i: i + max_words])
        for i in range(0, len(words), max_words)
    ]


def _call_groq(prompt: str, max_tokens: int = MAX_OUTPUT_TOKENS) -> str:
    client = get_client()
    response = client.chat.completions.create(
        model=MODEL_ID,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    return response.choices[0].message.content.strip()


# ── Core function ─────────────────────────────────────────────────────────────
def generate_summary(text: str, length: str = "detailed", tone: str = "professional") -> dict:
    """
    Summarize text and return a structured dict with sections:
    executive_summary, key_points, important_insights, keywords, tone_analysis.
    """
    text = text.strip()
    if not text:
        raise ValueError("Input text is empty.")

    words = text.split()

    if len(words) <= MAX_CONTEXT_WORDS:
        # Short text — single structured call
        raw = _call_groq(_build_prompt(text, length, tone))
    else:
        # Long text — chunk → plain summaries → final structured call
        chunks = _chunk_text(text, max_words=MAX_CONTEXT_WORDS)
        chunk_texts = []
        for i, chunk in enumerate(chunks):
            print(f"   [Groq] Pre-summarizing chunk {i + 1}/{len(chunks)}...")
            mini_prompt = (
                f"Summarize the following text in a few sentences:\n\"\"\"\n{chunk}\n\"\"\""
            )
            resp = get_client().chat.completions.create(
                model=MODEL_ID,
                messages=[{"role": "user", "content": mini_prompt}],
                temperature=0.3,
                max_tokens=400,
            )
            chunk_texts.append(resp.choices[0].message.content.strip())

        merged = "\n\n".join(chunk_texts)
        raw = _call_groq(_build_prompt(merged, length, tone))

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: wrap raw text in structure if JSON parsing fails
        result = {
            "summary_concise": raw[:200] + "...",
            "summary_detailed": raw,
            "key_points": [],
            "important_insights": [],
            "keywords": [],
            "metadata_insights": {
                "detected_topic": "Unknown",
                "reading_difficulty": "Unknown",
                "content_complexity": "Unknown",
                "estimated_audience": "Unknown",
                "category": "Unknown",
                "writing_style": "Unknown"
            },
            "tone_analysis": {
                "overall_tone": "Unknown",
                "sentiment": "Neutral",
                "formality": "Formal",
                "confidence": "Low",
            },
        }

    return result

# ── Chat Function ─────────────────────────────────────────────────────────────
def chat_with_document(context_text: str, messages: list[dict]) -> str:
    system_prompt = f"""You are an expert AI assistant analyzing a document for the user.
Answer the user's questions based ONLY on the provided document context. 
If the answer is not in the document, politely say so.

DOCUMENT CONTEXT:
\"\"\"
{context_text}
\"\"\"
"""
    api_messages = [{"role": "system", "content": system_prompt}]
    for m in messages:
        api_messages.append({"role": m["role"], "content": m["content"]})

    client = get_client()
    response = client.chat.completions.create(
        model=MODEL_ID,
        messages=api_messages,
        temperature=0.3,
        max_tokens=1024,
    )
    return response.choices[0].message.content.strip()
