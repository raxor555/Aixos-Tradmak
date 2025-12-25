
import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Mail, 
  Shield, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Lock,
  Loader2,
  Zap,
  Globe
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useStore } from '../store/useStore';

export const SettingsPage: React.FC = () => {
  const { agent } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    enabled: false,
    from_name: '',
    from_email: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_security: 'STARTTLS',
    imap_host: '',
    imap_port: 993,
    imap_user: '',
    imap_pass: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('email_settings')
        .select('*')
        .single();

      if (data) {
        setFormData({
          ...formData,
          ...data,
        });
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSmtpBridge = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).Email) {
        resolve((window as any).Email);
        return;
      }

      // Check if the script is already in the document but not yet loaded
      const existingScript = document.querySelector('script[src*="smtpjs.com"]');
      if (existingScript) {
        // Wait for it to load
        let attempts = 0;
        const interval = setInterval(() => {
          if ((window as any).Email) {
            clearInterval(interval);
            resolve((window as any).Email);
          }
          if (attempts > 50) { // 5 seconds timeout
            clearInterval(interval);
            reject(new Error("SMTP.js timed out while loading."));
          }
          attempts++;
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.src = "https://smtpjs.com/v3/smtp.js";
      script.async = true;
      script.onload = () => resolve((window as any).Email);
      script.onerror = () => reject(new Error("Failed to load SMTP.js. Please check your internet connection or browser security settings."));
      document.head.appendChild(script);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const updates = {
        id: '00000000-0000-0000-0000-000000000000',
        ...formData,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('email_settings')
        .upsert(updates);

      if (error) throw error;
      setMessage({ text: 'Internal configuration synchronized.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: 'Save Failed: ' + err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const SmtpBridge = await loadSmtpBridge();
      
      if (!SmtpBridge) {
        throw new Error("SMTP Bridge initialized but the 'Email' object is missing.");
      }

      // SMTP.js browser-direct test
      const result = await SmtpBridge.send({
        Host: formData.smtp_host,
        Username: formData.smtp_user,
        Password: formData.smtp_pass,
        To: formData.from_email,
        From: formData.from_email,
        Subject: "AIXOS Browser Relay: Test Signal",
        Body: `Hello ${formData.from_name},\n\nYour browser is successfully communicating with your SMTP server via the AIXOS bridge.\n\nSent at: ${new Date().toLocaleString()}`
      });

      if (result === "OK") {
        setMessage({ text: 'SMTP Handshake Successful. Check your inbox.', type: 'success' });
      } else {
        throw new Error(result);
      }
    } catch (err: any) {
      setMessage({ 
        text: 'Relay Error: ' + err.message, 
        type: 'error' 
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-brand-surface">
      <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-10 bg-brand-surface custom-scrollbar animate-fade-in">
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-3">
          <Settings className="w-5 h-5 text-primary-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-muted">System Configuration</span>
        </div>
        <h1 className="text-4xl font-display font-bold text-brand-text mb-2 tracking-tight">Platform Settings</h1>
        <p className="text-brand-muted font-bold text-sm">Direct browser-to-server email integration (No CLI/n8n Required).</p>
      </header>

      <div className="max-w-4xl space-y-10">
        <form onSubmit={handleSave} className="glass-card rounded-[2.5rem] p-10 shadow-sm overflow-hidden relative border border-brand-border">
          <div className="flex items-center gap-6 mb-10 border-b border-brand-border pb-8">
            <div className="w-14 h-14 bg-primary-600/10 rounded-2xl flex items-center justify-center border border-primary-500/20 text-primary-500 shadow-inner">
              <Globe className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-brand-text">Local Comms Bridge</h2>
              <p className="text-xs text-brand-muted font-bold uppercase tracking-widest mt-1">Direct SMTP Identity Management</p>
            </div>
            <div className="ml-auto">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={formData.enabled}
                  onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                />
                <div className="w-11 h-6 bg-zinc-500/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 shadow-inner"></div>
                <span className="ml-3 text-[10px] font-black uppercase text-brand-muted tracking-widest">Enabled</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary-500 flex items-center gap-2">
                <Zap className="w-4 h-4" /> SMTP Dispatch
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2 ml-1">From Name</label>
                  <input 
                    value={formData.from_name}
                    onChange={e => setFormData({ ...formData, from_name: e.target.value })}
                    className="w-full bg-zinc-500/5 border border-brand-border rounded-xl py-3.5 px-5 text-sm font-bold text-brand-text focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                    placeholder="AIXOS Support"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2 ml-1">From Email</label>
                  <input 
                    type="email"
                    value={formData.from_email}
                    onChange={e => setFormData({ ...formData, from_email: e.target.value })}
                    className="w-full bg-zinc-500/5 border border-brand-border rounded-xl py-3.5 px-5 text-sm font-bold text-brand-text focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                    placeholder="you@domain.com"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2 ml-1">SMTP Host</label>
                    <input 
                      value={formData.smtp_host}
                      onChange={e => setFormData({ ...formData, smtp_host: e.target.value })}
                      className="w-full bg-zinc-500/5 border border-brand-border rounded-xl py-3.5 px-5 text-sm font-bold text-brand-text focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2 ml-1">Port</label>
                    <input 
                      type="number"
                      value={formData.smtp_port}
                      onChange={e => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
                      className="w-full bg-zinc-500/5 border border-brand-border rounded-xl py-3.5 px-5 text-sm font-bold text-brand-text focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2 ml-1">SMTP User</label>
                  <input 
                    value={formData.smtp_user}
                    onChange={e => setFormData({ ...formData, smtp_user: e.target.value })}
                    className="w-full bg-zinc-500/5 border border-brand-border rounded-xl py-3.5 px-5 text-sm font-bold text-brand-text focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2 ml-1">SMTP Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted group-focus-within:text-primary-500 transition-colors" />
                    <input 
                      type="password"
                      value={formData.smtp_pass}
                      onChange={e => setFormData({ ...formData, smtp_pass: e.target.value })}
                      className="w-full bg-zinc-500/5 border border-brand-border rounded-xl py-3.5 pl-11 pr-4 text-sm font-bold text-brand-text focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary-500 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> IMAP (Incoming)
              </h3>
              <p className="text-[10px] text-brand-muted font-bold uppercase italic leading-relaxed">
                Note: Inbound IMAP polling requires a persistent server node. Browsers can only handle outgoing SMTP via the bridge.
              </p>

              <div className="space-y-5 opacity-50">
                <div>
                  <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2 ml-1">IMAP Host</label>
                  <input 
                    disabled
                    value={formData.imap_host}
                    className="w-full bg-zinc-500/5 border border-brand-border rounded-xl py-3.5 px-5 text-sm font-bold text-brand-text cursor-not-allowed" 
                    placeholder="imap.gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2 ml-1">IMAP User</label>
                  <input 
                    disabled
                    value={formData.imap_user}
                    className="w-full bg-zinc-500/5 border border-brand-border rounded-xl py-3.5 px-5 text-sm font-bold text-brand-text cursor-not-allowed" 
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="mt-12 flex items-center justify-between pt-8 border-t border-brand-border">
            <button 
              type="button"
              onClick={testConnection}
              disabled={testing || !formData.smtp_host}
              className="px-8 py-4 bg-zinc-500/5 border border-brand-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-brand-muted hover:text-brand-text transition-all flex items-center gap-2 shadow-sm disabled:opacity-30"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
              Test Browser Relay
            </button>

            <button 
              type="submit"
              disabled={saving}
              className="px-10 py-4 bg-primary-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-primary-500 transition-all shadow-xl shadow-primary-900/30 flex items-center gap-3 active:scale-95"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Local Matrix
            </button>
          </div>

          {message && (
            <div className={`mt-8 p-5 rounded-2xl flex items-center gap-4 animate-slide-up border ${message.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/5 border-rose-500/20 text-rose-600'}`}>
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="text-xs font-bold uppercase tracking-wider">{message.text}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
