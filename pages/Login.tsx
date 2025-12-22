
import React, { useState } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Sparkles, Phone, Lock, Loader2, ArrowRight, User, Mail, AlertCircle, ShieldCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Form State
  const [identifier, setIdentifier] = useState(''); // Used for Login (Email or Phone)
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const formatPhoneNumber = (num: string) => {
    const cleaned = num.trim();
    if (!cleaned) return '';
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignup) {
        const formattedPhone = formatPhoneNumber(phone);
        const { data: authData, error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: name,
              phone: formattedPhone
            }
          }
        });

        if (signupError) throw signupError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('agents')
            .insert({
              user_id: authData.user.id,
              name: name,
              email: email.trim(),
              phone: formattedPhone,
              role: 'agent'
            });

          if (profileError) console.error("Profile creation error:", profileError);
        }
        
      } else {
        const isEmail = identifier.includes('@');
        const loginPayload = isEmail 
          ? { email: identifier.trim(), password } 
          : { phone: formatPhoneNumber(identifier), password };

        const { error: authError } = await supabase.auth.signInWithPassword(loginPayload);
        if (authError) throw authError;
      }

      navigate('/');
    } catch (err: any) {
      console.error("Auth Exception:", err);
      let msg = err.message || 'Authentication failed.';
      if (msg.includes('Invalid login credentials')) {
        msg = 'The identifier or password you entered is incorrect.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-surface flex items-center justify-center p-6 font-sans transition-colors duration-700">
      <div className="w-full max-w-md glass-card rounded-[3rem] p-10 md:p-12 shadow-2xl relative z-10 animate-slide-up">
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-primary-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-primary-900/30 mx-auto mb-10 animate-pulse-soft">
            <Sparkles className="text-white w-12 h-12" />
          </div>
          <h1 className="text-5xl font-display font-bold text-brand-text mb-4 tracking-tight">AIXOS</h1>
          <p className="text-brand-muted font-bold uppercase tracking-[0.3em] text-[10px] opacity-70">Intelligence Platform</p>
        </div>

        {error && (
          <div className="mb-8 p-5 bg-rose-500/5 border border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-bold flex gap-4 animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6">
          {isSignup ? (
            <div className="space-y-6 animate-fade-in">
              <div>
                <label className="block text-[10px] font-black text-brand-muted uppercase tracking-[0.25em] mb-3 ml-2">Display Name</label>
                <div className="relative group">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted group-focus-within:text-primary-500 transition-colors" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-500/5 border border-brand-border rounded-2xl py-5 pl-16 pr-6 text-brand-text focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:bg-zinc-500/10 transition-all font-bold placeholder:text-brand-muted/30"
                    placeholder="Full Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-brand-muted uppercase tracking-[0.25em] mb-3 ml-2">Email Identity</label>
                <div className="relative group">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted group-focus-within:text-primary-500 transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-500/5 border border-brand-border rounded-2xl py-5 pl-16 pr-6 text-brand-text focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:bg-zinc-500/10 transition-all font-bold placeholder:text-brand-muted/30"
                    placeholder="name@tradmak.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-brand-muted uppercase tracking-[0.25em] mb-3 ml-2">Communication Link</label>
                <div className="relative group">
                  <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted group-focus-within:text-primary-500 transition-colors" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-zinc-500/5 border border-brand-border rounded-2xl py-5 pl-16 pr-6 text-brand-text focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:bg-zinc-500/10 transition-all font-bold placeholder:text-brand-muted/30"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <label className="block text-[10px] font-black text-brand-muted uppercase tracking-[0.25em] mb-3 ml-2">Credential Key</label>
              <div className="relative group">
                <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted group-focus-within:text-primary-500 transition-colors" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-zinc-500/5 border border-brand-border rounded-2xl py-5 pl-16 pr-6 text-brand-text focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:bg-zinc-500/10 transition-all font-bold placeholder:text-brand-muted/30"
                  placeholder="name@email.com or +1234..."
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-brand-muted uppercase tracking-[0.25em] mb-3 ml-2">Secure Passkey</label>
            <div className="relative group">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted group-focus-within:text-primary-500 transition-colors" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-500/5 border border-brand-border rounded-2xl py-5 pl-16 pr-6 text-brand-text focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:bg-zinc-500/10 transition-all font-bold placeholder:text-brand-muted/30"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-4 shadow-2xl shadow-primary-900/30 group disabled:opacity-50 mt-10 active:scale-95"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <span className="text-[11px] uppercase tracking-widest">{isSignup ? 'Initialize Account' : 'Access AIXOS'}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-12 text-center">
          <button 
            onClick={() => { setIsSignup(!isSignup); setError(''); }}
            className="text-brand-muted hover:text-primary-600 text-xs font-bold transition-all"
          >
            {isSignup ? "Established partner? Sign In" : "New to Tradmak? Request Access"}
          </button>
        </div>

        <div className="mt-12 pt-10 border-t border-brand-border flex items-center justify-center gap-3">
           <ShieldCheck className="w-5 h-5 text-primary-600 opacity-60" />
           <p className="text-brand-muted text-[10px] font-black uppercase tracking-[0.3em] opacity-50">
            Enterprise Grade Security
          </p>
        </div>
      </div>
    </div>
  );
};
