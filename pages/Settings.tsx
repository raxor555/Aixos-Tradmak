
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
  Globe,
  Link as LinkIcon,
  Server
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useStore } from '../store/useStore';

export const SettingsPage: React.FC = () => {
  const { agent } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const [provider, setProvider] = useState<'emailjs' | 'webhook'>('emailjs');

  const [formData, setFormData] = useState({
    enabled: false,
    from_name: '',
    from_email: '',
    // EmailJS Fields
    emailjs_service_id: '',
    emailjs_template_id: '',
    emailjs_public_key: '',
    // Webhook Fields
    webhook_url: '',
    webhook_auth_token: ''
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
        if (data.webhook_url) setProvider('webhook');
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
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
      setMessage({ text: 'Neural configuration synchronized.', type: 'success' });
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
      if (provider === 'emailjs') {
        const emailjs = (window as any).emailjs;
        if (!emailjs) throw new Error("EmailJS SDK not initialized.");
        
        emailjs.init(formData.emailjs_public_key);
        await emailjs.send(
          formData.emailjs_service_id, 
          formData.emailjs_template_id, 
          {
            to_name: formData.from_name,
            to_email: formData.from_email,
            subject: "AIXOS Platform Test",
            message: "System handshake successful via EmailJS SDK."
          }
        );
      } else {
        if (!formData.webhook_url) throw new Error("Webhook URL missing.");
        const res = await fetch(formData.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            test: true,
            agent: agent?.name,
            timestamp: new Date().toISOString()
          })
        });
        if (!res.ok) throw new Error(`Relay responded with ${res.status}`);
      }

      setMessage({ text: 'Relay Handshake Successful.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: 'Relay Error: ' + err.message, type: 'error' });
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
        <p className="text-brand-muted font-bold text-sm">Configure your enterprise communication infrastructure.</p>
      </header>

      <div className="max-w-4xl space-y-10">
        <form onSubmit={handleSave} className="glass-card rounded-[2.5rem] p-10 shadow-sm border border-brand-border">
          <div className="flex items-center gap-6 mb-10 border-b border-brand-border pb-8">
            <div className="w-14 h-14 bg-primary-600/10 rounded-2xl flex items-center justify-center border border-primary-500/20 text-primary-500 shadow-inner">
              <Globe className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-brand-text">Comms Infrastructure</h2>
              <div className="flex gap-4 mt-2">
                <button 
                  type="button" 
                  onClick={() => setProvider('emailjs')}
                  className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border transition-all ${provider === 'emailjs' ? 'bg-primary-600 text-white border-primary-500' : 'bg-zinc-500/5 text-brand-muted border-brand-border'}`}
                >
                  EmailJS SDK
                </button>
                <button 
                  type="button" 
                  onClick={() => setProvider('webhook')}
                  className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border transition-all ${provider === 'webhook' ? 'bg-primary-600 text-white border-primary-500' : 'bg-zinc-500/5 text-brand-muted border-brand-border'}`}
                >
                  Webhook Relay
                </button>
              </div>
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
                <span className="ml-3 text-[10px] font-black uppercase text-brand-muted tracking-widest">Active</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary-500 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Identity Protocol
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2 ml-1">Friendly Name</label>
                  <input 
                    value={formData.from_name}
                    onChange={e => setFormData({ ...formData, from_name: e.target.value })}
                    className="w-full bg-zinc-500/5 border border-brand-border rounded-xl py-3.5 px-5 text-sm font-bold text-brand-text focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                    placeholder="AIXOS Support"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2 ml-1">System Email</label>
                  <input 
                    type="email"
                    value={formData.from_email}
                    onChange={e => setFormData({ ...formData, from_email: e.target.value })}
                    className="w-full bg-zinc-500/5 border border-brand-border rounded-xl py-3.5 px-5 text-sm font-bold text-brand-text focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                    placeholder="support@domain.com"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary-500 flex items-center gap-2">
                <Server className="w-4 h-4" /> Provider Context
              </h3>

              {provider === 'emailjs' ? (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2 ml-1">Service ID</label>
                    <input 
                      value={formData.emailjs_service_id}
                      onChange={e => setFormData({ ...formData, emailjs_service_id: e.target.value })}
                      className="w-full bg-zinc-500/5 border border-brand-border rounded-xl py-3.5 px-5 text-sm font-bold text-brand-text focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                      placeholder="service_xxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2 ml-1">Template ID</label>
                    <input 
                      value={formData.emailjs_template_id}
                      onChange={e => setFormData({ ...formData, emailjs_template_id: e.target.value })}
                      className="w-full bg-zinc-500/5 border border-brand-border rounded-xl py-3.5 px-5 text-sm font-bold text-brand-text focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                      placeholder="template_xxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2 ml-1">Public Key</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted group-focus-within:text-primary-500 transition-colors" />
                      <input 
                        type="password"
                        value={formData.emailjs_public_key}
                        onChange={e => setFormData({ ...formData, emailjs_public_key: e.target.value })}
                        className="w-full bg-zinc-500/5 border border-brand-border rounded-xl py-3.5 pl-11 pr-4 text-sm font-bold text-brand-text focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2 ml-1">Relay Webhook URL</label>
                    <div className="relative group">
                      <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted group-focus-within:text-primary-500 transition-colors" />
                      <input 
                        value={formData.webhook_url}
                        onChange={e => setFormData({ ...formData, webhook_url: e.target.value })}
                        className="w-full bg-zinc-500/5 border border-brand-border rounded-xl py-3.5 pl-11 pr-4 text-sm font-bold text-brand-text focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                        placeholder="https://n8n.your-domain.com/webhook/..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2 ml-1">Auth Secret (Optional)</label>
                    <input 
                      type="password"
                      value={formData.webhook_auth_token}
                      onChange={e => setFormData({ ...formData, webhook_auth_token: e.target.value })}
                      className="w-full bg-zinc-500/5 border border-brand-border rounded-xl py-3.5 px-5 text-sm font-bold text-brand-text focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                    />
                  </div>
                  <p className="text-[10px] text-brand-muted font-bold italic leading-relaxed uppercase">
                    Route system post via n8n, Make, or custom REST endpoints for high-reliability enterprise delivery.
                  </p>
                </div>
              )}
            </section>
          </div>

          <div className="mt-12 flex items-center justify-between pt-8 border-t border-brand-border">
            <button 
              type="button"
              onClick={testConnection}
              disabled={testing}
              className="px-8 py-4 bg-zinc-500/5 border border-brand-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-brand-muted hover:text-brand-text transition-all flex items-center gap-2 shadow-sm disabled:opacity-30"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
              Dispatch Test Signal
            </button>

            <button 
              type="submit"
              disabled={saving}
              className="px-10 py-4 bg-primary-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-primary-500 transition-all shadow-xl shadow-primary-900/30 flex items-center gap-3 active:scale-95"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Index Configuration
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
