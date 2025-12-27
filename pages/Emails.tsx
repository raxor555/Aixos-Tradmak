
import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  Plus, 
  Search, 
  Inbox, 
  SendHorizonal, 
  FileText, 
  Trash2, 
  Archive, 
  Star,
  Loader2,
  X,
  Minimize2,
  Paperclip as AttachmentIcon,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Globe
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useStore } from '../store/useStore';

interface EmailRecord {
  id: string;
  from_address: string;
  to_address: string[];
  subject: string;
  body_text: string;
  created_at: string;
  is_read: boolean;
  direction: 'inbound' | 'outbound';
}

export const EmailsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Inbox' | 'Sent' | 'Drafts'>('Inbox');
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [search, setSearch] = useState('');
  const [config, setConfig] = useState<any>(null);
  const [sending, setSending] = useState(false);

  // Compose State
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    fetchConfig();
    fetchEmails();
  }, [activeTab]);

  const fetchConfig = async () => {
    const { data } = await supabase.from('email_settings').select('*').single();
    setConfig(data);
  };

  const fetchEmails = async () => {
    setLoading(true);
    const direction = activeTab === 'Inbox' ? 'inbound' : 'outbound';
    
    const { data } = await supabase
      .from('emails')
      .select('*')
      .eq('direction', direction)
      .order('created_at', { ascending: false });

    if (data) setEmails(data);
    setLoading(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config?.enabled) {
      alert("Relay infrastructure is dormant. Configure in Settings.");
      return;
    }
    
    setSending(true);

    try {
      if (config.webhook_url) {
        // Option A: Webhook Relay (Preferred for Enterprise)
        const res = await fetch(config.webhook_url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': config.webhook_auth_token ? `Bearer ${config.webhook_auth_token}` : ''
          },
          body: JSON.stringify({ to, from: config.from_email, subject, message: body })
        });
        if (!res.ok) throw new Error("Webhook relay failed to process transmission.");
      } else if (config.emailjs_public_key) {
        // Option B: EmailJS SDK
        const emailjs = (window as any).emailjs;
        if (!emailjs) throw new Error("EmailJS SDK not available.");
        
        emailjs.init(config.emailjs_public_key);
        await emailjs.send(config.emailjs_service_id, config.emailjs_template_id, {
          to_email: to,
          from_name: config.from_name,
          subject,
          message: body
        });
      } else {
        throw new Error("No communication protocol configured.");
      }

      // Log outbound message
      await supabase.from('emails').insert({
        direction: 'outbound',
        from_address: config.from_email,
        to_address: [to],
        subject,
        body_text: body,
        is_read: true
      });

      setShowCompose(false);
      resetCompose();
      fetchEmails();
    } catch (err: any) {
      alert('Relay Dispatch Error: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const resetCompose = () => {
    setTo(''); setSubject(''); setBody('');
  };

  return (
    <div className="flex-1 flex flex-col bg-brand-surface h-screen animate-fade-in transition-colors duration-500 overflow-hidden">
      {(!config || !config.enabled) && (
        <div className="bg-primary-600/10 border-b border-primary-500/20 p-4 flex items-center justify-between px-10 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <AlertCircle className="w-5 h-5 text-primary-500" />
            <p className="text-sm font-bold text-brand-text">Communication engine is dormant. Configure infrastructure in Settings.</p>
          </div>
          <button onClick={() => window.location.hash = '/settings'} className="text-[10px] font-black uppercase bg-primary-600 text-white px-5 py-2 rounded-xl shadow-lg">Configure Node</button>
        </div>
      )}

      <header className="p-10 border-b border-brand-border flex justify-between items-end glass-card z-20">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Globe className="w-5 h-5 text-primary-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-muted">Strategic Post</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-brand-text mb-2 tracking-tight">Intelligence Dispatch</h1>
          <p className="text-brand-muted font-bold text-sm tracking-wide">Secure multi-protocol post via enterprise relay nodes.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="relative w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <input 
              placeholder="Filter transmissions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-zinc-500/5 border border-brand-border rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold text-brand-text focus:ring-2 focus:ring-primary-600/20 transition-all placeholder:text-brand-muted/40 outline-none"
            />
          </div>
          <button 
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-3 px-8 py-3.5 bg-primary-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-900/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Compose
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sub-nav */}
        <div className="w-72 border-r border-brand-border glass-card flex flex-col z-10">
          <div className="p-6 space-y-1.5">
            {[
              { id: 'Inbox', icon: Inbox, count: emails.filter(e => e.direction === 'inbound').length },
              { id: 'Sent', icon: SendHorizonal, count: emails.filter(e => e.direction === 'outbound').length },
              { id: 'Drafts', icon: FileText, count: '0' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group ${
                  activeTab === tab.id 
                    ? 'bg-primary-600 text-white shadow-xl shadow-primary-900/20' 
                    : 'text-brand-muted hover:bg-zinc-500/5 hover:text-brand-text'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-bold flex-1 text-left">{tab.id}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${activeTab === tab.id ? 'bg-white/20 border-transparent text-white' : 'bg-zinc-500/10 border-brand-border text-brand-muted'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-auto p-8 border-t border-brand-border">
            <div className="p-5 bg-emerald-500/5 rounded-3xl border border-emerald-500/10">
              <p className="text-[10px] font-black uppercase text-emerald-600 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> Post Relay
              </p>
              <p className="text-[9px] font-bold text-brand-muted leading-relaxed">
                Outbound logic is active via {config?.webhook_url ? 'Webhook Node' : 'EmailJS SDK'}.
              </p>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-brand-surface/20">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Polling Transmissions...</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-12">
              <div className="w-24 h-24 bg-zinc-500/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-brand-border">
                <Inbox className="w-10 h-10 text-brand-muted opacity-30" />
              </div>
              <h3 className="text-2xl font-display font-bold text-brand-text mb-2">Null Stream</h3>
              <p className="text-brand-muted max-w-xs italic text-sm">No indexed transmissions in this sector.</p>
            </div>
          ) : (
            <div className="divide-y divide-brand-border">
              {emails.map(email => (
                <div 
                  key={email.id} 
                  className={`p-6 hover:bg-zinc-500/5 cursor-pointer transition-all flex items-center gap-8 group ${!email.is_read ? 'bg-primary-600/5' : ''}`}
                >
                  <button className="text-brand-muted hover:text-amber-400 transition-colors">
                    <Star className="w-4 h-4" />
                  </button>
                  <div className="w-48 flex-shrink-0">
                    <p className={`text-sm truncate ${!email.is_read ? 'font-black text-brand-text' : 'font-bold text-brand-muted'}`}>
                      {email.from_address}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm truncate ${!email.is_read ? 'font-black text-brand-text' : 'font-medium text-brand-muted'}`}>
                        {email.subject}
                      </span>
                      <span className="text-xs text-brand-muted/40 font-medium truncate">— {email.body_text || 'Secure transmission...'}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-6">
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-4 transition-all">
                      <button className="p-2 text-brand-muted hover:text-primary-600 transition-colors"><Archive className="w-4 h-4" /></button>
                      <button className="p-2 text-brand-muted hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <span className="text-[10px] font-black uppercase text-brand-muted tracking-widest">
                      {new Date(email.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-[100] flex items-end justify-end p-10 pointer-events-none">
          <div className="w-full max-w-2xl glass-card rounded-[2.5rem] shadow-3xl animate-slide-up pointer-events-auto flex flex-col overflow-hidden border border-primary-500/30">
            <header className="p-6 bg-primary-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Send className="w-5 h-5" />
                <h3 className="text-sm font-black uppercase tracking-widest leading-none">Transmission Dispatch</h3>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setShowCompose(false)} className="p-1 hover:bg-white/20 rounded-lg transition-all"><X className="w-4 h-4" /></button>
              </div>
            </header>

            <form onSubmit={handleSend} className="flex-1 p-8 space-y-4">
              <div className="flex items-center gap-4 border-b border-brand-border py-3 group">
                <span className="text-[10px] font-black uppercase text-brand-muted tracking-[0.2em] w-12">Target</span>
                <input 
                  required
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-brand-text placeholder:text-brand-muted/20"
                  placeholder="recipient@domain.com"
                />
              </div>
              <div className="flex items-center gap-4 border-b border-brand-border py-3">
                <span className="text-[10px] font-black uppercase text-brand-muted tracking-[0.2em] w-12">Sub</span>
                <input 
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-brand-text placeholder:text-brand-muted/20"
                  placeholder="Briefing context..."
                />
              </div>
              
              <textarea 
                rows={12}
                value={body}
                onChange={e => setBody(e.target.value)}
                className="w-full bg-zinc-500/5 border border-brand-border rounded-[1.5rem] p-6 text-sm font-medium text-brand-text focus:ring-2 focus:ring-primary-600/20 outline-none resize-none no-scrollbar"
                placeholder="Author transmission content..."
              />

              <div className="flex justify-end items-center pt-4">
                <button 
                  disabled={sending}
                  className="bg-primary-600 hover:bg-primary-500 text-white px-10 py-4 rounded-2xl transition-all shadow-xl shadow-primary-900/30 font-black uppercase text-[11px] tracking-widest flex items-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
                  Finalize Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
