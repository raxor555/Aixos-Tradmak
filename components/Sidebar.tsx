
import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  LogOut,
  Users,
  Inbox,
  Hash,
  Sparkles,
  Terminal,
  Sun,
  Moon,
  Mail
} from 'lucide-react';
// @ts-ignore
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase } from '../services/supabase';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, agent, theme, setTheme } = useStore();

  const isAdmin = agent?.role === 'admin';

  const navItems = [
    { icon: Sparkles, label: 'AI Chat', path: '/' },
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: MessageSquare, label: 'Conversations', path: '/conversations' },
    { icon: Mail, label: 'Emails', path: '/emails' },
    { icon: Hash, label: 'Team Hub', path: '/channels' },
    ...(isAdmin ? [
      { icon: Terminal, label: 'Chatbot Logs', path: '/chatbot-logs' },
      { icon: Inbox, label: 'Lead Inquiries', path: '/inquiries' },
      { icon: Users, label: 'Contacts', path: '/contacts' },
      { icon: BarChart3, label: 'Analytics', path: '/analytics' }
    ] : []),
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (agent?.id) {
      await supabase.from('agents').update({ theme: newTheme }).eq('id', agent.id);
    }
  };

  return (
    <div className="w-20 lg:w-64 glass-card h-screen flex flex-col transition-all duration-500 z-50">
      <div className="p-8 flex items-center gap-4">
        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-900/30">
          <Sparkles className="text-white w-6 h-6" />
        </div>
        <div className="hidden lg:block overflow-hidden">
          <span className="block font-display font-bold text-xl tracking-tight text-brand-text leading-none">AIXOS</span>
          <span className="text-[10px] font-bold text-primary-500 uppercase tracking-widest mt-1">Intelligence</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-primary-600/10 text-primary-600 dark:text-primary-400 shadow-sm' 
                  : 'text-brand-muted hover:bg-zinc-500/5 hover:text-brand-text'
              }`}
            >
              <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`} />
              <span className={`hidden lg:block font-bold text-sm tracking-tight ${isActive ? 'translate-x-1' : ''} transition-transform`}>{item.label}</span>
              {isActive && (
                <div className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-brand-border space-y-4">
        <button 
          onClick={toggleTheme}
          className="flex items-center gap-4 px-4 py-3 rounded-2xl text-brand-muted hover:bg-zinc-500/5 hover:text-brand-text transition-all w-full"
        >
          <div className="relative w-5 h-5">
             <Sun className={`absolute inset-0 w-5 h-5 transition-all duration-500 ${theme === 'light' ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`} />
             <Moon className={`absolute inset-0 w-5 h-5 transition-all duration-500 ${theme === 'dark' ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0'}`} />
          </div>
          <span className="hidden lg:block font-bold text-sm">{theme === 'light' ? 'Go Dark' : 'Go Light'}</span>
        </button>

        <div className="hidden lg:flex items-center gap-3 p-3 rounded-2xl bg-zinc-500/5 border border-brand-border">
          <img 
            src={agent?.avatar_url || `https://ui-avatars.com/api/?name=${agent?.name || 'User'}&background=3b82f6&color=fff`} 
            alt="Agent" 
            className="w-10 h-10 rounded-xl object-cover shadow-sm" 
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-brand-text truncate">{agent?.name || 'Partner'}</p>
            <p className="text-[10px] text-primary-500 uppercase font-extrabold tracking-tighter">{agent?.role || 'Access'}</p>
          </div>
        </div>
        
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-4 px-4 py-3 rounded-2xl text-brand-muted hover:text-red-500 hover:bg-red-500/5 transition-all w-full"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden lg:block font-bold text-sm">Terminate Session</span>
        </button>
      </div>
    </div>
  );
};
