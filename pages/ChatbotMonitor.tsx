
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Loader2, 
  Activity, 
  User, 
  Clock, 
  Bot, 
  Terminal,
  ShieldAlert,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useStore } from '../store/useStore';

interface AIConversation {
  id: string;
  agent_id: string;
  title: string;
  created_at: string;
  last_message_at: string;
  agent?: {
    name: string;
  };
}

interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'ai';
  content: string;
  created_at: string;
}

export const ChatbotMonitor: React.FC = () => {
  const { agent } = useStore();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = agent?.role === 'admin';

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*, agent:agents(name)')
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (err) {
      console.error('Error fetching AI conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchConversations();
      const sub = supabase.channel('ai-convs-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'ai_conversations' }, fetchConversations).subscribe();
      return () => { sub.unsubscribe(); };
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
    } else {
      setMessages([]);
    }
  }, [activeConvId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loadingMessages]);

  const filteredConversations = conversations.filter(c => 
    c.title?.toLowerCase().includes(search.toLowerCase()) || 
    c.agent?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-brand-surface animate-fade-in transition-colors duration-500">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20 shadow-lg shadow-red-500/10">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-4xl font-display font-bold text-brand-text">Unauthorized</h2>
          <p className="text-brand-muted font-bold uppercase tracking-widest text-[10px]">Restricted Domain: Tradmak Admins Only</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-brand-surface animate-fade-in h-screen transition-colors duration-500">
      <div className="w-80 glass-card border-r border-brand-border flex flex-col z-20">
        <div className="p-8 border-b border-brand-border">
          <div className="flex items-center gap-3 mb-8">
            <Activity className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-display font-bold text-brand-text">Neural Audit</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <input 
              placeholder="Search session traces..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-zinc-500/5 border border-brand-border rounded-2xl text-[10px] font-extrabold uppercase tracking-widest text-brand-text focus:outline-none focus:ring-2 focus:ring-primary-600/20 transition-all placeholder:text-brand-muted/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-12 text-center text-brand-muted text-[10px] font-bold uppercase tracking-[0.2em] opacity-50 italic">No Conversations Detected</div>
          ) : filteredConversations.map(conv => (
            <div 
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className={`p-5 border-b border-brand-border cursor-pointer transition-all hover:bg-zinc-500/5 group ${
                activeConvId === conv.id ? 'bg-primary-600/5 border-l-4 border-l-primary-600' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-zinc-500/5 border border-brand-border flex items-center justify-center text-brand-muted group-hover:text-primary-600 transition-all">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-brand-text truncate">{conv.title || 'Session Instance'}</span>
                    <span className="text-[10px] text-brand-muted font-black">{new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-[10px] text-brand-muted truncate uppercase tracking-widest font-extrabold opacity-60">Agent: {conv.agent?.name || 'Neural Core'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative">
        {activeConvId ? (
          <>
            <header className="h-20 border-b border-brand-border px-10 flex items-center justify-between glass-card z-10">
              <div className="flex items-center gap-5">
                <div className="w-11 h-11 glass-card rounded-2xl flex items-center justify-center text-primary-600 border border-primary-500/20 shadow-inner">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-brand-text leading-tight uppercase tracking-tight">
                    Trace Log: {conversations.find(c => c.id === activeConvId)?.title || 'Active Session'}
                  </h3>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-brand-muted uppercase font-black tracking-widest">
                      <Clock className="w-3 h-3 text-primary-600" />
                      Established: {new Date(conversations.find(c => c.id === activeConvId)?.created_at || '').toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-12 md:p-16 space-y-12 custom-scrollbar">
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-brand-muted">
                  <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
                  <p className="font-black uppercase tracking-widest text-[10px]">Reconstructing Neural Chain...</p>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-12">
                  {messages.map((msg, i) => {
                    const isBot = msg.role === 'ai';
                    return (
                      <div key={msg.id} className={`flex gap-8 animate-slide-up ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                        <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg border ${
                          isBot ? 'glass-card border-brand-border' : 'bg-primary-600 border-primary-500 shadow-primary-900/20'
                        }`}>
                          {isBot ? <Bot className="w-7 h-7 text-primary-600" /> : <User className="w-7 h-7 text-white" />}
                        </div>
                        <div className={`flex-1 max-w-2xl ${isBot ? 'text-left' : 'text-right'}`}>
                          <div className={`inline-block px-8 py-6 rounded-[2.2rem] text-sm md:text-base leading-relaxed shadow-xl border ${
                            isBot 
                              ? 'glass-card text-brand-text rounded-tl-none' 
                              : 'bg-primary-600 text-white border-primary-500 rounded-tr-none'
                          }`}>
                            {msg.content}
                          </div>
                          <p className={`text-[10px] text-brand-muted mt-3 font-extrabold uppercase tracking-[0.2em] opacity-60 ${isBot ? 'text-left' : 'text-right'}`}>
                            {isBot ? 'AI Intelligence' : 'Partner Message'} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-fade-in">
            <div className="w-32 h-32 bg-zinc-500/5 rounded-[3.5rem] flex items-center justify-center mb-10 border border-brand-border shadow-2xl animate-pulse-soft">
              <Terminal className="w-16 h-16 text-brand-muted opacity-40" />
            </div>
            <h3 className="text-4xl font-display font-bold text-brand-text mb-4">Neural Log Access</h3>
            <p className="text-brand-muted max-w-sm leading-relaxed italic text-lg opacity-60 mb-10 font-medium">
              Select a conversation from the left to reconstruct the neural message chain for professional audit.
            </p>
            <div className="flex items-center gap-2 px-7 py-3.5 glass-card rounded-2xl">
              <span className="text-[10px] font-black text-brand-muted uppercase tracking-[0.3em]">Total Conversations tracked: {conversations.length}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
