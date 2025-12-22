
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, Loader2, ArrowRight, Plus, History, MessageSquare, Trash2, AlertCircle, Mic, MicOff } from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../services/supabase';

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const webhookUrl = 'https://n8n.srv1040836.hstgr.cloud/webhook/crm-chat';

  // Dynamic Page Title Update
  useEffect(() => {
    if (agent?.name) {
      document.title = `Welcome, ${agent.name} | AIXOS`;
    }
    return () => {
      document.title = 'AIXOS | Tradmak Intelligence';
    };
  }, [agent]);

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
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('ai_conversations').delete().eq('id', id);
    if (activeConvId === id) setActiveConvId(null);
    fetchConversations();
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping || !agent?.id) return;
    setError(null);

    let convId = activeConvId;
    try {
      if (!convId) {
        const { data: newConv } = await supabase
          .from('ai_conversations')
          .insert({ agent_id: agent.id, title: input.substring(0, 30) + '...' })
          .select().single();
        if (!newConv) return;
        convId = newConv.id;
        setActiveConvId(convId);
      }

      const userText = input;
      setInput('');
      setIsTyping(true);

      const { data: savedUserMsg } = await supabase
        .from('ai_messages')
        .insert({ conversation_id: convId, role: 'user', content: userText })
        .select().single();

      if (savedUserMsg) setMessages(prev => [...prev, savedUserMsg]);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          user: agent.name,
          agentId: agent.id,
          conversationId: convId
        }),
      });

      const resData = await response.json();
      const aiResponse = typeof resData === 'string' ? resData : resData.output || resData.reply || "Request processed.";

      const { data: savedAiMsg } = await supabase
        .from('ai_messages')
        .insert({ conversation_id: convId, role: 'ai', content: aiResponse })
        .select().single();

      if (savedAiMsg) {
        setMessages(prev => [...prev, savedAiMsg]);
        await supabase.from('ai_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId);
      }
    } catch (err: any) {
      setError("Synchronization error.");
    } finally {
      setIsTyping(false);
      fetchConversations();
    }
  };

  return (
    <div className="flex-1 flex bg-brand-surface relative overflow-hidden h-screen transition-colors duration-500">
      {/* History Sidebar */}
      <div className="w-72 glass-card border-r border-brand-border flex flex-col z-20">
        <div className="p-6">
          <button 
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-primary-900/30 active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            New AI Session
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar">
          <div className="flex items-center gap-2 px-2 mb-4 opacity-60">
            <History className="w-4 h-4 text-brand-muted" />
            <span className="text-[10px] font-extrabold text-brand-muted uppercase tracking-[0.2em]">Historical Cache</span>
          </div>

          <div className="space-y-1">
            {loadingHistory ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
            ) : conversations.length === 0 ? (
              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-brand-muted opacity-40 py-8">Empty Archive</p>
            ) : conversations.map(conv => (
              <div 
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10">
        {!activeConvId && messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in text-center">
            <div className="w-24 h-24 bg-primary-600 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-3xl shadow-primary-900/40 animate-pulse-soft">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-display font-bold text-brand-text mb-6">
              Welcome, <span className="text-primary-600">{agent?.name}</span>
            </h1>
            <p className="text-brand-muted text-xl max-w-lg leading-relaxed mb-12 font-medium opacity-80">
              AIXOS is powered by Tradmak Intelligence. What shall we optimize or automate today?
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-3xl">
              {[
                "Analyze support efficiency",
                "Draft weekly performance report",
                "Identify high-priority leads",
                "Optimize agent workflows"
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); handleSendMessage(); }}
                  className="glass-card p-6 text-left group hover:border-primary-600 transition-all rounded-[1.5rem]"
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
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 md:p-16 space-y-12 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-12">
              {messages.map((msg) => {
                const isAI = msg.role === 'ai';
                return (
                  <div key={msg.id} className={`flex gap-8 animate-slide-up ${isAI ? 'items-start' : 'flex-row-reverse items-start'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg ${
                      isAI ? 'bg-primary-600' : 'bg-brand-card dark:bg-zinc-800'
                    }`}>
                      {isAI ? <Bot className="w-7 h-7 text-white" /> : <User className="w-7 h-7 text-brand-muted" />}
                    </div>
                    <div className={`flex-1 max-w-3xl ${!isAI ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block px-8 py-6 rounded-[2.2rem] text-base md:text-lg leading-relaxed shadow-lg border ${
                        isAI 
                          ? 'glass-card text-brand-text rounded-tl-none' 
                          : 'bg-primary-600 text-white border-primary-500 rounded-tr-none'
                      }`}>
                        {msg.content}
                      </div>
                      <p className="text-[10px] text-brand-muted mt-3 font-extrabold uppercase tracking-[0.2em] opacity-60">
                        {isAI ? 'Cognitive Processor' : 'Authored By Me'} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex gap-8 items-start animate-pulse">
                  <div className="w-12 h-12 rounded-2xl bg-primary-600/20 flex items-center justify-center"><Bot className="w-7 h-7 text-primary-600" /></div>
                  <div className="glass-card px-8 py-6 rounded-[2rem] rounded-tl-none">
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

        {/* Input Dock */}
        <div className="p-10 bg-gradient-to-t from-brand-surface via-brand-surface to-transparent">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
            {error && (
              <div className="absolute -top-12 left-0 w-full flex justify-center">
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 backdrop-blur-md">
                  <AlertCircle className="w-4 h-4" />{error}
                </div>
              </div>
            )}
            <div className="relative flex items-center dock-glass rounded-[2.5rem] p-3 focus-within:ring-2 focus-within:ring-primary-600/30 transition-all">
              <button
                type="button"
                onClick={toggleListening}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'text-brand-muted hover:text-primary-600'
                }`}
              >
                {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                placeholder={isListening ? "Processing voice..." : "Consult AIXOS Intelligence..."}
                className="flex-1 bg-transparent border-none focus:ring-0 text-brand-text text-lg py-4 px-4 resize-none font-medium placeholder:text-brand-muted/40"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="w-14 h-14 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-all shadow-xl shadow-primary-900/30 active:scale-90"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
