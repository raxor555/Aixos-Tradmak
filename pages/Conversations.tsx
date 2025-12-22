
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
  Cpu
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const isAdmin = agent?.role === 'admin';

  const fetchConversations = async () => {
    setLoading(true);
    if (activeTab === 'AI Monitoring') {
      // If Admin, fetch EVERYTHING. If not, only MINE.
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
    <div className="flex h-screen bg-brand-surface animate-fade-in">
      {/* Session List */}
      <div className="w-80 border-r border-brand-border flex flex-col glass-card">
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
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
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
                     <img src={conv.contact?.avatar_url || `https://ui-avatars.com/api/?name=${conv.contact?.name || 'User'}`} className="w-full h-full object-cover" />
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
      <div className="flex-1 flex flex-col bg-brand-surface relative">
        {activeConv ? (
          <>
            <header className="h-20 border-b border-brand-border px-8 flex items-center justify-between glass-card z-10">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-zinc-500/10 flex items-center justify-center border border-brand-border shadow-inner text-primary-500">
                  {activeTab === 'AI Monitoring' ? <Cpu className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-brand-text leading-tight">
                    {activeTab === 'AI Monitoring' ? `Intelligence: ${activeConv.agent?.name}` : (activeConv.contact?.name || 'Contact')}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] text-brand-muted uppercase font-extrabold tracking-widest">
                      {activeTab === 'AI Monitoring' ? 'Supervised Log' : 'Secure Session'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {isAdmin && activeTab !== 'AI Monitoring' && (
                  <div className="relative group/assign">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-zinc-500/5 border border-brand-border rounded-2xl text-[10px] font-extrabold text-brand-muted hover:text-brand-text transition-all uppercase tracking-widest hover:border-primary-500/30">
                      <UserPlus className="w-3.5 h-3.5 text-primary-500" />
                      {allAgents.find(a => a.id === activeConv.assigned_agent_id)?.name || 'Assign Agent'}
                    </button>
                    <div className="absolute top-full right-0 mt-3 w-56 glass-card rounded-2xl shadow-2xl opacity-0 invisible group-hover/assign:opacity-100 group-hover/assign:visible transition-all z-50 p-2">
                       <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest px-3 py-2 border-b border-brand-border mb-1">Select Delegate</p>
                       {allAgents.map(a => (
                        <button 
                          key={a.id}
                          onClick={() => assignAgent(a.id)}
                          className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold text-brand-muted hover:bg-primary-600/10 hover:text-primary-600 transition-colors flex items-center gap-3"
                        >
                          <img src={a.avatar_url || `https://ui-avatars.com/api/?name=${a.name}`} className="w-5 h-5 rounded-lg" />
                          {a.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1.5 p-1.5 bg-zinc-500/5 rounded-xl border border-brand-border">
                  {[1, 2, 3].map(s => (
                    <Star key={s} className={`w-3.5 h-3.5 ${s <= (activeConv.priority || 1) ? 'fill-amber-400 text-amber-400' : 'text-zinc-500/20'}`} />
                  ))}
                </div>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-10">
                {messages.map((msg, i) => {
                  const isAgentSide = msg.role === 'ai' || msg.sender_type === 'agent' || msg.sender_type === 'bot';
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isAgentSide ? 'justify-end' : 'justify-start'} animate-slide-up`}
                    >
                      <div className="max-w-[80%] group">
                        <div className={`
                          px-7 py-5 rounded-3xl text-sm leading-relaxed shadow-sm transition-all border
                          ${isAgentSide 
                            ? 'bg-primary-600 border-primary-500 text-white rounded-tr-none' 
                            : 'glass-card border-brand-border text-brand-text rounded-tl-none'}
                          ${activeTab === 'AI Monitoring' && msg.role === 'ai' ? 'bg-zinc-500/10 border-primary-600/30 backdrop-blur-md' : ''}
                        `}>
                          {msg.content}
                        </div>
                        <p className={`text-[10px] text-brand-muted mt-3 font-bold uppercase tracking-[0.15em] ${isAgentSide ? 'text-right' : 'text-left'}`}>
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
              <div className="p-8 bg-brand-surface border-t border-brand-border">
                <div className="max-w-4xl mx-auto relative bg-zinc-500/5 rounded-3xl border border-brand-border p-3 focus-within:ring-2 focus-within:ring-primary-600/20 transition-all shadow-inner">
                  <textarea 
                    rows={2}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    placeholder="Provide professional assistance..."
                    className="w-full bg-transparent border-none focus:ring-0 text-sm p-4 text-brand-text resize-none font-medium placeholder:text-brand-muted placeholder:font-bold placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest"
                  />
                  <div className="flex justify-end p-2">
                    <button 
                      onClick={handleSendMessage}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-7 py-3 rounded-2xl transition-all shadow-xl shadow-primary-900/40 disabled:opacity-50 text-[11px] font-extrabold uppercase tracking-widest flex items-center gap-3 active:scale-95"
                      disabled={!inputText.trim()}
                    >
                      <Send className="w-4 h-4" />
                      Dispatch
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-28 h-28 bg-zinc-500/5 rounded-[3rem] flex items-center justify-center mb-10 border border-brand-border shadow-2xl animate-pulse-soft">
              {activeTab === 'AI Monitoring' ? <Cpu className="w-12 h-12 text-primary-500" /> : <MessageCircle className="w-12 h-12 text-brand-muted" />}
            </div>
            <h3 className="text-4xl font-display font-bold text-brand-text mb-4">
              {activeTab === 'AI Monitoring' ? 'Strategic Intelligence' : 'Command Center'}
            </h3>
            <p className="text-brand-muted max-w-sm leading-relaxed italic text-lg opacity-60">
              {activeTab === 'AI Monitoring' 
                ? 'Reviewing automated system prompts and partner interactions.'
                : 'Select an active session to begin operational support.'}
            </p>
          </div>
        )}
      </div>

      {/* Info Sidebar */}
      {activeConv && activeTab !== 'AI Monitoring' && (
        <div className="w-80 border-l border-brand-border glass-card overflow-y-auto hidden xl:block">
          <div className="p-10 text-center border-b border-brand-border bg-zinc-500/5">
            <div className="relative inline-block mb-6">
              <img src={activeConv.contact?.avatar_url || `https://ui-avatars.com/api/?name=${activeConv.contact?.name || 'User'}&background=3b82f6&color=fff`} className="w-28 h-28 rounded-3xl mx-auto border-2 border-primary-600/30 p-1.5 shadow-2xl" alt="" />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 border-4 border-brand-card rounded-full shadow-lg" />
            </div>
            <h3 className="text-2xl font-display font-bold text-brand-text mb-1">{activeConv.contact?.name || 'Customer'}</h3>
            <p className="text-[10px] font-extrabold text-brand-muted uppercase tracking-widest opacity-80">{activeConv.contact?.email}</p>
          </div>

          <div className="p-10 space-y-12">
            <section>
              <h4 className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary-500 mb-8 flex items-center gap-3">
                <Users className="w-3.5 h-3.5" />
                Delegate Logic
              </h4>
              <div className="space-y-4">
                {activeConv.assigned_agent_id ? (
                  <button 
                    onClick={() => navigate('/channels')}
                    className="w-full flex items-center gap-4 bg-zinc-500/5 p-4 rounded-3xl border border-brand-border group hover:border-primary-600/30 transition-all text-left shadow-sm"
                  >
                    <img 
                      src={allAgents.find(a => a.id === activeConv.assigned_agent_id)?.avatar_url || `https://ui-avatars.com/api/?name=${allAgents.find(a => a.id === activeConv.assigned_agent_id)?.name}`} 
                      className="w-11 h-11 rounded-xl shadow-md" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-brand-text truncate">{allAgents.find(a => a.id === activeConv.assigned_agent_id)?.name}</p>
                      <p className="text-[10px] text-primary-500 font-extrabold uppercase flex items-center gap-1.5 mt-1">
                        Team Sync <ArrowRight className="w-2.5 h-2.5" />
                      </p>
                    </div>
                  </button>
                ) : (
                  <p className="text-[11px] text-brand-muted font-bold uppercase tracking-widest text-center py-6 border border-zinc-500/20 border-dashed rounded-3xl">Awaiting Delegation</p>
                )}
              </div>
            </section>
            
            <section>
              <h4 className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-brand-muted mb-8">Metadata Context</h4>
              <ul className="space-y-6">
                <li className="flex items-center gap-5 group">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-500/5 border border-brand-border flex items-center justify-center text-brand-muted group-hover:text-primary-500 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold text-brand-muted uppercase mb-1">Electronic ID</p>
                    <p className="text-xs text-brand-text truncate font-bold">{activeConv.contact?.email || 'System Unknown'}</p>
                  </div>
                </li>
                {activeConv.contact?.phone && (
                  <li className="flex items-center gap-5 group">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-500/5 border border-brand-border flex items-center justify-center text-brand-muted group-hover:text-primary-500 transition-colors">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold text-brand-muted uppercase mb-1">Direct Comms</p>
                      <p className="text-xs text-brand-text font-bold">{activeConv.contact?.phone}</p>
                    </div>
                  </li>
                )}
                <li className="flex items-center gap-5 group">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-500/5 border border-brand-border flex items-center justify-center text-brand-muted group-hover:text-primary-500 transition-colors">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold text-brand-muted uppercase mb-1">Geo Location</p>
                    <p className="text-xs text-brand-text font-bold">Cloud Presence</p>
                  </div>
                </li>
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
