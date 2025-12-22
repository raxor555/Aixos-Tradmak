
import React, { useEffect } from 'react';
// Fix: Added @ts-ignore to bypass incorrect type definitions for react-router-dom members that are known to exist in the library version being used.
// @ts-ignore
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import { Conversations } from './pages/Conversations';
import { Inquiries } from './pages/Inquiries';
import { Channels } from './pages/Channels';
import { ContactsPage } from './pages/Contacts';
import { Login } from './pages/Login';
import { AIChat } from './pages/AIChat';
import { ChatbotMonitor } from './pages/ChatbotMonitor';
import { supabase } from './services/supabase';
import { useStore } from './store/useStore';
import { Loader2 } from 'lucide-react';

const AnalyticsPage = () => <div className="p-8"><h1 className="text-2xl font-bold">Advanced Analytics</h1><p className="text-zinc-500 mt-2">Deep insights into your support operations.</p></div>;
const SettingsPage = () => <div className="p-8"><h1 className="text-2xl font-bold">Settings</h1><p className="text-zinc-500 mt-2">Configure your AIXOS platform.</p></div>;

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
  const { setUser, setAgent, theme } = useStore();

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchAgentProfile(session.user.id);
      useStore.setState({ loading: false });
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
                <div className="flex h-screen bg-brand-surface font-sans text-zinc-900 dark:text-zinc-200 transition-colors duration-500">
                  <Sidebar />
                  <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                    <Routes>
                      <Route path="/" element={<AIChat />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/conversations" element={<Conversations />} />
                      <Route path="/channels" element={<Channels />} />
                      <Route path="/chatbot-logs" element={<AuthGuard requireAdmin><ChatbotMonitor /></AuthGuard>} />
                      <Route path="/inquiries" element={<AuthGuard requireAdmin><Inquiries /></AuthGuard>} />
                      <Route path="/contacts" element={<AuthGuard requireAdmin><ContactsPage /></AuthGuard>} />
                      <Route path="/analytics" element={<AuthGuard requireAdmin><AnalyticsPage /></AuthGuard>} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
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
