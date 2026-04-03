
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Zap, ShoppingBag, AlertCircle, Trash2 } from 'lucide-react';

// ─── Webhook URLs ────────────────────────────────────────────────────────────
const WEBHOOKS = {
  electrical: 'https://n8n.srv1040836.hstgr.cloud/webhook/tradmak-electrical',
  retail:     'https://n8n.srv1040836.hstgr.cloud/webhook/tradmak-retail',
};
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'electrical' | 'retail';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  ts: string;
}

const TAB_CONFIG = {
  electrical: {
    label: 'Tradmak Electrical',
    icon: Zap,
    color: 'text-yellow-500',
    activeBg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600',
    bubble: 'bg-yellow-500',
    placeholder: 'Ask about electrical products, services, or quotes...',
    greeting: "Hello! I'm the Tradmak Electrical assistant. How can I help you with your electrical needs today?",
  },
  retail: {
    label: 'Tradmak Retail',
    icon: ShoppingBag,
    color: 'text-emerald-500',
    activeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600',
    bubble: 'bg-emerald-500',
    placeholder: 'Ask about products, availability, orders, or store info...',
    greeting: "Hi there! I'm the Tradmak Retail assistant. What can I help you find or order today?",
  },
};

function ChatBot({ tab }: { tab: Tab }) {
  const cfg = TAB_CONFIG[tab];
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'greeting',
      role: 'bot',
      content: cfg.greeting,
      ts: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(`session-${Date.now()}-${tab}`);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const clearChat = () => {
    sessionId.current = `session-${Date.now()}-${tab}`;
    setMessages([
      {
        id: 'greeting-' + Date.now(),
        role: 'bot',
        content: cfg.greeting,
        ts: new Date().toISOString(),
      },
    ]);
    setError(null);
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    setError(null);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      ts: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const body = new FormData();
      body.append('message', text);
      body.append('sessionId', sessionId.current);
      body.append('chatbot', tab);
      body.append('timestamp', new Date().toISOString());

      const res = await fetch(WEBHOOKS[tab], {
        method: 'POST',
        body,
      });

      if (!res.ok) throw new Error(`Server responded with ${res.status}`);

      const data = await res.json();
      const reply: string =
        typeof data === 'string'
          ? data
          : data.output || data.reply || data.message || data.text || data.response || 'Got it! Let me look into that for you.';

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        content: reply,
        ts: new Date().toISOString(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('[TradmakDemo] Webhook error:', err);
      setError('Could not reach the assistant. Please check your connection or webhook URL.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 custom-scrollbar"
      >
        {messages.map(msg => {
          const isBot = msg.role === 'bot';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 md:gap-5 animate-slide-up ${isBot ? 'items-start' : 'flex-row-reverse items-start'}`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 md:w-11 md:h-11 rounded-xl flex-shrink-0 flex items-center justify-center shadow-md ${
                  isBot ? cfg.bubble : 'bg-brand-card border border-brand-border'
                }`}
              >
                {isBot ? (
                  <Bot className="w-5 h-5 text-white" />
                ) : (
                  <User className="w-5 h-5 text-brand-muted" />
                )}
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] md:max-w-2xl ${!isBot ? 'text-right' : ''}`}>
                <div
                  className={`inline-block px-5 py-3.5 md:px-6 md:py-4 rounded-2xl text-sm md:text-base leading-relaxed shadow border whitespace-pre-wrap ${
                    isBot
                      ? 'glass-card text-brand-text rounded-tl-none'
                      : 'bg-primary-600 text-white border-primary-500 rounded-tr-none'
                  }`}
                >
                  {msg.content}
                </div>
                <p className="text-[10px] text-brand-muted mt-1.5 font-bold uppercase tracking-widest opacity-50">
                  {isBot ? cfg.label : 'You'} •{' '}
                  {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 md:gap-5 items-start animate-pulse">
            <div className={`w-9 h-9 md:w-11 md:h-11 rounded-xl flex-shrink-0 flex items-center justify-center ${cfg.bubble} opacity-60`}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="glass-card px-5 py-4 rounded-2xl rounded-tl-none">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce delay-100" />
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 md:p-6 border-t border-brand-border bg-brand-surface/60 backdrop-blur-sm">
        {error && (
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        <form onSubmit={sendMessage} className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={cfg.placeholder}
            disabled={isLoading}
            className="flex-1 bg-brand-card border border-brand-border rounded-2xl px-5 py-3.5 text-sm md:text-base text-brand-text placeholder:text-brand-muted/40 focus:outline-none focus:border-primary-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 md:w-12 md:h-12 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95 flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export const TradmakDemoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('electrical');

  return (
    <div className="flex flex-col h-full bg-brand-surface overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-0 border-b border-brand-border bg-brand-surface/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-display font-bold text-brand-text tracking-tight">Tradmak Demo</h1>
            <p className="text-xs text-brand-muted font-medium mt-0.5 uppercase tracking-widest">Live Chatbot Demonstrations</p>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById(`clear-${activeTab}`);
              el?.click();
            }}
            className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-brand-muted hover:text-red-500 hover:bg-red-500/10 border border-brand-border hover:border-red-500/30 rounded-xl transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Chat
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-2">
          {(Object.keys(TAB_CONFIG) as Tab[]).map(tab => {
            const cfg = TAB_CONFIG[tab];
            const Icon = cfg.icon;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-t-2xl text-sm font-bold border-b-2 transition-all ${
                  isActive
                    ? `${cfg.activeBg} border-current`
                    : 'text-brand-muted border-transparent hover:text-brand-text hover:bg-zinc-500/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? '' : cfg.color}`} />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat panels — rendered but hidden so state is preserved on tab switch */}
      <div className="flex-1 overflow-hidden relative">
        {(Object.keys(TAB_CONFIG) as Tab[]).map(tab => (
          <div
            key={tab}
            className={`absolute inset-0 flex flex-col transition-opacity duration-200 ${
              activeTab === tab ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            <ChatBotWithClear tab={tab} activeTab={activeTab} />
          </div>
        ))}
      </div>
    </div>
  );
};

function ChatBotWithClear({ tab, activeTab }: { tab: Tab; activeTab: Tab }) {
  const cfg = TAB_CONFIG[tab];
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'greeting',
      role: 'bot',
      content: cfg.greeting,
      ts: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(`session-${Date.now()}-${tab}`);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const clearChat = () => {
    sessionId.current = `session-${Date.now()}-${tab}`;
    setMessages([
      {
        id: 'greeting-' + Date.now(),
        role: 'bot',
        content: cfg.greeting,
        ts: new Date().toISOString(),
      },
    ]);
    setError(null);
    setInput('');
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    setError(null);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      ts: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const body = new FormData();
      body.append('message', text);
      body.append('sessionId', sessionId.current);
      body.append('chatbot', tab);
      body.append('timestamp', new Date().toISOString());

      const res = await fetch(WEBHOOKS[tab], {
        method: 'POST',
        body,
      });

      if (!res.ok) throw new Error(`Server responded with ${res.status}`);

      const data = await res.json();
      const reply: string =
        typeof data === 'string'
          ? data
          : data.output || data.reply || data.message || data.text || data.response || 'Got it! Let me look into that for you.';

      setMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'bot',
          content: reply,
          ts: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      console.error(`[TradmakDemo/${tab}] Webhook error:`, err);
      setError('Could not reach the assistant. Please check your connection or webhook URL.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Hidden clear button triggered from parent */}
      <button id={`clear-${tab}`} onClick={clearChat} className="hidden" />

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5 custom-scrollbar"
      >
        {messages.map(msg => {
          const isBot = msg.role === 'bot';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 md:gap-5 animate-slide-up ${isBot ? 'items-start' : 'flex-row-reverse items-start'}`}
            >
              <div
                className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-md ${
                  isBot ? cfg.bubble : 'bg-brand-card border border-brand-border'
                }`}
              >
                {isBot ? (
                  <Bot className="w-5 h-5 text-white" />
                ) : (
                  <User className="w-5 h-5 text-brand-muted" />
                )}
              </div>

              <div className={`max-w-[80%] md:max-w-2xl ${!isBot ? 'text-right' : ''}`}>
                <div
                  className={`inline-block px-5 py-3.5 rounded-2xl text-sm md:text-base leading-relaxed shadow border whitespace-pre-wrap ${
                    isBot
                      ? 'glass-card text-brand-text rounded-tl-none'
                      : 'bg-primary-600 text-white border-primary-500 rounded-tr-none'
                  }`}
                >
                  {msg.content}
                </div>
                <p className="text-[10px] text-brand-muted mt-1.5 font-bold uppercase tracking-widest opacity-50">
                  {isBot ? cfg.label : 'You'} •{' '}
                  {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 md:gap-5 items-start">
            <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${cfg.bubble} opacity-60`}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="glass-card px-5 py-4 rounded-2xl rounded-tl-none animate-pulse">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce delay-100" />
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="p-4 md:p-6 border-t border-brand-border bg-brand-surface/60 backdrop-blur-sm">
        {error && (
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        <form onSubmit={sendMessage} className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={cfg.placeholder}
            disabled={isLoading}
            className="flex-1 bg-brand-card border border-brand-border rounded-2xl px-5 py-3.5 text-sm md:text-base text-brand-text placeholder:text-brand-muted/40 focus:outline-none focus:border-primary-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 md:w-12 md:h-12 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95 flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
