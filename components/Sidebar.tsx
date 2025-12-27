
import React, { useState } from 'react';
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
  Mail,
  X,
  Database,
  ChevronDown,
  ChevronRight,
  MonitorPlay,
  Factory,
  UserCheck,
  CircleDollarSign,
  SearchCode,
  Globe,
  Search
} from 'lucide-react';
// @ts-ignore
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase } from '../services/supabase';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, agent, theme, setTheme, sidebarOpen, setSidebarOpen } = useStore();
  const [resourcesMenuOpen, setResourcesMenuOpen] = useState(false);

  const isAdmin = agent?.role === 'admin';

  const resourceSubItems = [
    { label: 'Social Media Marketing', icon: MonitorPlay, key: 'marketing' },
    { label: 'Manufacturing', icon: Factory, key: 'manufacturing' },
    { label: 'HR', icon: UserCheck, key: 'hr' },
    { label: 'Finance', icon: CircleDollarSign, key: 'finance' },
    { label: 'Market Research', icon: SearchCode, key: 'market-research' },
  ];

  const navItems = [
    { icon: Sparkles, label: 'AI Chat', path: '/' },
    { icon: Search, label: 'Neural Research', path: '/research' },
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
    <>
      {/* Universal Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Drawer Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-[110] w-72 glass-card h-full flex flex-col transition-all duration-500 transform
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-900/30">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <div>
              <span className="block font-display font-bold text-xl tracking-tight text-brand-text leading-none">AIXOS</span>
              <span className="text-[10px] font-bold text-primary-500 uppercase tracking-widest mt-1">Intelligence</span>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-brand-muted hover:text-brand-text transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar no-scrollbar">
          {/* Main Nav */}
          {navItems.slice(0, 4).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-primary-600/10 text-primary-600 dark:text-primary-400 shadow-sm' 
                    : 'text-brand-muted hover:bg-zinc-500/5 hover:text-brand-text'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                <span className={`font-bold text-sm tracking-tight ${isActive ? 'translate-x-1' : ''} transition-transform`}>{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]" />}
              </Link>
            );
          })}

          {/* Collapsible Resources Menu */}
          <div className="space-y-1">
            <button
              onClick={() => setResourcesMenuOpen(!resourcesMenuOpen)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group ${
                location.pathname.startsWith('/resources') 
                  ? 'bg-primary-600/5 text-primary-600' 
                  : 'text-brand-muted hover:bg-zinc-500/5 hover:text-brand-text'
              }`}
            >
              <Database className="w-5 h-5 text-primary-600/60" />
              <span className="font-bold text-sm text-left flex-1">Resources</span>
              {resourcesMenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {resourcesMenuOpen && (
              <div className="ml-6 space-y-1 border-l border-brand-border pl-3 animate-slide-up">
                {resourceSubItems.map((sub) => (
                  <Link
                    key={sub.key}
                    to={`/resources?node=${sub.key}`}
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-brand-muted hover:bg-zinc-500/5 hover:text-brand-text transition-all group"
                  >
                    <sub.icon className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:text-primary-500 transition-all" />
                    <span className="text-[11px] font-black uppercase tracking-widest truncate">{sub.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Remaining Nav */}
          {navItems.slice(4).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-primary-600/10 text-primary-600 dark:text-primary-400 shadow-sm' 
                    : 'text-brand-muted hover:bg-zinc-500/5 hover:text-brand-text'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                <span className={`font-bold text-sm tracking-tight ${isActive ? 'translate-x-1' : ''} transition-transform`}>{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-brand-border space-y-4 bg-brand-surface/40">
          <button 
            onClick={toggleTheme}
            className="flex items-center gap-4 px-4 py-3 rounded-2xl text-brand-muted hover:bg-zinc-500/5 hover:text-brand-text transition-all w-full"
          >
            <div className="relative w-5 h-5">
               <Sun className={`absolute inset-0 w-5 h-5 transition-all duration-500 ${theme === 'light' ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`} />
               <Moon className={`absolute inset-0 w-5 h-5 transition-all duration-500 ${theme === 'dark' ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0'}`} />
            </div>
            <span className="font-bold text-sm">{theme === 'light' ? 'Go Dark' : 'Go Light'}</span>
          </button>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-500/5 border border-brand-border">
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
            <span className="font-bold text-sm">Terminate Session</span>
          </button>
        </div>
      </div>
    </>
  );
};
