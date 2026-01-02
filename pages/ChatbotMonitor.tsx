
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Loader2, 
  Activity, 
  User, 
  Clock, 
  Bot, 
  Terminal,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../services/supabase';

interface ChatbotConversation {
  id: number;
  created_at: string;
  session_id: string;
  name: string | null;
  email: string | null;
  number: string | null;
  conversation: string;
}

interface ParsedMessage {
  role: 'user' | 'ai';
  content: string;
}

export const ChatbotMonitor: React.FC = () => {
  const [conversations, setConversations] = useState<ChatbotConversation[]>([]);
  const [activeConv, setActiveConv] = useState<ChatbotConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chatbot_conversation')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (err) {
      console.error('Error fetching chatbot conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const sub = supabase.channel('chatbot-convs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chatbot_conversation' }, fetchConversations)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeConv]);

  const parseConversation = (raw: string): ParsedMessage[] => {
    if (!raw) return [];
    
    // Clean string: remove wrapping quotes and handle escaped newlines
    let cleaned = raw.trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    cleaned = cleaned.replace(/\\n/g, '\n');

    // Split by newlines and filter empty lines
    const lines = cleaned.split('\n').filter(line => line.trim() !== '');
    const messages: ParsedMessage[] = [];

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('user:-')) {
        messages.push({
          role: 'user',
          content: trimmedLine.replace('user:-', '').trim()
        });
      } else if (trimmedLine.startsWith('bot:-')) {
        messages.push({
          role: 'ai',
          content: trimmedLine.replace('bot:-', '').trim()
        });
      }
    });

    return messages;
  };

  const filteredConversations = conversations.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.session_id.toLowerCase().includes(search.toLowerCase()) ||
    c.conversation.toLowerCase().includes(search.toLowerCase())
  );

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
            <div className="p-12 text-center text-brand-muted text-[10px] font-bold uppercase tracking-[0.2em] opacity-50 italic">No Traces Detected</div>
          ) : filteredConversations.map(conv => (
            <div 
              key={conv.id}
              onClick={() => setActiveConv(conv)}
              className={`p-5 border-b border-brand-border cursor-pointer transition-all hover:bg-zinc-500/5 group ${
                activeConv?.id === conv.id ? 'bg-primary-600/5 border-l-4 border-l-primary-600' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-zinc-500/5 border border-brand-border flex items-center justify-center text-brand-muted group-hover:text-primary-600 transition-all">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-brand-text truncate">{conv.name || 'Anonymous Session'}</span>
                    <span className="text-[10px] text-brand-muted font-black">{new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-[10px] text-brand-muted truncate uppercase tracking-widest font-extrabold opacity-60">ID: {conv.session_id.split('_').pop()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative">
        {activeConv ? (
          <>
            <header className="h-20 border-b border-brand-border px-10 flex items-center justify-between glass-card z-10">
              <div className="flex items-center gap-5">
                <div className="w-11 h-11 glass-card rounded-2xl flex items-center justify-center text-primary-600 border border-primary-500/20 shadow-inner">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-brand-text leading-tight uppercase tracking-tight">
                    Trace Log: {activeConv.name || 'External User'}
                  </h3>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-brand-muted uppercase font-black tracking-widest">
                      <Clock className="w-3 h-3 text-primary-600" />
                      Session Started: {new Date(activeConv.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                 <ShieldCheck className="w-4 h-4 text-emerald-500" />
                 <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Integrity Checked</span>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-12 md:p-16 space-y-12 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-12">
                {parseConversation(activeConv.conversation).map((msg, i) => {
                  const isBot = msg.role === 'ai';
                  return (
                    <div key={i} className={`flex gap-8 animate-slide-up ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
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
                          {isBot ? 'Chatbot Engine' : (activeConv.name || 'User')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-fade-in">
            <div className="w-32 h-32 bg-zinc-500/5 rounded-[3.5rem] flex items-center justify-center mb-10 border border-brand-border shadow-2xl animate-pulse-soft">
              <Terminal className="w-16 h-16 text-brand-muted opacity-40" />
            </div>
            <h3 className="text-4xl font-display font-bold text-brand-text mb-4">Chatbot Trace Access</h3>
            <p className="text-brand-muted max-w-sm leading-relaxed italic text-lg opacity-60 mb-10 font-medium">
              Select a conversation from the sidebar to reconstruct the neural message chain from the chatbot repository.
            </p>
            <div className="flex items-center gap-2 px-7 py-3.5 glass-card rounded-2xl">
              <span className="text-[10px] font-black text-brand-muted uppercase tracking-[0.3em]">Total Traces Indexed: {conversations.length}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
