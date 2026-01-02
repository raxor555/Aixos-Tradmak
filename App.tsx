
import React, { useEffect } from 'react';
// @ts-ignore
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar.tsx';
import Dashboard from './pages/Dashboard.tsx';
import { Conversations } from './pages/Conversations.tsx';
import { Inquiries } from './pages/Inquiries.tsx';
import { Channels } from './pages/Channels.tsx';
import { ContactsPage } from './pages/Contacts.tsx';
import { Login } from './pages/Login.tsx';
import { AIChat } from './pages/AIChat.tsx';
import { EmailsPage } from './pages/Emails.tsx';
import { SettingsPage } from './pages/Settings.tsx';
import { ResourcesPage } from './pages/Resources.tsx';
import { DeepResearchPage } from './pages/DeepResearch.tsx';
import { ChatbotMonitor } from './pages/ChatbotMonitor.tsx';
import { supabase } from './services/supabase.ts';
import { useStore } from './store/useStore.ts';
import { Loader2, Menu, Sparkles } from 'lucide-react';

const AnalyticsPage = () => <div className="p-8"><h1 className="text-2xl font-bold">Advanced Analytics</h1><p className="text-zinc-500 mt-2">Deep insights into your support operations.</p></div>;

const AuthGuard = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const { user, agent, loading } = useStore();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-surface flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && agent?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { setUser, setAgent, theme, setSidebarOpen } = useStore();

  useEffect(() => {
    // Fixed: Cast to any to resolve missing getSession method on SupabaseAuthClient type reported by the compiler
    (supabase.auth as any).getSession().then(({ data: { session } }: any) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchAgentProfile(session.user.id);
      useStore.setState({ loading: false });
    });

    // Fixed: Cast to any to resolve missing onAuthStateChange method on SupabaseAuthClient type reported by the compiler
    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchAgentProfile(session.user.id);
      else setAgent(null);
      useStore.setState({ loading: false });
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAgentProfile = async (userId: string) => {
    const { data } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (data) setAgent(data);
  };

  return (
    <Router>
      <div className={theme === 'light' ? 'light-mode' : ''}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route 
            path="/*" 
            element={
              <AuthGuard>
                <div className="flex h-screen bg-brand-surface font-sans text-brand-text transition-colors duration-500 overflow-hidden">
                  <Sidebar />
                  <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                    <header className="flex items-center justify-between px-6 py-4 glass-card border-b border-brand-border sticky top-0 z-40">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setSidebarOpen(true)}
                          className="p-2 -ml-2 text-brand-muted hover:text-primary-600 transition-colors"
                        >
                          <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-primary-600" />
                          <span className="font-display font-bold text-lg tracking-tight">AIXOS</span>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-3">
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted">Tradmak Intelligence Layer</span>
                      </div>
                    </header>

                    <div className="flex-1 overflow-hidden relative">
                      <Routes>
                        <Route path="/" element={<AIChat />} />
                        <Route path="/research" element={<DeepResearchPage />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/conversations" element={<Conversations />} />
                        <Route path="/resources" element={<ResourcesPage />} />
                        <Route path="/emails" element={<EmailsPage />} />
                        <Route path="/channels" element={<Channels />} />
                        <Route path="/chatbot-logs" element={<ChatbotMonitor />} />
                        <Route path="/inquiries" element={<Inquiries />} />
                        <Route path="/contacts" element={<AuthGuard requireAdmin><ContactsPage /></AuthGuard>} />
                        <Route path="/analytics" element={<AuthGuard requireAdmin><AnalyticsPage /></AuthGuard>} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </div>
                  </main>
                </div>
              </AuthGuard>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
