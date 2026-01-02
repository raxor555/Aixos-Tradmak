
import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  User, 
  Bot, 
  Loader2, 
  ArrowRight, 
  Plus, 
  History, 
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
  LayoutDashboard
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
  title: string;
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
  const [historyOpen, setHistoryOpen] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const resourceMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const webhookUrl = 'https://n8n.srv1040836.hstgr.cloud/webhook/crm-chat';

  useEffect(() => {
    if (agent?.name) {
      document.title = `Welcome, ${agent.name} | AIXOS`;
    }
    return () => {
      document.title = 'AIXOS | Tradmak Intelligence';
    };
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
      } catch (err) {
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
    } catch (err) {
      setError("Unable to load chat history.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  useEffect(() => {
    if (agent?.id) fetchConversations();
  }, [agent]);

  useEffect(() => {
    if (activeConvId) fetchMessages(activeConvId);
    else setMessages([]);
  }, [activeConvId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const startNewChat = async () => {
    if (!agent?.id) return;
    const { data } = await supabase
      .from('ai_conversations')
      .insert({ agent_id: agent.id, title: 'New Discussion' })
      .select().single();
    if (data) {
      setActiveConvId(data.id);
      fetchConversations();
      setHistoryOpen(false);
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('ai_conversations').delete().eq('id', id);
    if (activeConvId === id) setActiveConvId(null);
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
      setError("Maximum 3 image attachments allowed.");
      return;
    }
    
    setAttachments(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Improved Markdown Table Renderer
  const renderContent = (content: string) => {
    if (!content.includes('|')) return <div className="whitespace-pre-wrap">{content}</div>;

    const lines = content.split('\n');
    const result: React.ReactNode[] = [];
    let currentTable: string[][] = [];
    let isInsideTable = false;

    const renderTable = (tableData: string[][], key: number) => (
      <div key={`table-${key}`} className="overflow-x-auto my-6 markdown-container">
        <table className="min-w-full border-collapse rounded-xl overflow-hidden shadow-sm border border-brand-border">
          <thead>
            <tr className="bg-primary-600/5">
              {tableData[0]?.map((cell, i) => (
                <th key={i} className="px-5 py-3 text-left font-black text-[11px] uppercase tracking-[0.2em] text-primary-600 border-b-2 border-primary-500/20">
                  {cell.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.slice(1).map((row, ri) => (
              <tr key={ri} className="border-b border-brand-border last:border-0 hover:bg-zinc-500/5 transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-5 py-3 text-sm font-semibold text-brand-text">
                    {cell.trim()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      const isTableRow = trimmed.startsWith('|') && trimmed.endsWith('|');
      
      if (isTableRow) {
        const cells = line.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(c => c.trim());
        const isSeparator = cells.every(c => /^[:\-\s]+$/.test(c));
        
        if (isSeparator) return; // Skip Markdown separator lines (|---|)
        
        isInsideTable = true;
        currentTable.push(cells);
      } else {
        if (isInsideTable) {
          result.push(renderTable(currentTable, idx));
          currentTable = [];
          isInsideTable = false;
        }
        if (trimmed) {
          result.push(<p key={idx} className="mb-4 text-base leading-relaxed text-brand-text opacity-90 font-medium whitespace-pre-wrap">{line}</p>);
        } else {
          result.push(<div key={idx} className="h-2" />);
        }
      }
    });

    if (isInsideTable) {
      result.push(renderTable(currentTable, lines.length));
    }

    return <>{result}</>;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isTyping || !agent?.id) return;
    setError(null);

    let convId = activeConvId;
    try {
      if (!convId) {
        const { data: newConv } = await supabase
          .from('ai_conversations')
          .insert({ agent_id: agent.id, title: input.substring(0, 30) || 'Intelligence Session' })
          .select().single();
        if (!newConv) return;
        convId = newConv.id;
        setActiveConvId(convId);
      }

      const userText = activeCommand ? `${activeCommand.prefix} ${input}` : input;
      const isDashboardQuery = activeCommand?.id === 'dashboard';
      
      setInput('');
      setAttachments([]);
      setIsTyping(true);

      const { data: savedUserMsg } = await supabase
        .from('ai_messages')
        .insert({ conversation_id: convId, role: 'user', content: userText })
        .select().single();

      if (savedUserMsg) setMessages(prev => [...prev, savedUserMsg]);

      let aiResponse = "";

      if (isDashboardQuery) {
        // Precise data gathering for the AI
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
          { data: chatbotTraces },
          { data: recentInquiries }
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
          supabase.from('chatbot_conversation').select('id, name, email, conversation, created_at, session_id').order('created_at', { ascending: false }).limit(10),
          supabase.from('inquiries').select('name, email, message, created_at').order('created_at', { ascending: false }).limit(5)
        ]);

        const metrics = {
          counts: {
            contacts: contactsCount || 0,
            externalConversations: convsCount || 0,
            leadInquiries: inquiriesCount || 0,
            researchMissions: researchCount || 0,
            onlineAgents: agentsCount || 0,
            chatbotTraces: chatbotCount || 0,
            strategicChannels: channelsCount || 0,
            globalMessages: messagesCount || 0,
            emailsDispatched: emailsCount || 0
          },
          chatbotTraces: chatbotTraces || [],
          recentInquiries: recentInquiries || []
        };

        aiResponse = await aiService.queryDashboard(userText, metrics, agent.name);
      } else {
        const { data: unlockedResources } = await supabase
          .from('unlocked_resources')
          .select('resource:resources(*)')
          .eq('agent_id', agent.id);

        const knowledgeContext = (unlockedResources || [])
          .map(u => `${(u.resource as any).name}: ${(u.resource as any).knowledge_content}`)
          .join('\n');

        const formData = new FormData();
        formData.append('message', userText);
        formData.append('user', agent.name);
        formData.append('agentId', agent.id);
        formData.append('conversationId', convId);
        formData.append('knowledgeContext', knowledgeContext);
        formData.append('timestamp', new Date().toISOString());
        
        attachments.forEach((file, index) => {
          formData.append(`file_${index}`, file);
        });

        const response = await fetch(webhookUrl, {
          method: 'POST',
          body: formData,
        });

        const resData = await response.json();
        aiResponse = typeof resData === 'string' ? resData : resData.output || resData.reply || "Transmission received.";
      }

      const { data: savedAiMsg } = await supabase
        .from('ai_messages')
        .insert({ conversation_id: convId, role: 'ai', content: aiResponse })
        .select().single();

      if (savedAiMsg) {
        setMessages(prev => [...prev, savedAiMsg]);
        await supabase.from('ai_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId);
      }
    } catch (err: any) {
      console.error(err);
      setError("Synchronous link interrupted. Verification required.");
    } finally {
      setIsTyping(false);
      fetchConversations();
    }
  };

  return (
    <div className="flex-1 flex bg-brand-surface relative overflow-hidden h-full transition-colors duration-500">
      <button 
        onClick={() => setHistoryOpen(true)}
        className="absolute top-4 left-4 z-30 p-2.5 bg-brand-card rounded-xl border border-brand-border text-brand-muted hover:text-primary-600 shadow-sm backdrop-blur-md"
        title="Open Archive"
      >
        <PanelLeft className="w-5 h-5" />
      </button>

      <>
        {historyOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] animate-fade-in"
            onClick={() => setHistoryOpen(false)}
          />
        )}
        <div className={`
          fixed inset-y-0 left-0 z-[90] w-72 glass-card border-r border-brand-border flex flex-col transition-all duration-500 transform
          ${historyOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-6 flex items-center justify-between border-b border-brand-border/50">
            <h2 className="text-[10px] font-extrabold text-brand-muted uppercase tracking-[0.2em] flex items-center gap-2">
              <History className="w-4 h-4" /> Neural Archive
            </h2>
            <button onClick={() => setHistoryOpen(false)} className="p-1 text-brand-muted hover:text-brand-text transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 border-b border-brand-border">
            <button 
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-primary-900/30 active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              New AI Session
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar no-scrollbar">
            <div className="space-y-1">
              {loadingHistory ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
              ) : conversations.length === 0 ? (
                <p className="text-center text-[10px] font-bold uppercase tracking-widest text-brand-muted opacity-40 py-8">Empty Archive</p>
              ) : conversations.map(conv => (
                <div 
                  key={conv.id}
                  onClick={() => { setActiveConvId(conv.id); setHistoryOpen(false); }}
                  className={`group flex items-center justify-between w-full p-3.5 rounded-2xl cursor-pointer transition-all ${
                    activeConvId === conv.id 
                      ? 'bg-primary-600/10 text-primary-600 border border-primary-500/20 shadow-sm' 
                      : 'text-brand-muted hover:bg-zinc-500/5 hover:text-brand-text border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <MessageSquare className={`w-4 h-4 flex-shrink-0 ${activeConvId === conv.id ? 'text-primary-600' : 'text-brand-muted'}`} />
                    <span className="text-sm font-bold truncate">{conv.title}</span>
                  </div>
                  <button onClick={(e) => deleteConversation(conv.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>

      <div className="flex-1 flex flex-col relative z-10 w-full">
        {!activeConvId && messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8 animate-fade-in text-center overflow-y-auto custom-scrollbar">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-primary-600 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center mb-8 md:mb-10 shadow-3xl shadow-primary-900/40 animate-pulse-soft">
              <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-brand-text mb-4 md:mb-6">
              Welcome, <span className="text-primary-600">{agent?.name}</span>
            </h1>
            <p className="text-brand-muted text-lg md:text-xl max-w-lg leading-relaxed mb-8 md:mb-12 font-medium opacity-80">
              AIXOS is powered by Tradmak Intelligence. What shall we optimize or automate today?
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 w-full max-w-3xl">
              {[
                "Who is Rayyan Shaikh?",
                "How many chatbot conversations exist?",
                "Summarize recent lead inquiries",
                "Analyze support efficiency"
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); handleSendMessage(); }}
                  className="glass-card p-5 md:p-6 text-left group hover:border-primary-600 transition-all rounded-[1.5rem]"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-brand-text">{suggestion}</span>
                    <ArrowRight className="w-4 h-4 text-primary-600 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-16 space-y-8 md:space-y-12 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
              {messages.map((msg) => {
                const isAI = msg.role === 'ai';
                return (
                  <div key={msg.id} className={`flex gap-4 md:gap-8 animate-slide-up ${isAI ? 'items-start' : 'flex-row-reverse items-start'}`}>
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg ${
                      isAI ? 'bg-primary-600' : 'bg-brand-card dark:bg-zinc-800'
                    }`}>
                      {isAI ? <Bot className="w-6 h-6 md:w-7 md:h-7 text-white" /> : <User className="w-6 h-6 md:w-7 md:h-7 text-brand-muted" />}
                    </div>
                    <div className={`flex-1 max-w-[85%] md:max-w-3xl ${!isAI ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block px-6 py-4 md:px-8 md:py-6 rounded-[1.5rem] md:rounded-[2.2rem] text-sm md:text-lg leading-relaxed shadow-lg border ${
                        isAI 
                          ? 'glass-card text-brand-text rounded-tl-none' 
                          : 'bg-primary-600 text-white border-primary-500 rounded-tr-none'
                      }`}>
                        {renderContent(msg.content)}
                      </div>
                      <p className="text-[10px] text-brand-muted mt-2 md:mt-3 font-extrabold uppercase tracking-[0.2em] opacity-60">
                        {isAI ? 'Intelligence Core' : (agent?.name || 'Authorized Operator')} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex gap-4 md:gap-8 items-start animate-pulse">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-primary-600/20 flex items-center justify-center"><Bot className="w-6 h-6 md:w-7 md:h-7 text-primary-600" /></div>
                  <div className="glass-card px-6 py-4 md:px-8 md:py-6 rounded-[1.5rem] md:rounded-[2rem] rounded-tl-none">
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

        <div className="p-4 md:p-10 bg-gradient-to-t from-brand-surface via-brand-surface to-transparent border-t lg:border-t-0 border-brand-border lg:bg-none">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
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
                  <div key={idx} className="relative w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border border-primary-500/30 shadow-xl group">
                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="preview" />
                    <button 
                      type="button" 
                      onClick={() => removeAttachment(idx)}
                      className="absolute top-1 right-1 w-4 h-4 md:w-5 md:h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-100 scale-90"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showResources && (
              <div 
                ref={resourceMenuRef}
                className="absolute bottom-full mb-6 left-0 w-full sm:w-72 glass-card rounded-[2rem] p-3 shadow-3xl animate-slide-up z-50 border border-primary-500/20"
              >
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
            
            <div className="relative flex items-center dock-glass rounded-[2rem] md:rounded-[2.5rem] p-2 md:p-3 shadow-xl">
              <button
                type="button"
                onClick={() => setShowResources(!showResources)}
                className={`w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${
                  showResources ? 'bg-primary-600 text-white' : 'text-brand-muted hover:text-primary-600'
                }`}
              >
                <Sparkles className={`w-5 h-5 md:w-6 md:h-6 ${showResources ? 'animate-pulse' : ''}`} />
              </button>

              <button
                type="button"
                onClick={toggleListening}
                className={`hidden sm:flex w-12 h-12 rounded-full items-center justify-center transition-all ${
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
              
              <div className="flex-1 flex items-center gap-2 md:gap-3 overflow-hidden px-2 md:px-4">
                {activeCommand && (
                  <div className="flex-shrink-0 flex items-center gap-1.5 bg-primary-600/10 border border-primary-500/20 px-2.5 py-1 rounded-full animate-fade-in max-w-[120px] md:max-w-none relative pr-8">
                    <activeCommand.icon className="w-3 h-3 text-primary-600 flex-shrink-0" />
                    <span className="text-[9px] font-black text-primary-600 uppercase tracking-widest leading-none truncate">{activeCommand.prefix.replace(':', '')}</span>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setActiveCommand(null); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-primary-600 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder={isListening ? "Listening..." : "Ask AIXOS..."}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-brand-text text-base md:text-lg py-3 md:py-4 resize-none font-medium placeholder:text-brand-muted/40 no-scrollbar outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={(!input.trim() && attachments.length === 0) || isTyping}
                className="w-10 h-10 md:w-14 md:h-14 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-all shadow-xl shadow-primary-900/30 active:scale-90"
              >
                <Send className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
