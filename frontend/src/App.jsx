import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles, FileText, Settings, History, BarChart3, Clock,
  Copy, AlignLeft, UploadCloud, Link as LinkIcon, Type, X,
  File as FileIcon, Tag, Lightbulb, ListChecks, Brain, CheckCircle2,
  AlertCircle, Trash2, Download, ChevronDown, LayoutGrid, Zap,
  Target, Users, Library, Activity, Layers, PenTool, Hash, BookOpen,
  LogOut, User as UserIcon, Sun, Moon,
  Bell, Search, Command, PlusCircle, HelpCircle,
  Menu, Globe
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import SentimentChart from './SentimentChart';
import { useHistory, formatRelativeTime } from './useHistory';
import { exportTxt, exportPdf, exportDocx } from './exportUtils';
import { useSectionState } from './useSectionState';
import LoadingOverlay, { SkeletonOutput } from './LoadingOverlay';
import ChatPanel from './ChatPanel';
import AuthModal from './AuthModal';
import { useAuth } from './AuthContext';
import './index.css';

// ── Collapsible Section Card ─────────────────────────────────────────────────

function SectionCard({ id, icon: Icon, title, accentColor, defaultOpen = true, children }) {
  const [isOpen, toggle] = useSectionState(id, defaultOpen);
  const bodyRef = useRef(null);

  return (
    <div className="glass-panel relative overflow-hidden group">
      {/* Ambient glow */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-all duration-700 ${accentColor}`} />

      {/* Header / Toggle */}
      <button
        onClick={toggle}
        className="relative z-10 w-full flex items-center justify-between px-5 py-4 text-left focus:outline-none"
      >
        <h3 className="text-sm font-semibold text-muted flex items-center gap-2 uppercase tracking-widest">
          <Icon className="w-4 h-4" />
          {title}
        </h3>
        <div className={`w-6 h-6 rounded-full bg-page border border-main flex items-center justify-center transition-all duration-300 ${isOpen ? 'border-primary-500/40' : ''}`}>
          <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180 text-primary-400' : ''}`} />
        </div>
      </button>

      {/* Animated body */}
      <div
        style={{
          maxHeight: isOpen ? '1000px' : '0px',
          opacity:   isOpen ? 1 : 0,
          overflow:  'hidden',
          transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
        }}
      >
        <div ref={bodyRef} className="relative z-10 px-5 pb-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function SummaryOutput({ data }) {
  const [copied, setCopied]   = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const exportRef = useRef(null);

  const handleCopy = () => {
    const text = [
      `Executive Summary:\n${data.summary_detailed || data.executive_summary}`,
      `\nKey Points:\n${data.key_points?.map(p => `• ${p}`).join('\n')}`,
      `\nImportant Insights:\n${data.important_insights?.map(i => `→ ${i}`).join('\n')}`,
      `\nKeywords: ${data.keywords?.join(', ')}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (format) => {
    setShowExport(false);
    if (format === 'txt')  exportTxt(data);
    if (format === 'pdf')  exportPdf(data);
    if (format === 'docx') await exportDocx(data);
  };

  const sentimentColor = {
    Positive: 'text-emerald-400',
    Negative: 'text-red-400',
    Neutral: 'text-blue-400',
  }[data.tone_analysis?.sentiment] || 'text-gray-400';

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-main">
          <Sparkles className="w-5 h-5 text-primary-400" />
          AI Analysis Dashboard
        </h2>
        <div className="flex items-center gap-2">
          {/* Comparison Mode Toggle */}
          <button
            onClick={() => setIsComparisonMode(!isComparisonMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isComparisonMode 
                ? 'bg-primary-600 border-primary-500 text-white shadow-md' 
                : 'bg-page border-main text-muted hover:text-main hover:bg-card'
            }`}
          >
            {isComparisonMode ? <AlignLeft className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
            {isComparisonMode ? 'Standard View' : 'Compare Modes'}
          </button>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-page border border-main text-xs text-muted hover:text-main hover:bg-card transition-all"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>

          {/* Export dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setShowExport(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600/20 hover:bg-primary-600/30 border border-primary-500/30 text-xs text-primary-400 hover:text-primary-300 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export
              <ChevronDown className={`w-3 h-3 transition-transform ${showExport ? 'rotate-180' : ''}`} />
            </button>

            {showExport && (
              <div className="absolute right-0 top-full mt-1.5 w-44 glass-panel rounded-xl overflow-hidden z-50 border border-dark-600 shadow-2xl">
                {[
                  { fmt: 'pdf',  label: 'PDF Report',      icon: '📄', desc: 'Styled dark PDF' },
                  { fmt: 'docx', label: 'DOCX Document',   icon: '📝', desc: 'Word document' },
                  { fmt: 'txt',  label: 'TXT Summary',     icon: '📋', desc: 'Plain text file' },
                ].map(({ fmt, label, icon, desc }) => (
                  <button
                    key={fmt}
                    onClick={() => handleExport(fmt)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-dark-700 transition-colors text-left group"
                  >
                    <span className="text-base mt-0.5">{icon}</span>
                    <div>
                      <div className="text-sm font-medium text-main group-hover:text-primary-400 transition-colors">{label}</div>
                      <div className="text-[10px] text-muted">{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isComparisonMode ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
          <SectionCard id="comp-concise" icon={Zap} title="Concise" accentColor="bg-cyan-500">
            <p className="text-main text-sm leading-relaxed">{data.summary_concise || data.executive_summary}</p>
          </SectionCard>
          <SectionCard id="comp-detailed" icon={Brain} title="Detailed" accentColor="bg-primary-500">
            <p className="text-main text-sm leading-relaxed">{data.summary_detailed || data.executive_summary}</p>
          </SectionCard>
          <SectionCard id="comp-bullets" icon={ListChecks} title="Key Points" accentColor="bg-indigo-500">
            <ul className="space-y-2">
              {data.key_points?.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5 text-main text-sm">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-300">
          {/* Executive Summary */}
          <div className="md:col-span-12">
            <SectionCard id="executive-summary" icon={Brain} title="Executive Summary" accentColor="bg-primary-500">
              <p className="text-main leading-relaxed text-base">{data.summary_detailed || data.executive_summary}</p>
            </SectionCard>
          </div>

          {/* Row 1: Key Points & Tone */}
          <div className="md:col-span-8">
            {data.key_points?.length > 0 && (
              <SectionCard id="key-points" icon={ListChecks} title="Key Points" accentColor="bg-indigo-500">
                <ul className="space-y-3">
                  {data.key_points.map((point, i) => (
                    <li key={i} className="flex items-start gap-3 text-main text-sm">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </div>

          <div className="md:col-span-4">
            {data.tone_analysis && (
              <SectionCard id="tone-analysis" icon={BarChart3} title="Tone & Sentiment" accentColor="bg-violet-500">
                <div className="space-y-3">
                  {[
                    { label: 'Overall Tone', value: data.tone_analysis.overall_tone },
                    { label: 'Sentiment',    value: data.tone_analysis.sentiment, className: sentimentColor },
                    { label: 'Formality',    value: data.tone_analysis.formality },
                  ].map(({ label, value, className }) => (
                    <div key={label} className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted font-bold">{label}</span>
                      <span className={`text-sm font-semibold ${className || 'text-main'}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* Row 2: Insights & Sentiment Chart */}
          <div className="md:col-span-8">
            {data.important_insights?.length > 0 && (
              <SectionCard id="insights" icon={Lightbulb} title="Important Insights" accentColor="bg-amber-500">
                <div className="grid grid-cols-1 gap-4">
                  {data.important_insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-page/40 border border-main hover:border-amber-500/30 transition-all">
                      <span className="mt-0.5 text-amber-500 shrink-0 font-bold text-lg">→</span>
                      <p className="text-sm text-main leading-relaxed">{insight}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          <div className="md:col-span-4">
            {data.tone_analysis && (
              <div className="glass-panel p-5 h-full flex flex-col justify-center min-h-[300px]">
                <SentimentChart toneAnalysis={data.tone_analysis} />
              </div>
            )}
          </div>

          {/* Metadata Grid */}
          <div className="md:col-span-12">
            {data.metadata_insights && (
              <SectionCard id="metadata-insights" icon={Target} title="Content Metadata" accentColor="bg-fuchsia-500">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  {[
                    { label: 'Topic', value: data.metadata_insights.detected_topic, icon: Hash },
                    { label: 'Category', value: data.metadata_insights.category, icon: Library },
                    { label: 'Audience', value: data.metadata_insights.estimated_audience, icon: Users },
                    { label: 'Difficulty', value: data.metadata_insights.reading_difficulty, icon: BookOpen },
                    { label: 'Complexity', value: data.metadata_insights.content_complexity, icon: Layers },
                    { label: 'Style', value: data.metadata_insights.writing_style, icon: PenTool },
                  ].map((item, i) => (
                    <div key={i} className="bg-page/50 border border-main rounded-xl p-3 flex flex-col gap-1.5 hover:bg-card hover:border-fuchsia-500/30 transition-all hover:scale-105">
                      <div className="flex items-center gap-2 text-muted">
                        <item.icon className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                      </div>
                      <div className="text-xs text-main font-medium leading-tight line-clamp-2">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* Keywords */}
          <div className="md:col-span-12">
            {data.keywords?.length > 0 && (
              <SectionCard id="keywords" icon={Tag} title="Target Keywords" accentColor="bg-cyan-500">
                <div className="flex flex-wrap gap-2">
                  {data.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 dark:text-cyan-300 text-xs font-semibold shadow-sm hover:scale-110 transition-transform cursor-default"
                    >
                      # {kw}
                    </span>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileDropdown({ user, logout }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user.fullName 
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase() 
    : user.email[0].toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pr-3 rounded-full bg-dark-800 border border-dark-600 hover:bg-dark-700 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/50"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
          {initials}
        </div>
        <span className="text-sm font-medium text-gray-300 hidden sm:inline">
          {user.fullName || user.email.split('@')[0]}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 glass-panel p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-3 border-b border-dark-600 mb-2">
            <p className="text-sm font-semibold text-white truncate">{user.fullName || 'User'}</p>
            <p className="text-xs text-gray-500 truncate mb-2">{user.email}</p>
            {user.createdAt && (
              <p className="text-[10px] uppercase tracking-wider text-gray-600 font-bold">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
          
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const { user, token, logout } = useAuth();
  const [inputType, setInputType] = useState('text');
  const [inputText, setInputText] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [file, setFile] = useState(null);

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSkeleton,  setShowSkeleton]  = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError]   = useState('');

  const [urlPreview, setUrlPreview] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    if (inputType !== 'url') return;
    if (!inputUrl || !inputUrl.startsWith('http')) {
      setUrlPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsPreviewLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/api/preview/url?url=${encodeURIComponent(inputUrl)}`);
        if (res.ok) {
          const data = await res.json();
          setUrlPreview(data);
        } else {
          setUrlPreview(null);
        }
      } catch {
        setUrlPreview(null);
      } finally {
        setIsPreviewLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inputUrl, inputType]);

  const [summaryLength, setSummaryLength] = useState('detailed');
  const [summaryTone, setSummaryTone] = useState('professional');

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  useEffect(() => {
    document.title = "Infera AI | Intelligent Content Analysis";
  }, []);

  const { history, currentEntryId, setCurrentEntryId, addEntry, removeEntry, clearHistory, updateEntry } = useHistory();
  const currentEntry = history.find(e => e.id === currentEntryId);

  // Navbar States
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState(JSON.parse(localStorage.getItem('recentSearches') || '[]'));
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Analysis Complete', message: 'Financial_Report_Q4.pdf is ready', time: '2m ago', type: 'success' },
    { id: 2, title: 'Upload Success', message: 'Investment_Strategy.docx uploaded', time: '15m ago', type: 'info' },
    { id: 3, title: 'Welcome to Infera AI', message: 'Start by uploading a document', time: '1h ago', type: 'system' }
  ]);

  const searchResults = searchQuery.trim() 
    ? history.filter(entry => 
        entry.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.summary_preview?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  const handleSearchSelect = (entry) => {
    handleLoadEntry(entry);
    setSearchQuery('');
    setShowSearchSuggestions(false);
    
    // Add to recent searches
    const updated = [entry.label, ...recentSearches.filter(s => s !== entry.label)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click Outside Detection for Navbar
  const searchRef = useRef(null);
  const helpRef = useRef(null);
  const actionsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchSuggestions(false);
      }
      if (helpRef.current && !helpRef.current.contains(event.target)) {
        setShowHelp(false);
      }
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setShowQuickActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate real-time stats from history
  const stats = useMemo(() => {
    let totalSourceWords = 0;
    let totalSummaryWords = 0;

    history.forEach(entry => {
      const source = entry.result?.source_text || "";
      const summary = entry.result?.summary_detailed || entry.result?.summary_concise || "";
      
      const sourceCount = source.split(/\s+/).filter(Boolean).length;
      const summaryCount = summary.split(/\s+/).filter(Boolean).length;
      
      totalSourceWords += sourceCount;
      totalSummaryWords += summaryCount;
    });

    const wordsSaved = Math.max(0, totalSourceWords - totalSummaryWords);
    // Average reading speed: 225 wpm
    const totalMinutes = wordsSaved / 225;
    const hoursSaved = totalMinutes / 60;

    let timeSavedStr = '';
    if (totalMinutes < 60) {
      timeSavedStr = Math.round(totalMinutes) + 'm';
    } else {
      timeSavedStr = hoursSaved.toFixed(1) + 'h';
    }

    return {
      wordsSaved: wordsSaved >= 1000 ? (wordsSaved / 1000).toFixed(1) + 'k' : wordsSaved,
      hoursSaved: timeSavedStr
    };
  }, [history]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles?.length > 0) setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
  });

  const removeFile = (e) => { e.stopPropagation(); setFile(null); };

  const canSummarize = () => {
    if (inputType === 'text') return inputText.trim().length > 0;
    if (inputType === 'url') return inputUrl.trim().length > 0;
    if (inputType === 'file') return file !== null;
    return false;
  };

  const handleSummarize = async () => {
    if (!canSummarize()) return;
    setIsSummarizing(true);
    setShowSkeleton(false);
    setResult(null);
    setError('');

    try {
      const API_BASE = 'http://localhost:8000/api';
      let response;

      if (inputType === 'text') {
        response = await fetch(`${API_BASE}/summarize/text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text: inputText, length: summaryLength, tone: summaryTone }),
        });
      } else if (inputType === 'url') {
        response = await fetch(`${API_BASE}/summarize/url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ url: inputUrl, length: summaryLength, tone: summaryTone }),
        });
      } else {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('length', summaryLength);
        formData.append('tone', summaryTone);
        response = await fetch(`${API_BASE}/summarize/file`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Summarization failed');

      // Brief skeleton flash for smooth transition
      setIsSummarizing(false);
      setShowSkeleton(true);
      await new Promise(r => setTimeout(r, 600));
      setShowSkeleton(false);
      setResult(data);

      // Persist to localStorage history
      const label =
        inputType === 'text'
          ? (inputText.trim().slice(0, 40) + (inputText.length > 40 ? '...' : ''))
          : inputType === 'url'
          ? inputUrl
          : file?.name || 'Uploaded file';

      const entryId = await addEntry({
        label,
        input_type:     inputType,
        sentiment:      data.tone_analysis?.sentiment || 'Neutral',
        summary_preview: (data.summary_detailed || data.executive_summary || '').slice(0, 120) + '...',
        keywords:       data.keywords?.slice(0, 4) || [],
        result:         data,
      });
      setCurrentEntryId(entryId);
    } catch (err) {
      setError(err.message);
      setIsSummarizing(false);
      setShowSkeleton(false);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Restore a past analysis from history into the output panel
  const handleLoadEntry = (entry) => {
    setResult(entry.result);
    setCurrentEntryId(entry.id);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans selection:bg-primary-500/30 transition-colors duration-300 relative overflow-x-hidden">
      {/* Background Blobs */}
      <div className="bg-blob bg-primary-600 top-[-100px] left-[-100px]" />
      <div className="bg-blob bg-indigo-600 bottom-[-100px] right-[-100px]" style={{ animationDelay: '-5s' }} />
      <div className="bg-blob bg-purple-600 top-[40%] right-[10%]" style={{ animationDelay: '-10s', width: '300px', height: '300px' }} />

      {!user && <AuthModal onClose={() => {}} />}

      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="glass-panel px-6 py-3 flex items-center justify-between gap-8 border-white/10 dark:border-white/5 shadow-2xl min-h-[64px]">
            {/* Branding */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-500/20 group cursor-pointer hover:rotate-12 transition-all">
                <Sparkles className="text-white w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold tracking-tight text-main flex items-center gap-1.5">
                  Infera<span className="text-primary-400">AI</span>

                </h1>
                <p className="text-[10px] text-muted -mt-1 font-medium hidden lg:block">Intelligent Content Analysis</p>
              </div>
            </div>

            {/* Command Palette / Search */}
            <div className="flex-1 max-w-lg hidden md:flex relative group" ref={searchRef}>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary-400 transition-colors">
                <Search className="w-4 h-4" />
              </div>
              <input 
                id="global-search"
                type="text" 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchSuggestions(true);
                }}
                onFocus={() => setShowSearchSuggestions(true)}
                placeholder="Search history or run command..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-12 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition-all shadow-inner caret-primary-500 font-medium"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-page border border-main text-[10px] text-muted font-bold shadow-sm">
                <Command className="w-2.5 h-2.5" />
                <span>K</span>
              </div>

              {/* Search Suggestions Dropdown */}
              {showSearchSuggestions && (searchQuery.trim() || recentSearches.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 glass-panel border-main shadow-2xl overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-black/5 dark:ring-white/5">
                  <div className="p-2 border-b border-main bg-card/30 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider px-2">
                      {searchQuery.trim() ? 'Search Results' : 'Recent Searches'}
                    </span>
                    <button onClick={() => setShowSearchSuggestions(false)} className="p-1 hover:bg-page rounded text-muted">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {searchQuery.trim() ? (
                      searchResults.length > 0 ? (
                        searchResults.map(entry => (
                          <button
                            key={entry.id}
                            onClick={() => handleSearchSelect(entry)}
                            className="w-full px-4 py-3 hover:bg-primary-500/10 text-left flex items-center gap-3 group transition-colors"
                          >
                            <FileText className="w-4 h-4 text-muted group-hover:text-primary-400" />
                            <div className="min-w-0">
                              <div className="text-sm text-main font-medium truncate">{entry.label}</div>
                              <div className="text-[10px] text-muted truncate">{entry.summary_preview}</div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-sm text-muted">No results found for "{searchQuery}"</div>
                      )
                    ) : (
                      recentSearches.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setSearchQuery(s)}
                          className="w-full px-4 py-2.5 hover:bg-page text-left flex items-center gap-3 text-sm text-main transition-colors"
                        >
                          <History className="w-4 h-4 text-muted" />
                          {s}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-1 border-r border-main pr-3 mr-1 relative" ref={actionsRef}>
                <button 
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  className={`p-2 rounded-lg transition-all ${showQuickActions ? 'text-primary-400 bg-page' : 'text-muted hover:text-primary-400 hover:bg-page'}`}
                  title="Quick Actions"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>
                
                {showQuickActions && (
                  <div className="absolute top-full right-0 mt-2 w-48 glass-panel border-main shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1">
                      {[
                        { label: 'New Analysis', icon: Sparkles, onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
                        { label: 'Upload File', icon: UploadCloud, onClick: () => setInputType('file') },
                        { label: 'Clear History', icon: Trash2, onClick: clearHistory, className: 'text-red-400 hover:bg-red-500/10' },
                        { label: 'Export All', icon: Download, onClick: () => alert('Exporting history...') },
                      ].map((action, i) => (
                        <button
                          key={i}
                          onClick={() => { action.onClick(); setShowQuickActions(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-page ${action.className || 'text-main'}`}
                        >
                          <action.icon className="w-4 h-4" />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="relative" ref={helpRef}>
                  <button 
                    onClick={() => setShowHelp(!showHelp)}
                    className={`p-2 rounded-lg transition-all ${showHelp ? 'text-primary-400 bg-page' : 'text-muted hover:text-primary-400 hover:bg-page'}`}
                    title="Help & Documentation"
                  >
                    <HelpCircle className="w-5 h-5" />
                  </button>

                  {showHelp && (
                    <div className="absolute top-full right-0 mt-2 w-72 glass-panel border-main shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-4 border-b border-main bg-card/30">
                        <h3 className="text-sm font-bold text-main mb-1">Help & Guide</h3>
                        <p className="text-[10px] text-muted">Master the NexusAI workflow</p>
                      </div>
                      
                      <div className="p-2 space-y-4 max-h-[400px] overflow-y-auto">
                        {/* Shortcuts */}
                        <div>
                          <span className="text-[10px] font-bold text-muted uppercase tracking-wider px-2 mb-2 block">Keyboard Shortcuts</span>
                          <div className="space-y-1">
                            {[
                              { key: 'Ctrl + K', desc: 'Focus Search' },
                              { key: 'Enter',     desc: 'Submit Analysis' },
                              { key: 'Esc',       desc: 'Close Modals' },
                            ].map((s, i) => (
                              <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-page transition-colors">
                                <span className="text-xs text-main">{s.desc}</span>
                                <span className="text-[10px] bg-card px-1.5 py-0.5 rounded border border-main font-mono text-muted">{s.key}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Formats */}
                        <div>
                          <span className="text-[10px] font-bold text-muted uppercase tracking-wider px-2 mb-2 block">Supported Formats</span>
                          <div className="grid grid-cols-2 gap-2 px-2">
                            {['PDF Docs', 'Word (.docx)', 'Web URLs', 'Raw Text'].map((f, i) => (
                              <div key={i} className="flex items-center gap-2 text-[11px] text-muted">
                                <CheckCircle2 className="w-3 h-3 text-primary-400" />
                                {f}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* AI Tips */}
                        <div className="px-2 py-3 bg-primary-500/5 rounded-xl border border-primary-500/10">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                            <span className="text-xs font-bold text-main">Pro Tip</span>
                          </div>
                          <p className="text-[11px] text-muted leading-relaxed">
                            Use the <b>Chat Assistant</b> below your analysis to extract specific data or clarify points from your document.
                          </p>
                        </div>
                      </div>
                      

                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg text-muted hover:text-primary-400 hover:bg-page transition-all"
                  title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>



                {user && (
                  <ProfileDropdown user={user} logout={logout} />
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Spacing for fixed nav */}
      <div className="h-28" />

      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 pb-12">

        {/* ── Left Column ─────────────────────────────────────────────────── */}
        <div className="md:col-span-8 space-y-6">

          {/* Input Panel */}
          <div className="glass-panel p-6 flex flex-col h-[420px]">
            {/* Tab Toggle */}
            <div className="flex items-center justify-between mb-4">
              <div className="bg-page/80 p-1 rounded-xl flex items-center gap-1 border border-main">
                {[
                  { id: 'text', icon: Type, label: 'Text' },
                  { id: 'url', icon: LinkIcon, label: 'URL' },
                  { id: 'file', icon: UploadCloud, label: 'File' },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setInputType(id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      inputType === id
                        ? 'bg-card text-main shadow-md border border-main'
                        : 'text-muted hover:text-main hover:bg-page'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>
              {inputType === 'text' && <span className="px-3 py-1 rounded-full bg-page border border-main text-xs font-medium text-muted">
                  {inputText.length} chars
                </span>
              }
            </div>

            {/* Input Area */}
            <div className="flex-1 min-h-0">
              {inputType === 'text' && <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Paste your long text, article, or document here..."
                  className="w-full h-full bg-page border border-main rounded-xl p-4 text-main placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none transition-all"
                />
              }

              {inputType === 'url' && (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-300">
                  <div className="relative w-full max-w-lg mx-auto">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <LinkIcon className="h-5 w-5 text-gray-500" />
                    </div>
                    <input
                      type="url"
                      value={inputUrl}
                      onChange={e => setInputUrl(e.target.value)}
                      className="block w-full pl-11 pr-4 py-4 bg-dark-900 border border-dark-600 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all text-sm shadow-inner"
                      placeholder="https://example.com/article"
                    />
                  </div>

                  {isPreviewLoading ? (
                    <div className="w-full max-w-lg glass-panel p-4 flex items-center gap-4 animate-pulse">
                      <div className="w-16 h-16 bg-dark-700 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-dark-700 rounded w-3/4" />
                        <div className="h-3 bg-dark-700 rounded w-1/2" />
                      </div>
                    </div>
                  ) : urlPreview ? (
                    <div className="w-full max-w-lg glass-panel p-4 flex items-start gap-4 animate-in slide-in-from-bottom-2 fade-in group relative overflow-hidden">
                      {urlPreview.image ? (
                        <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-dark-600 group-hover:border-primary-500/30 transition-colors">
                          <img src={urlPreview.image} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-lg shrink-0 bg-dark-800 flex items-center justify-center border border-dark-600">
                          <LinkIcon className="w-8 h-8 text-dark-500" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-gray-200 font-medium text-sm line-clamp-2 leading-tight group-hover:text-primary-400 transition-colors">
                          {urlPreview.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <img src={urlPreview.favicon} alt="" className="w-3 h-3 rounded-sm" onError={(e) => e.target.style.display='none'} />
                          <span className="truncate">{urlPreview.domain}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] font-medium text-accent-400 bg-accent-400/10 border border-accent-400/20 px-2 py-0.5 rounded-full w-fit">
                          <Clock className="w-3 h-3" />
                          {urlPreview.reading_time} min read
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-sm text-gray-500 mt-2">
                      Paste a link to any public article or blog post
                    </p>
                  )}
                </div>
              )}

              {inputType === 'file' && (
                <div
                  {...getRootProps()}
                  className={`w-full h-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 cursor-pointer transition-all duration-300 ${
                    isDragActive
                      ? 'border-primary-500 bg-primary-500/10 scale-[1.01]'
                      : 'border-dark-600 hover:border-dark-500 bg-dark-900/50 hover:bg-dark-900/80'
                  }`}
                >
                  <input {...getInputProps()} />
                  {file ? (
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center mb-4 text-primary-400 relative border border-primary-500/30">
                        <FileIcon className="w-8 h-8" />
                        <button onClick={removeFile} className="absolute -top-2 -right-2 w-6 h-6 bg-dark-700 hover:bg-red-500 border border-dark-600 rounded-full flex items-center justify-center text-white transition-all">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-gray-200 font-medium truncate max-w-[250px]">{file.name}</p>
                      <p className="text-sm text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center text-gray-400">
                      <UploadCloud className={`w-10 h-10 mb-3 ${isDragActive ? 'text-primary-400 animate-bounce' : 'text-gray-500'}`} />
                      <p className="text-gray-300 font-medium mb-1">
                        {isDragActive ? 'Drop your file here!' : 'Drag & drop, or click to browse'}
                      </p>
                      <p className="text-sm text-gray-600">Supports PDF and DOCX</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="mt-4 flex justify-between items-center">
              <div className="flex gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1.5"><AlignLeft className="w-4 h-4" /> Paragraph</span>
                <span className="flex items-center gap-1.5"><BarChart3 className="w-4 h-4" /> Bullet</span>
              </div>
              <button
                onClick={handleSummarize}
                disabled={isSummarizing || !canSummarize()}
                className="bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-primary-500/25 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 neon-glow"
              >
                {isSummarizing
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing...</>
                  : <><Sparkles className="w-4 h-4" /> Analyze</>
                }
              </button>
            </div>
          </div>

          {/* Output Area */}
          <div className="glass-panel p-6 min-h-[200px] transition-all duration-500">
            {/* AI Loading overlay */}
            {isSummarizing && <LoadingOverlay isVisible={isSummarizing} />}

            {/* Skeleton transition */}
            {showSkeleton && !isSummarizing && <SkeletonOutput />}

            {/* Error state */}
            {error && !isSummarizing && !showSkeleton && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Result */}
            {result && !isSummarizing && !showSkeleton && <SummaryOutput data={result} />}

            {/* Empty state */}
            {!result && !isSummarizing && !showSkeleton && !error && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500 space-y-3">
                <div className="w-14 h-14 rounded-full bg-dark-900 border border-dark-700 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-dark-600" />
                </div>
                <p>Paste your content above and hit Analyze</p>
              </div>
            )}
          </div>

          </div>


        {/* ── Right Column ─────────────────────────────────────────────────── */}
        <div className="md:col-span-4 space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-5 hover:-translate-y-1 hover:shadow-primary-500/10 transition-all duration-300 group">
              <div className="flex items-center gap-2 text-muted mb-2">
                <BarChart3 className="w-4 h-4 group-hover:text-primary-400 transition-colors" />
                <span className="text-xs font-medium">Words Saved</span>
              </div>
              <div className="text-2xl font-bold text-main">{stats.wordsSaved}</div>
              <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Real-time total
              </div>
            </div>
            <div className="glass-panel p-5 hover:-translate-y-1 hover:shadow-indigo-500/10 transition-all duration-300 group">
              <div className="flex items-center gap-2 text-muted mb-2">
                <Clock className="w-4 h-4 group-hover:text-indigo-400 transition-colors" />
                <span className="text-xs font-medium">Time Saved</span>
              </div>
              <div className="text-2xl font-bold text-main">{stats.hoursSaved}</div>
              <div className="text-xs text-primary-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 inline-block animate-pulse" />
                Productivity boost
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="glass-panel p-6">
            <h3 className="text-main font-medium flex items-center gap-2 mb-5">
              <Settings className="w-4 h-4 text-muted" />
              Analysis Preferences
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted mb-2 block uppercase tracking-wider">Length</label>
                <div className="flex gap-2">
                  {['concise', 'detailed'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setSummaryLength(opt)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                        summaryLength === opt
                          ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                          : 'bg-page text-muted border border-main hover:bg-card'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted mb-2 block uppercase tracking-wider">Tone</label>
                <div className="flex gap-2">
                  {['professional', 'casual'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setSummaryTone(opt)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                        summaryTone === opt
                          ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                          : 'bg-page text-muted border border-main hover:bg-card'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-main font-medium flex items-center gap-2">
                <History className="w-4 h-4 text-muted" />
                Recent Activity
              </h3>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs text-muted hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center py-6 text-gray-600 text-sm">
                No analyses yet. Run your first summary!
              </div>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {history.map((entry) => {
                  const sentimentColors = {
                    Positive: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                    Negative: 'text-red-400 bg-red-500/10 border-red-500/20',
                    Neutral:  'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                  };
                  const sentimentClass = sentimentColors[entry.sentiment] || sentimentColors.Neutral;

                  return (
                    <div
                      key={entry.id}
                      className="group p-3 rounded-xl hover:bg-dark-700/60 border border-transparent hover:border-dark-600 transition-all cursor-pointer relative"
                      onClick={() => handleLoadEntry(entry)}
                    >
                      <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-lg bg-page flex items-center justify-center shrink-0 border border-main group-hover:border-primary-500/30 mt-0.5">
                          <FileText className="w-4 h-4 text-muted group-hover:text-primary-400 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm text-main font-medium truncate pr-6">{entry.label}</h4>
                          <p className="text-xs text-muted mt-0.5 mb-1.5">{formatRelativeTime(entry.timestamp)}</p>
                          <p className="text-xs text-muted line-clamp-2 leading-relaxed">{entry.summaryPreview}</p>
                          {entry.keywords?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {entry.keywords.map((kw, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-page border border-main text-muted">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                          <span className={`inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium border ${sentimentClass}`}>
                            {entry.sentiment}
                          </span>
                        </div>
                      </div>
                      {/* Delete button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeEntry(entry.id); }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Chat Panel */}
          {currentEntry && (
            <ChatPanel entry={currentEntry} updateEntry={updateEntry} />
          )}
        </div>
      </main>
    </div>
  );
}
