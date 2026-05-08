import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, MessageSquare } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function ChatPanel({ entry, updateEntry }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const { token } = useAuth();

  const messages = entry.chat || entry.result?.chat || [];

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newMessages = [...messages, { role: 'user', content: input.trim() }];
    updateEntry(entry.id, { chat: newMessages });
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          context: entry.result?.source_text || '',
          messages: newMessages
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);

      updateEntry(entry.id, { 
        chat: [...newMessages, { role: 'assistant', content: data.reply }]
      });
    } catch (err) {
      updateEntry(entry.id, {
        chat: [...newMessages, { role: 'assistant', content: "Error: " + err.message }]
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel flex flex-col h-[500px] overflow-hidden mt-6 animate-in slide-in-from-bottom-4 fade-in duration-500 shadow-2xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-main flex items-center justify-between bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center border border-primary-500/30">
            <MessageSquare className="w-4 h-4 text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-main text-sm">Document Q&A</h3>
            <p className="text-xs text-muted">Ask questions about your analyzed content</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth bg-page/30"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted space-y-3">
            <Bot className="w-10 h-10 opacity-20 mb-2" />
            <p className="text-sm font-medium">I have analyzed this document.</p>
            <p className="text-xs text-center max-w-[250px] leading-relaxed">
              Ask me to extract details, clarify points, or summarize specific sections.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white border border-primary-400' 
                  : 'bg-card border border-main text-primary-400'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[75%] px-4 py-2.5 text-sm shadow-md leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-2xl rounded-tr-sm'
                  : 'bg-card border border-main text-main rounded-2xl rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-card border border-main text-primary-400 shadow-md">
              <Bot className="w-4 h-4" />
            </div>
            <div className="max-w-[75%] rounded-2xl px-4 py-3 text-sm bg-card border border-main text-main rounded-tl-sm flex items-center gap-1.5 shadow-md">
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 border-t border-main bg-card/80">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Message the document..."
            className="w-full bg-page border border-main rounded-xl pl-4 pr-12 py-3 text-sm text-main placeholder-muted focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all shadow-inner"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 w-8 h-8 flex items-center justify-center rounded-lg bg-primary-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-500 transition-colors shadow-md"
          >
            <Send className="w-4 h-4 -ml-0.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
