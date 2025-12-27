
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Send, 
  Star, 
  MapPin, 
  Mail, 
  Phone, 
  MessageCircle, 
  Loader2, 
  UserPlus, 
  ArrowRight, 
  Users, 
  Bot, 
  Cpu, 
  ArrowLeft, 
  Info,
  X
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../services/supabase';
// @ts-ignore
import { useNavigate } from 'react-router-dom';

export const Conversations: React.FC = () => {
  const { setActiveConversation, activeConversationId, agent } = useStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [allAgents, setAllAgents] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [showInfo, setShowInfo] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const isAdmin = agent?.role === 'admin';

  const fetchConversations = async () => {
    setLoading(true);
    if (activeTab === 'AI Monitoring') {
      let query = supabase
        .from('ai_conversations')
        .select('*, agent:agents(*)');
      
      if (!isAdmin) {
        query = query.eq('agent_id', agent?.id);
      }
      
      const { data, error } = await query.order('last_message_at', { ascending: false });
      if (!error && data) setConversations(data);
    } else {
      let query = supabase
        .from('conversations')
        .select('*, contact:contacts(*)');
      
      if (!isAdmin || activeTab === 'Mine') {
        query = query.eq('assigned_agent_id', agent?.id);
      } else if (activeTab === 'Unassigned') {
        query = query.is('assigned_agent_id', null);
      }

      const { data, error } = await query.order('last_activity_at', { ascending: false });
      if (!error && data) setConversations(data as any);
    }
    setLoading(false);
  };

  const fetchAgents = async () => {
    const { data } = await supabase.from('agents').select('*');
    if (data) setAllAgents(data);
  };

  const assignAgent = async (agentId: string) => {
    if (!activeConversationId || !isAdmin || activeTab === 'AI Monitoring') return;
    const { error } = await supabase
      .from('conversations')
      .update({ assigned_agent_id: agentId })
      .eq('id', activeConversationId);
    
    if (!error) fetchConversations();
  };

  const fetchMessages = async (convId: string) => {
    const table = activeTab === 'AI Monitoring' ? 'ai_messages' : 'messages';
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    
    if (!error && data) setMessages(data);
  };

  useEffect(() => {
    fetchConversations();
    fetchAgents();
  }, [activeTab, agent]);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
      const table = activeTab === 'AI Monitoring' ? 'ai_messages' : 'messages';
      const msgSub = supabase
        .channel(`messages-${activeConversationId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: table,
          filter: `conversation_id=eq.${activeConversationId}` 
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as any]);
        })
        .subscribe();

      return () => { msgSub.unsubscribe(); };
    } else {
      setMessages([]);
      setShowInfo(false);
    }
  }, [activeConversationId, activeTab]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeConversationId || !agent || activeTab === 'AI Monitoring') return;
    const content = inputText;
    setInputText('');
    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConversationId,
      sender_type: 'agent',
      sender_id: agent.id,
      content
    });
    if (!error) {
      await supabase.from('conversations').update({ last_activity_at: new Date().toISOString() }).eq('id', activeConversationId);
    }
  };

  const activeConv = conversations.find(c => c.id === activeConversationId);

  return (
    <div className="flex h-full bg-brand-surface animate-fade-in relative overflow-hidden">
      {/* Session List */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-full md:w-80 border-r border-brand-border flex flex-col glass-card transition-all duration-300
        lg:relative lg:translate-x-0
        ${activeConversationId ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}
      `}>
        <div className="p-6 border-b border-brand-border bg-brand-surface/20">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <input 
              placeholder="Search conversations..."
              className="w-full pl-11 pr-4 py-2.5 bg-zinc-500/5 border border-brand-border rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-600/30 transition-all text-brand-text"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {['All', 'Mine', 'Unassigned', ...(isAdmin ? ['AI Monitoring'] : [])].map(tab => (
              <button 
                key={tab}
                onClick={() => { setActiveTab(tab); setActiveConversation(null); }}
                className={`px-3.5 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all whitespace-nowrap border ${
                  activeTab === tab 
                    ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-900/20' 
                    : 'bg-zinc-500/5 border-transparent text-brand-muted hover:text-brand-text'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-12 text-center text-brand-muted text-[10px] font-bold uppercase tracking-widest italic opacity-50">No Active Data</div>
          ) : conversations.map(conv => (
            <div 
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`p-5 border-b border-brand-border cursor-pointer transition-all hover:bg-zinc-500/5 group ${
                activeConversationId === conv.id ? 'bg-primary-600/5 border-l-4 border-l-primary-600' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl overflow-hidden bg-zinc-500/10 flex items-center justify-center border border-brand-border relative">
                   {activeTab === 'AI Monitoring' ? (
                     <Bot className={`w-6 h-6 ${activeConversationId === conv.id ? 'text-primary-500' : 'text-brand-muted'}`} />
                   ) : (
                     <img src={conv.contact?.avatar_url || `https://ui-avatars.com/api/?name=${conv.contact?.name || 'User'}`} className="w-full h-full object-cover" alt="avatar" />
                   )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-brand-text truncate">
                      {activeTab === 'AI Monitoring' ? (conv.agent?.name || 'AI Engine') : (conv.contact?.name || 'Anonymous')}
                    </span>
                    <span className="text-[10px] text-brand-muted font-bold">
                      {new Date(conv.last_activity_at || conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-brand-muted truncate font-medium tracking-tight">
                    {conv.title || conv.subject || 'Session context pending...'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversation Thread */}
      <div className={`
        flex-1 flex flex-col bg-brand-surface relative transition-all duration-300
        ${activeConversationId ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        {activeConv ? (
          <>
            <header className="h-20 border-b border-brand-border px-6 md:px-8 flex items-center justify-between glass-card z-10">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveConversation(null)}
                  className="lg:hidden p-2 -ml-2 text-brand-muted hover:text-brand-text"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-zinc-500/10 flex items-center justify-center border border-brand-border shadow-inner text-primary-500">
                  {activeTab === 'AI Monitoring' ? <Cpu className="w-5 h-5 md:w-6 md:h-6" /> : <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />}
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-bold text-brand-text leading-tight truncate max-w-[120px] md:max-w-none">
                    {activeTab === 'AI Monitoring' ? `Logic: ${activeConv.agent?.name}` : (activeConv.contact?.name || 'Contact')}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[9px] md:text-[10px] text-brand-muted uppercase font-extrabold tracking-widest">
                      {activeTab === 'AI Monitoring' ? 'Supervised' : 'Secure'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                <button 
                  onClick={() => setShowInfo(!showInfo)}
                  className="xl:hidden p-2 text-brand-muted hover:text-primary-600 transition-colors"
                >
                  <Info className="w-6 h-6" />
                </button>
                {isAdmin && activeTab !== 'AI Monitoring' && (
                  <div className="relative group/assign hidden sm:block">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-zinc-500/5 border border-brand-border rounded-2xl text-[10px] font-extrabold text-brand-muted hover:text-brand-text transition-all uppercase tracking-widest hover:border-primary-500/30">
                      <UserPlus className="w-3.5 h-3.5 text-primary-500" />
                      <span className="truncate max-w-[80px]">{allAgents.find(a => a.id === activeConv.assigned_agent_id)?.name || 'Assign'}</span>
                    </button>
                  </div>
                )}
                <div className="hidden sm:flex items-center gap-1.5 p-1.5 bg-zinc-500/5 rounded-xl border border-brand-border">
                  {[1, 2, 3].map(s => (
                    <Star key={s} className={`w-3.5 h-3.5 ${s <= (activeConv.priority || 1) ? 'fill-amber-400 text-amber-400' : 'text-zinc-500/20'}`} />
                  ))}
                </div>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 md:space-y-10 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-8 md:space-y-10">
                {messages.map((msg, i) => {
                  const isAgentSide = msg.role === 'ai' || msg.sender_type === 'agent' || msg.sender_type === 'bot';
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isAgentSide ? 'justify-end' : 'justify-start'} animate-slide-up`}
                    >
                      <div className="max-w-[90%] md:max-w-[80%] group">
                        <div className={`
                          px-5 py-4 md:px-7 md:py-5 rounded-3xl text-sm leading-relaxed shadow-sm transition-all border
                          ${isAgentSide 
                            ? 'bg-primary-600 border-primary-500 text-white rounded-tr-none' 
                            : 'glass-card border-brand-border text-brand-text rounded-tl-none'}
                        `}>
                          {msg.content}
                        </div>
                        <p className={`text-[9px] md:text-[10px] text-brand-muted mt-2 md:mt-3 font-bold uppercase tracking-[0.15em] ${isAgentSide ? 'text-right' : 'text-left'}`}>
                          {activeTab === 'AI Monitoring' 
                            ? (msg.role === 'ai' ? 'Core Engine' : (activeConv.agent?.name || 'Partner')) 
                            : (msg.sender_type === 'agent' ? 'Expert Support' : (activeConv.contact?.name || 'User'))}
                          <span className="mx-2 opacity-30">•</span>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {activeTab !== 'AI Monitoring' && (
              <div className="p-4 md:p-8 bg-brand-surface border-t border-brand-border">
                <div className="max-w-4xl mx-auto relative bg-zinc-500/5 rounded-[1.5rem] md:rounded-3xl border border-brand-border p-2 md:p-3 focus-within:ring-2 focus-within:ring-primary-600/20 transition-all shadow-inner">
                  <textarea 
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    placeholder="Professional assistance..."
                    className="w-full bg-transparent border-none focus:ring-0 text-sm p-3 md:p-4 text-brand-text resize-none font-medium placeholder:text-brand-muted placeholder:font-bold placeholder:uppercase placeholder:text-[9px] placeholder:tracking-widest"
                  />
                  <div className="flex justify-end p-1 md:p-2">
                    <button 
                      onClick={handleSendMessage}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 md:px-7 md:py-3 rounded-xl md:rounded-2xl transition-all shadow-xl shadow-primary-900/40 disabled:opacity-50 text-[10px] md:text-[11px] font-extrabold uppercase tracking-widest flex items-center gap-2 md:gap-3 active:scale-95"
                      disabled={!inputText.trim()}
                    >
                      <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      Dispatch
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 bg-zinc-500/5 rounded-[2.5rem] flex items-center justify-center mb-10 border border-brand-border shadow-2xl animate-pulse-soft">
              {activeTab === 'AI Monitoring' ? <Cpu className="w-10 h-10 text-primary-500" /> : <MessageCircle className="w-10 h-10 text-brand-muted" />}
            </div>
            <h3 className="text-3xl font-display font-bold text-brand-text mb-4">Command Center</h3>
            <p className="text-brand-muted max-w-sm leading-relaxed italic text-base opacity-60">
              Select an active session to begin operational support.
            </p>
          </div>
        )}
      </div>

      {/* Info Sidebar (Responsive) */}
      <div className={`
        fixed inset-y-0 right-0 z-40 w-80 glass-card overflow-y-auto transition-all duration-300 transform
        xl:relative xl:translate-x-0 xl:border-l xl:border-brand-border
        ${showInfo ? 'translate-x-0' : 'translate-x-full xl:translate-x-0'}
      `}>
        {activeConv && activeTab !== 'AI Monitoring' && (
          <>
            <div className="p-8 text-center border-b border-brand-border bg-zinc-500/5 relative">
              <button onClick={() => setShowInfo(false)} className="xl:hidden absolute top-4 right-4 text-brand-muted">
                <X className="w-6 h-6" />
              </button>
              <div className="relative inline-block mb-6 mt-4">
                <img src={activeConv.contact?.avatar_url || `https://ui-avatars.com/api/?name=${activeConv.contact?.name || 'User'}&background=3b82f6&color=fff`} className="w-24 h-24 rounded-3xl mx-auto border-2 border-primary-600/30 p-1.5 shadow-2xl" alt="" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-brand-card rounded-full shadow-lg" />
              </div>
              <h3 className="text-xl font-display font-bold text-brand-text mb-1">{activeConv.contact?.name || 'Customer'}</h3>
              <p className="text-[9px] font-extrabold text-brand-muted uppercase tracking-widest opacity-80">{activeConv.contact?.email}</p>
            </div>

            <div className="p-8 space-y-10">
              <section>
                <h4 className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-primary-500 mb-6 flex items-center gap-3">
                  <Users className="w-3.5 h-3.5" /> Delegate Logic
                </h4>
                <div className="space-y-4">
                  {activeConv.assigned_agent_id ? (
                    <div className="flex items-center gap-4 bg-zinc-500/5 p-4 rounded-2xl border border-brand-border">
                      <img src={allAgents.find(a => a.id === activeConv.assigned_agent_id)?.avatar_url || `https://ui-avatars.com/api/?name=${allAgents.find(a => a.id === activeConv.assigned_agent_id)?.name}`} className="w-10 h-10 rounded-xl" alt="assigned agent" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-brand-text truncate">{allAgents.find(a => a.id === activeConv.assigned_agent_id)?.name}</p>
                        <p className="text-[9px] text-primary-500 font-extrabold uppercase mt-0.5">Assigned Agent</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest text-center py-4 border border-zinc-500/10 border-dashed rounded-2xl italic">Pending Delegate</p>
                  )}
                </div>
              </section>
              
              <section>
                <h4 className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-brand-muted mb-6">Metadata Context</h4>
                <ul className="space-y-4">
                  <li className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-zinc-500/5 border border-brand-border flex items-center justify-center text-brand-muted">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-extrabold text-brand-muted uppercase mb-0.5">Email</p>
                      <p className="text-xs text-brand-text truncate font-bold">{activeConv.contact?.email || 'N/A'}</p>
                    </div>
                  </li>
                  {activeConv.contact?.phone && (
                    <li className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-zinc-500/5 border border-brand-border flex items-center justify-center text-brand-muted">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-extrabold text-brand-muted uppercase mb-0.5">Comms</p>
                        <p className="text-xs text-brand-text font-bold">{activeConv.contact?.phone}</p>
                      </div>
                    </li>
                  )}
                  <li className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-zinc-500/5 border border-brand-border flex items-center justify-center text-brand-muted">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-extrabold text-brand-muted uppercase mb-0.5">Geo</p>
                      <p className="text-xs text-brand-text font-bold">Cloud Presence</p>
                    </div>
                  </li>
                </ul>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
