
import React, { useState, useEffect, useRef } from 'react';
import { 
  Hash, 
  Plus, 
  Send, 
  Users, 
  Lock,
  Loader2,
  UserPlus,
  X,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { InternalChannel, InternalMessage } from '../types';
import { supabase } from '../services/supabase';

export const Channels: React.FC = () => {
  const { agent } = useStore();
  const [channels, setChannels] = useState<InternalChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [agents, setAgents] = useState<any[]>([]);
  const [currentChannelMembers, setCurrentChannelMembers] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = agent?.role === 'admin';
  const activeChannel = channels.find(c => c.id === activeChannelId);

  const fetchData = async () => {
    if (!agent) return;
    
    const { data: membershipData } = await supabase
      .from('channel_members')
      .select('channel_id')
      .eq('agent_id', agent.id);

    const channelIds = (membershipData || []).map(m => m.channel_id);

    if (channelIds.length > 0) {
      const { data: channelData } = await supabase
        .from('internal_channels')
        .select('*')
        .in('id', channelIds)
        .order('created_at', { ascending: true });
      
      setChannels(channelData || []);
    } else {
      setChannels([]);
    }

    const { data: agentData } = await supabase
      .from('agents')
      .select('*')
      .neq('id', agent.id);
    setAgents(agentData || []);
    
    setLoading(false);
  };

  const fetchChannelMembers = async (channelId: string) => {
    const { data } = await supabase
      .from('channel_members')
      .select('agent:agents(*)')
      .eq('channel_id', channelId);
    
    setCurrentChannelMembers(data?.map(d => d.agent) || []);
  };

  const fetchMessages = async (channelId: string) => {
    const { data } = await supabase
      .from('internal_messages')
      .select(`
        *,
        sender:agents(name, avatar_url)
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });
    
    const formatted = (data || []).map(m => ({
      ...m,
      sender_name: m.sender?.name,
      sender_avatar: m.sender?.avatar_url
    }));
    
    setMessages(formatted);
  };

  const createChannel = async () => {
    if (!newChannelName.trim() || !isAdmin || !agent) return;

    const { data: channel } = await supabase
      .from('internal_channels')
      .insert({
        name: newChannelName,
        created_by: agent.id,
        is_private: false,
        organization_id: agent.organization_id
      })
      .select()
      .single();

    if (channel) {
      await supabase.from('channel_members').insert({
        channel_id: channel.id,
        agent_id: agent.id
      });
      
      setNewChannelName('');
      setShowCreateModal(false);
      fetchData();
      setActiveChannelId(channel.id);
    }
  };

  const startPrivateChat = async (targetAgentId: string) => {
    if (!agent) return;
    
    const { data: channelId } = await supabase
      .rpc('get_or_create_private_channel', { 
        agent_a_id: agent.id, 
        agent_b_id: targetAgentId 
      });

    if (channelId) {
      await fetchData(); 
      setActiveChannelId(channelId);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeChannelId || !agent) return;
    
    const content = inputText;
    setInputText('');

    await supabase.from('internal_messages').insert({
      channel_id: activeChannelId,
      sender_id: agent.id,
      content
    });
  };

  useEffect(() => {
    fetchData();
    const channelSub = supabase
      .channel('internal-channels-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_channels' }, fetchData)
      .subscribe();
    return () => { channelSub.unsubscribe(); };
  }, [agent]);

  useEffect(() => {
    if (activeChannelId) {
      fetchMessages(activeChannelId);
      fetchChannelMembers(activeChannelId);
      const msgSub = supabase
        .channel(`internal-messages-${activeChannelId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'internal_messages',
          filter: `channel_id=eq.${activeChannelId}` 
        }, () => fetchMessages(activeChannelId))
        .subscribe();
      return () => { msgSub.unsubscribe(); };
    }
  }, [activeChannelId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-screen bg-brand-surface animate-fade-in transition-colors duration-500 relative">
      {/* Sidebar Refined */}
      <div className="w-80 border-r border-brand-border flex flex-col glass-card">
        <div className="p-8 border-b border-brand-border flex justify-between items-center">
          <h2 className="text-xl font-display font-bold text-brand-text flex items-center gap-3">
            <Users className="w-5 h-5 text-primary-500" />
            Team Hub
          </h2>
          {isAdmin && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="p-2.5 bg-primary-600/10 text-primary-600 rounded-xl hover:bg-primary-600 hover:text-white transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-8 space-y-12 custom-scrollbar">
          <section>
            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-muted mb-6 px-4">Established Channels</h4>
            <div className="space-y-1.5">
              {channels.filter(c => !c.is_private).map(channel => (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannelId(channel.id)}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group ${
                    activeChannelId === channel.id 
                      ? 'bg-primary-600 text-white shadow-xl shadow-primary-900/20' 
                      : 'text-brand-muted hover:bg-zinc-500/5 hover:text-brand-text'
                  }`}
                >
                  <Hash className={`w-4 h-4 ${activeChannelId === channel.id ? 'text-white' : 'text-primary-500/60'}`} />
                  <span className="text-sm font-bold truncate">{channel.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-muted mb-6 px-4">Neural Node Network</h4>
            <div className="space-y-1.5">
              {agents.map(a => (
                <button
                  key={a.id}
                  onClick={() => startPrivateChat(a.id)}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group ${
                    channels.some(c => c.is_private && activeChannelId === c.id) 
                      ? 'text-brand-text' 
                      : 'text-brand-muted hover:bg-zinc-500/5 hover:text-brand-text'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img src={a.avatar_url || `https://ui-avatars.com/api/?name=${a.name}`} className="w-8 h-8 rounded-xl border border-brand-border" />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-brand-card ${a.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
                  </div>
                  <span className="text-sm font-bold truncate">{a.name}</span>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 ml-auto transition-all" />
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Main Terminal */}
      <div className="flex-1 flex flex-col relative z-10 transition-colors duration-500">
        {activeChannelId ? (
          <>
            <header className="h-24 border-b border-brand-border px-10 flex items-center justify-between glass-card">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-primary-600/10 rounded-2xl flex items-center justify-center border border-primary-500/20 shadow-inner text-primary-500">
                  {activeChannel?.is_private ? <Lock className="w-6 h-6" /> : <Hash className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-text leading-tight">
                    {activeChannel?.is_private ? 'Secure Direct Trace' : activeChannel?.name}
                  </h3>
                  <p className="text-[10px] text-brand-muted uppercase font-black tracking-widest mt-1.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                    Neural synchronization active with {currentChannelMembers.length} nodes
                  </p>
                </div>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-12 md:p-16 space-y-12 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-12">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === agent?.id;
                  return (
                    <div key={msg.id} className={`flex gap-6 animate-slide-up ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <img src={msg.sender_avatar || `https://ui-avatars.com/api/?name=${msg.sender_name}`} className="w-12 h-12 rounded-2xl border border-brand-border shadow-md" alt="" />
                      <div className={`flex-1 max-w-2xl ${isMe ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-3 mb-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span className="font-bold text-sm text-brand-text">{msg.sender_name}</span>
                          <span className="text-[10px] text-brand-muted font-black opacity-50">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className={`inline-block px-8 py-5 rounded-[2.2rem] text-base leading-relaxed border shadow-lg transition-all ${
                          isMe 
                            ? 'bg-primary-600 text-white border-primary-500 rounded-tr-none' 
                            : 'glass-card border-brand-border text-brand-text rounded-tl-none'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-10 bg-gradient-to-t from-brand-surface via-brand-surface to-transparent">
              <div className="max-w-4xl mx-auto dock-glass rounded-[2.8rem] p-4 transition-all">
                <div className="flex items-center gap-4">
                  <textarea 
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    placeholder="Transmit internal directive..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-brand-text text-base p-4 resize-none font-medium placeholder:text-brand-muted/40"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!inputText.trim()}
                    className="w-14 h-14 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-all shadow-xl shadow-primary-900/30 active:scale-90"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-32 h-32 bg-zinc-500/5 rounded-[3.5rem] flex items-center justify-center mb-10 border border-brand-border shadow-2xl animate-pulse-soft">
              <Users className="w-14 h-14 text-brand-muted opacity-30" />
            </div>
            <h3 className="text-4xl font-display font-bold text-brand-text mb-5 tracking-tight">Command Center Hub</h3>
            <p className="text-brand-muted max-w-sm italic text-lg opacity-60">
              Initiate a neural sync with your partners to coordinate operational logistics.
            </p>
          </div>
        )}
      </div>

      {/* Modal Light Mode Accurate */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-md glass-card rounded-[3rem] p-10 shadow-3xl">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-display font-bold text-brand-text">New Sync Channel</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-brand-muted hover:text-brand-text transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>
            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-black text-brand-muted uppercase tracking-[0.25em] mb-4 ml-2">Channel Identifier</label>
                <input
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full bg-zinc-500/5 border border-brand-border rounded-3xl py-5 px-8 text-brand-text font-bold focus:outline-none focus:ring-2 focus:ring-primary-600/30 transition-all placeholder:text-brand-muted/20"
                  placeholder="high-value-leads"
                />
              </div>
              <button 
                onClick={createChannel}
                disabled={!newChannelName.trim()}
                className="w-full py-5 bg-primary-600 text-white font-black rounded-3xl hover:bg-primary-700 shadow-2xl shadow-primary-900/40 transition-all disabled:opacity-50 text-[11px] uppercase tracking-widest active:scale-95"
              >
                Construct Channel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
