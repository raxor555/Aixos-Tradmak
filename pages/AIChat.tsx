import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, 
  Sparkles, 
  User, 
  Bot, 
  Loader2, 
  ArrowRight, 
  Plus, 
  MessageSquare, 
  Trash2, 
  AlertCircle, 
  Mic, 
  MicOff,
  Image as ImageIcon,
  Search,
  Video,
  X,
  Paperclip,
  PanelLeft,
  LayoutDashboard,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../services/supabase';
import { aiService } from '../services/ai.service';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  created_at: string;
}

interface AIConversation {
  id: string;
  session_id?: string;
  title: string;
  last_message_at: string;
  created_at: string;
}

interface CommandOption {
  id: string;
  label: string;
  prefix: string;
  icon: any;
  description: string;
}

const COMMAND_OPTIONS: CommandOption[] = [
  { id: 'dashboard', label: 'ASK Dashboard', prefix: '/Dashboard:', icon: LayoutDashboard, description: 'Analyze real-time metrics, contacts & performance' },
  { id: 'image', label: 'Create Image', prefix: '/CreateImage:', icon: ImageIcon, description: 'Generate visual assets via DALL-E/Flux' },
  { id: 'research', label: 'Deep Research', prefix: '/DeepResearch:', icon: Search, description: 'Comprehensive web-grounded analysis' },
  { id: 'video', label: 'Analyze Video', prefix: '/AnalyzeVideo:', icon: Video, description: 'Extract intelligence from video sources' },
];

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const AIChat: React.FC = () => {
  const { agent } = useStore();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [activeCommand, setActiveCommand] = useState<CommandOption | null>(null);
  const [showResources, setShowResources] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const resourceMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const webhookUrl = 'https://n8n.srv1040836.hstgr.cloud/webhook/crm-chat';

  useEffect(() => {
    if (agent?.name) document.title = `Welcome, ${agent.name} | AIXOS`;
    return () => { document.title = 'AIXOS | Tradmak Intelligence'; };
  }, [agent]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resourceMenuRef.current && !resourceMenuRef.current.contains(event.target as Node)) {
        setShowResources(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setError(null);
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch {
        setError('Voice transcription unavailable.');
      }
    }
  };

  const fetchConversations = async () => {
    if (!agent?.id) return;
    try {
      const { data } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('agent_id', agent.id)
        .order('last_message_at', { ascending: false });
      setConversations(data || []);
    } catch {
      // silent
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const { data } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    } catch {
      setMessages([]);
    }
  };

  useEffect(() => {
    if (agent?.id) fetchConversations();
    else setLoadingHistory(false);
  }, [agent]);

  useEffect(() => {
    if (activeConvId) fetchMessages(activeConvId);
    else setMessages([]);
  }, [activeConvId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const startNewChat = async () => {
    if (!agent?.id) {
      setActiveConvId(null);
      setMessages([]);
      setMobileSidebarOpen(false);
      return;
    }
    try {
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { data } = await supabase
        .from('ai_conversations')
        .insert({ agent_id: agent.id, title: 'New Chat', session_id: sessionId, last_message_at: new Date().toISOString() })
        .select().single();
      if (data) {
        setActiveConvId(data.id);
        fetchConversations();
      }
    } catch {
      setActiveConvId(null);
      setMessages([]);
    }
    setMobileSidebarOpen(false);
  };

  const selectConversation = (convId: string) => {
    setActiveConvId(convId);
    setMobileSidebarOpen(false);
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase.from('ai_messages').delete().eq('conversation_id', id);
      await supabase.from('ai_conversations').delete().eq('id', id);
    } catch {}
    if (activeConvId === id) { setActiveConvId(null); setMessages([]); }
    fetchConversations();
  };

  const selectCommand = (cmd: CommandOption) => {
    setActiveCommand(cmd);
    setShowResources(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length + attachments.length > 3) {
      setError('Maximum 3 image attachments allowed.');
      return;
    }
    setAttachments(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const renderContent = (content: string) => {
    if (!content.includes('|')) return <div className="whitespace-pre-wrap">{content}</div>;

    const lines = content.split('\n');
    const result: React.ReactNode[] = [];
    let currentTable: string[][] = [];
    let isInsideTable = false;

    const flushTable = (key: number) => {
      if (currentTable.length > 0) {
        result.push(
          <div key={`table-${key}`} className="overflow-x-auto my-6">
            <table className="min-w-full border-collapse rounded-2xl overflow-hidden shadow-sm border border-brand-border">
              <thead>
                <tr className="bg-primary-600/5">
                  {currentTable[0]?.map((cell, i) => (
                    <th key={i} className="px-5 py-4 text-left font-black text-[11px] uppercase tracking-[0.2em] text-primary-600 border-b-2 border-primary-500/20">
                      {cell.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentTable.slice(1).map((row, ri) => (
                  <tr key={ri} className="border-b border-brand-border last:border-0 hover:bg-zinc-500/5 transition-colors">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-5 py-4 text-sm font-semibold text-brand-text">{cell.trim()}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        currentTable = [];
      }
      isInsideTable = false;
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      const isTableRow = trimmed.startsWith('|') && trimmed.endsWith('|');
      if (isTableRow) {
        const cells = line.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(c => c.trim());
        if (cells.every(c => /^[:\-\s]+$/.test(c))) return;
        isInsideTable = true;
        currentTable.push(cells);
      } else {
        if (isInsideTable) flushTable(idx);
        if (trimmed) {
          result.push(<p key={idx} className="mb-4 text-base leading-relaxed text-brand-text opacity-90 font-medium whitespace-pre-wrap">{line}</p>);
        } else {
          result.push(<div key={idx} className="h-2" />);
        }
      }
    });
    if (isInsideTable) flushTable(lines.length);
    return <>{result}</>;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isTyping) return;
    setError(null);

    const userText = activeCommand ? `${activeCommand.prefix} ${input}` : input;
    const isDashboardQuery = activeCommand?.id === 'dashboard';

    setInput('');
    setActiveCommand(null);
    setAttachments([]);
    setIsTyping(true);

    const tempUserMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    let convId = activeConvId;

    try {
      if (agent?.id) {
        try {
          if (!convId) {
            const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const { data: newConv } = await supabase
              .from('ai_conversations')
              .insert({
                agent_id: agent.id,
                title: userText.substring(0, 50) || 'New Chat',
                session_id: sessionId,
                last_message_at: new Date().toISOString(),
              })
              .select().single();
            if (newConv) {
              convId = newConv.id;
              setActiveConvId(convId);
            }
          }
          await supabase
            .from('ai_messages')
            .insert({ conversation_id: convId, role: 'user', content: userText });
        } catch (dbErr) {
          console.warn('[AIXOS] Supabase unavailable, continuing without persistence:', dbErr);
        }
      }

      let aiResponse = '';

      if (isDashboardQuery && agent?.id) {
        try {
          const [
            { count: contactsCount },
            { count: convsCount },
            { count: inquiriesCount },
            { count: researchCount },
            { count: agentsCount },
            { count: chatbotCount },
            { count: channelsCount },
            { count: messagesCount },
            { count: emailsCount },
            { count: electricalCount },
            { data: chatbotTraces },
            { data: recentInquiries },
            { data: electricalTraces },
            { data: stockInventory }
          ] = await Promise.all([
            supabase.from('contacts').select('*', { count: 'exact', head: true }),
            supabase.from('conversations').select('*', { count: 'exact', head: true }),
            supabase.from('inquiries').select('*', { count: 'exact', head: true }),
            supabase.from('research_logs').select('*', { count: 'exact', head: true }),
            supabase.from('agents').select('*', { count: 'exact', head: true }),
            supabase.from('chatbot_conversation').select('*', { count: 'exact', head: true }),
            supabase.from('internal_channels').select('*', { count: 'exact', head: true }),
            supabase.from('messages').select('*', { count: 'exact', head: true }),
            supabase.from('emails').select('*', { count: 'exact', head: true }),
            supabase.from('electrical_chatbot_conversation').select('*', { count: 'exact', head: true }),
            supabase.from('chatbot_conversation').select('id, name, email, conversation, created_at, session_id').order('created_at', { ascending: false }).limit(15),
            supabase.from('inquiries').select('name, email, message, created_at').order('created_at', { ascending: false }).limit(5),
            supabase.from('electrical_chatbot_conversation').select('id, name, number, "order", total_amount, created_at').order('created_at', { ascending: false }).limit(15),
            supabase.from('electrical_stock_sheet').select('*')
          ]);

          const metrics = {
            counts: {
              contacts: contactsCount || 0,
              externalConversations: convsCount || 0,
              leadInquiries: inquiriesCount || 0,
              researchMissions: researchCount || 0,
              onlineAgents: agentsCount || 0,
              chatbotConversations: chatbotCount || 0,
              strategicChannels: channelsCount || 0,
              globalMessages: messagesCount || 0,
              emailsDispatched: emailsCount || 0,
              electricalInquiries: electricalCount || 0
            },
            chatbotTraces: chatbotTraces || [],
            recentInquiries: recentInquiries || [],
            electricalTraces: electricalTraces || [],
            stockInventory: stockInventory || []
          };

          aiResponse = await aiService.queryDashboard(userText, metrics, agent.name);
        } catch {
          aiResponse = 'Dashboard query failed. Unable to reach data layer.';
        }
      } else {
        const formData = new FormData();
        formData.append('message', userText);
        formData.append('user', agent?.name || 'User');
        formData.append('agentId', agent?.id || 'anonymous');
        formData.append('conversationId', convId || `session-${Date.now()}`);
        formData.append('knowledgeContext', '');
        formData.append('timestamp', new Date().toISOString());
        attachments.forEach((file, index) => formData.append(`file_${index}`, file));

        const response = await fetch(webhookUrl, { method: 'POST', body: formData });
        if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
        const resData = await response.json();
        aiResponse =
          typeof resData === 'string'
            ? resData
            : resData.output || resData.reply || resData.message || resData.text || 'Transmission received.';
      }

      if (agent?.id && convId) {
        try {
          await supabase.from('ai_messages').insert({ conversation_id: convId, role: 'ai', content: aiResponse });
          await supabase.from('ai_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId);
          fetchConversations();
        } catch (dbErr) {
          console.warn('[AIXOS] Could not save AI response:', dbErr);
        }
      }

      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: aiResponse,
        created_at: new Date().toISOString(),
      }]);
    } catch (err: any) {
      console.error('[AIXOS] Send error:', err);
      setError('Cognitive link unstable. Verify network integrity.');
    } finally {
      setIsTyping(false);
    }
  };

  // ── Sidebar JSX (rendered inline to avoid remounting) ─────────────────
  const sidebarJSX = (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-brand-border/50 flex-shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-primary-600" />
          <span className="text-[10px] font-extrabold text-brand-muted uppercase tracking-[0.2em]">Chat History</span>
        </div>
        <button
          onClick={startNewChat}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-primary-900/20 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      <div className="px-4 py-3 border-b border-brand-border/30 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full bg-brand-surface border border-brand-border rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-primary-500/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 no-scrollbar">
        {loadingHistory ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
            <MessageSquare className="w-8 h-8 text-brand-muted mb-3" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">
              {searchQuery ? 'No results' : 'No chats yet'}
            </p>
          </div>
        ) : (
          filteredConversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => selectConversation(conv.id)}
              className={`group flex items-start justify-between w-full p-3 rounded-2xl cursor-pointer transition-all ${
                activeConvId === conv.id
                  ? 'bg-primary-600/10 border border-primary-500/20 shadow-sm'
                  : 'hover:bg-zinc-500/5 border border-transparent hover:border-brand-border/30'
              }`}
            >
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <div className={`mt-0.5 w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  activeConvId === conv.id ? 'bg-primary-600 text-white' : 'bg-brand-surface border border-brand-border text-brand-muted'
                }`}>
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold truncate leading-tight ${
                    activeConvId === conv.id ? 'text-primary-600' : 'text-brand-text'
                  }`}>
                    {conv.title}
                  </p>
                  <p className="text-[10px] text-brand-muted mt-0.5 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {timeAgo(conv.last_message_at || conv.created_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => deleteConversation(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 ml-1 flex-shrink-0 hover:text-red-500 text-brand-muted transition-all"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-brand-border/30 flex-shrink-0">
        <p className="text-[9px] font-bold uppercase tracking-widest text-brand-muted opacity-50 text-center">
          {conversations.length} session{conversations.length !== 1 ? 's' : ''} stored
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex bg-brand-surface overflow-hidden h-full transition-colors duration-500">

      {/* ── Desktop permanent sidebar ─────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-72 flex-shrink-0 border-r border-brand-border glass-card overflow-hidden">
        {sidebarJSX}
      </aside>

      {/* ── Mobile overlay sidebar ────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] lg:hidden animate-fade-in"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-[90] w-72 glass-card border-r border-brand-border flex flex-col lg:hidden animate-fade-in overflow-hidden">
            <div className="absolute top-4 right-4 z-10">
              <button onClick={() => setMobileSidebarOpen(false)} className="p-1.5 rounded-xl text-brand-muted hover:text-brand-text hover:bg-brand-border/30 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {sidebarJSX}
          </div>
        </>
      )}

      {/* ── Main chat area ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">

        {/* Mobile header bar */}
        <div className="flex lg:hidden items-center gap-3 px-4 py-3 border-b border-brand-border bg-brand-card/50 backdrop-blur-sm flex-shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 text-brand-muted hover:text-primary-600 transition-colors"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-brand-text truncate">
            {activeConvId
              ? (conversations.find(c => c.id === activeConvId)?.title || 'Chat')
              : 'AIXOS'}
          </span>
        </div>

        {/* Chat messages / welcome screen */}
        {!activeConvId && messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8 animate-fade-in text-center overflow-y-auto custom-scrollbar">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-primary-600 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center mb-8 shadow-3xl shadow-primary-900/40 animate-pulse-soft">
              <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-brand-text mb-4">
              Welcome, <span className="text-primary-600">{agent?.name || 'Operator'}</span>
            </h1>
            <p className="text-brand-muted text-lg max-w-lg leading-relaxed mb-10 font-medium opacity-80">
              AIXOS is powered by Tradmak Intelligence. What shall we optimize today?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
              {[
                'What did the latest conversation talk about?',
                'How many chatbot conversations exist?',
                'Summarize recent lead inquiries',
                'Analyze support efficiency',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="glass-card p-5 text-left group hover:border-primary-600 transition-all rounded-[1.5rem]"
                >
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-sm font-bold text-brand-text">{suggestion}</span>
                    <ChevronRight className="w-4 h-4 text-primary-600 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-8 md:space-y-10">
              {messages.map((msg) => {
                const isAI = msg.role === 'ai';
                return (
                  <div key={msg.id} className={`flex gap-4 md:gap-6 animate-slide-up ${isAI ? 'items-start' : 'flex-row-reverse items-start'}`}>
                    <div className={`w-9 h-9 md:w-11 md:h-11 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg ${
                      isAI ? 'bg-primary-600' : 'bg-brand-card border border-brand-border'
                    }`}>
                      {isAI ? <Bot className="w-5 h-5 md:w-6 md:h-6 text-white" /> : <User className="w-5 h-5 md:w-6 md:h-6 text-brand-muted" />}
                    </div>
                    <div className={`flex-1 max-w-[85%] ${!isAI ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block px-5 py-4 md:px-7 md:py-5 rounded-[1.5rem] text-sm md:text-base leading-relaxed shadow-md border ${
                        isAI
                          ? 'glass-card text-brand-text rounded-tl-none'
                          : 'bg-primary-600 text-white border-primary-500 rounded-tr-none'
                      }`}>
                        {renderContent(msg.content)}
                      </div>
                      <p className="text-[9px] text-brand-muted mt-2 font-extrabold uppercase tracking-[0.2em] opacity-60">
                        {isAI ? 'Intelligence Core' : (agent?.name || 'Operator')} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex gap-4 md:gap-6 items-start animate-pulse">
                  <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-primary-600/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 md:w-6 md:h-6 text-primary-600" />
                  </div>
                  <div className="glass-card px-5 py-4 md:px-7 md:py-5 rounded-[1.5rem] rounded-tl-none shadow-md">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary-600 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-primary-600 animate-bounce delay-100" />
                      <div className="w-2 h-2 rounded-full bg-primary-600 animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="p-4 md:p-8 border-t border-brand-border/30 bg-gradient-to-t from-brand-surface via-brand-surface/95 to-transparent flex-shrink-0">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative">
            {error && (
              <div className="absolute -top-12 left-0 w-full flex justify-center">
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 backdrop-blur-md">
                  <AlertCircle className="w-4 h-4" />{error}
                </div>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="absolute bottom-full mb-4 left-4 flex gap-3 animate-fade-in">
                {attachments.map((file, idx) => (
                  <div key={idx} className="relative w-14 h-14 rounded-xl overflow-hidden border border-primary-500/30 shadow-xl group">
                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="preview" />
                    <button type="button" onClick={() => removeAttachment(idx)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showResources && (
              <div ref={resourceMenuRef} className="absolute bottom-full mb-6 left-0 w-full sm:w-72 glass-card rounded-[2rem] p-3 shadow-3xl animate-slide-up z-50 border border-primary-500/20">
                <div className="p-3 border-b border-brand-border mb-2">
                  <span className="text-[9px] font-black text-brand-muted uppercase tracking-[0.3em]">Operational Resources</span>
                </div>
                {COMMAND_OPTIONS.map((cmd) => (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => selectCommand(cmd)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-primary-600/10 transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-500/5 border border-brand-border flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-all">
                      <cmd.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-brand-text group-hover:text-primary-600 transition-colors">{cmd.label}</p>
                      <p className="text-[9px] text-brand-muted truncate font-medium">{cmd.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex items-center dock-glass rounded-[2rem] p-2 md:p-3 shadow-xl">
              <button
                type="button"
                onClick={() => setShowResources(!showResources)}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${
                  showResources ? 'bg-primary-600 text-white' : 'text-brand-muted hover:text-primary-600'
                }`}
              >
                <Sparkles className={`w-5 h-5 ${showResources ? 'animate-pulse' : ''}`} />
              </button>

              <button
                type="button"
                onClick={toggleListening}
                className={`hidden sm:flex w-10 h-10 md:w-12 md:h-12 rounded-full items-center justify-center transition-all ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'text-brand-muted hover:text-primary-600'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${
                  attachments.length > 0 ? 'text-primary-600' : 'text-brand-muted hover:text-primary-600'
                }`}
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />

              <div className="flex-1 flex items-center gap-2 overflow-hidden px-2 md:px-3">
                {activeCommand && (
                  <div className="flex-shrink-0 flex items-center gap-1.5 bg-primary-600/10 border border-primary-500/20 px-2.5 py-1 rounded-full animate-fade-in pr-8 relative">
                    <activeCommand.icon className="w-3 h-3 text-primary-600 flex-shrink-0" />
                    <span className="text-[9px] font-black text-primary-600 uppercase tracking-widest leading-none truncate">{activeCommand.prefix.replace(':', '')}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setActiveCommand(null); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-primary-600 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder={isListening ? 'Listening...' : 'Ask AIXOS...'}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-brand-text text-sm md:text-base py-3 resize-none font-medium placeholder:text-brand-muted/40 no-scrollbar outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={(!input.trim() && attachments.length === 0) || isTyping}
                className="w-10 h-10 md:w-12 md:h-12 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-all shadow-xl shadow-primary-900/30 active:scale-90"
              >
                {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
