import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Globe, 
  Zap, 
  Loader2, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Database,
  Terminal,
  BrainCircuit,
  Sparkles
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useStore } from '../store/useStore';

interface ResearchLog {
  id: string;
  target_url: string;
  research_output: string;
  created_at: string;
  status: string;
}

export const DeepResearchPage: React.FC = () => {
  const { agent } = useStore();
  const [logs, setLogs] = useState<ResearchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeLog, setActiveLog] = useState<ResearchLog | null>(null);
  const [thinkingStep, setThinkingStep] = useState(0);

  const webhookUrl = 'https://n8n.srv1040836.hstgr.cloud/webhook/webhookdeepresearch';

  const thinkingMessages = [
    "Establishing Neural Handshake...",
    "Crawling Source Topography...",
    "Extracting Semantic Intelligence...",
    "Synthesizing Strategic Report...",
    "Finalizing Neural Log..."
  ];

  useEffect(() => {
    if (researching) {
      const interval = setInterval(() => {
        setThinkingStep(prev => (prev + 1) % thinkingMessages.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [researching]);

  const fetchLogs = async () => {
    if (!agent) return;
    setLoading(true);
    const { data } = await supabase
      .from('research_logs')
      .select('*')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false });
    
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [agent]);

  const initiateResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !agent) return;

    setResearching(true);
    setError(null);
    setThinkingStep(0);

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          agent_name: agent.name,
          agent_id: agent.id,
          timestamp: new Date().toISOString()
        })
      });

      if (!res.ok) throw new Error("Neural Node disconnected. Check relay status.");

      const data = await res.json();
      const output = typeof data === 'string' ? data : data.output || data.research || JSON.stringify(data);

      // Save to log
      const { data: savedLog, error: logError } = await supabase
        .from('research_logs')
        .insert({
          agent_id: agent.id,
          target_url: url.trim(),
          research_output: output,
          status: 'completed'
        })
        .select()
        .single();

      if (logError) throw logError;

      setShowModal(false);
      setUrl('');
      fetchLogs();
      if (savedLog) setActiveLog(savedLog);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResearching(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 animate-fade-in bg-brand-surface custom-scrollbar">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Globe className="w-5 h-5 text-primary-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-brand-muted">Cognitive Web Ingestion</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-brand-text mb-2 tracking-tight">Neural Deep Research</h1>
          <p className="text-brand-muted font-bold text-sm max-w-2xl leading-relaxed">
            Deploy cognitive agents to scrape, analyze, and synthesize intelligence from any web domain.
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="px-8 py-4 bg-primary-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-primary-500 shadow-xl shadow-primary-900/30 transition-all active:scale-95"
        >
          <Zap className="w-4 h-4" />
          Initiate Research
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Research Archive */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center gap-3 px-4">
            <Terminal className="w-4 h-4 text-brand-muted" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Neural Log Archive</h3>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
            ) : logs.length === 0 ? (
              <div className="glass-card rounded-[2rem] p-10 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted opacity-40">Archive Empty</p>
              </div>
            ) : logs.map(log => (
              <button 
                key={log.id}
                onClick={() => setActiveLog(log)}
                className={`w-full text-left glass-card p-6 rounded-[1.8rem] transition-all border group ${
                  activeLog?.id === log.id ? 'border-primary-500 bg-primary-600/5' : 'hover:border-primary-500/30'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-black text-primary-500 uppercase tracking-widest">Completed</span>
                  <span className="text-[9px] font-bold text-brand-muted">{new Date(log.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm font-bold text-brand-text truncate group-hover:text-primary-600 transition-colors mb-1">{log.target_url}</p>
                <p className="text-[10px] text-brand-muted truncate opacity-60">ID: {log.id.split('-')[0]}...</p>
              </button>
            ))}
          </div>
        </div>

        {/* Intelligence Display */}
        <div className="lg:col-span-2">
          {activeLog ? (
            <div className="glass-card rounded-[2.5rem] p-8 md:p-12 animate-slide-up h-full flex flex-col min-h-[600px]">
              <div className="flex justify-between items-start mb-10 border-b border-brand-border pb-8">
                <div>
                  <h2 className="text-3xl font-display font-bold text-brand-text mb-2">Neural Report</h2>
                  <div className="flex items-center gap-3 text-brand-muted">
                    <Globe className="w-4 h-4 text-primary-600" />
                    <span className="text-[10px] font-bold uppercase tracking-widest truncate max-w-[300px]">{activeLog.target_url}</span>
                  </div>
                </div>
                <button 
                  className="p-3 bg-zinc-500/5 rounded-2xl hover:bg-zinc-500/10 transition-all text-brand-muted"
                  onClick={() => setActiveLog(null)}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="prose prose-invert max-w-none text-brand-text leading-relaxed font-medium">
                  {activeLog.research_output.split('\n').map((para, i) => (
                    <p key={i} className="mb-6">{para}</p>
                  ))}
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-brand-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 text-emerald-500">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Sync Verified</span>
                </div>
                <button className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-500 transition-colors">Export Intelligence</button>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-[2.5rem] h-full min-h-[600px] flex flex-col items-center justify-center p-12 text-center border-dashed border-2">
              <div className="w-24 h-24 bg-zinc-500/5 rounded-[2.8rem] flex items-center justify-center mb-10 border border-brand-border animate-pulse-soft">
                <BrainCircuit className="w-12 h-12 text-brand-muted opacity-30" />
              </div>
              <h3 className="text-3xl font-display font-bold text-brand-text mb-4">Awaiting Signal</h3>
              <p className="text-brand-muted max-w-sm italic leading-relaxed text-lg opacity-60">
                Select a log from the archive or initiate a new deep research mission to ingest data.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Initiation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-xl glass-card rounded-[3rem] p-10 md:p-14 shadow-3xl animate-slide-up relative overflow-hidden">
            {researching && (
              <div className="absolute inset-0 bg-brand-surface z-50 flex flex-col items-center justify-center p-12 text-center">
                <div className="relative mb-12">
                   {/* Thinking Animation */}
                   <div className="w-32 h-32 bg-primary-600/10 rounded-full flex items-center justify-center relative">
                      <div className="absolute inset-0 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
                      <Sparkles className="w-12 h-12 text-primary-600 animate-pulse" />
                   </div>
                   <div className="absolute -inset-8 bg-primary-600/5 rounded-full blur-2xl animate-pulse" />
                </div>
                
                <h3 className="text-3xl font-display font-bold text-brand-text mb-4">Thinking...</h3>
                <div className="flex flex-col items-center gap-2">
                   <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary-600 animate-pulse">
                     {thinkingMessages[thinkingStep]}
                   </p>
                   <div className="flex gap-1.5 mt-4">
                     {thinkingMessages.map((_, i) => (
                       <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${i === thinkingStep ? 'bg-primary-600 scale-150' : 'bg-zinc-500/30'}`} />
                     ))}
                   </div>
                </div>
                <p className="text-brand-muted mt-12 text-sm italic font-medium opacity-60">
                  Synthesizing massive datasets into actionable intelligence. This process may take up to 60 seconds.
                </p>
              </div>
            )}

            <button 
              onClick={() => { setShowModal(false); setError(null); setUrl(''); }}
              className="absolute top-8 right-8 text-brand-muted hover:text-brand-text transition-colors"
            >
              <X className="w-8 h-8" />
            </button>

            <div className="text-center mb-12">
              <div className="w-20 h-20 bg-primary-600/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-primary-500/20 shadow-inner">
                <Globe className="w-10 h-10 text-primary-600" />
              </div>
              <h2 className="text-4xl font-display font-bold text-brand-text mb-3">Neural Link Ingestion</h2>
              <p className="text-[10px] text-brand-muted font-extrabold uppercase tracking-[0.3em]">Operational Phase: Targeting</p>
            </div>

            <form onSubmit={initiateResearch} className="space-y-8">
              <div>
                <label className="block text-[10px] font-black text-brand-muted uppercase tracking-[0.25em] mb-4 ml-2">Target Node URL</label>
                <div className="relative group">
                  <Database className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-brand-muted group-focus-within:text-primary-600 transition-colors" />
                  <input
                    required
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-zinc-500/5 border border-brand-border rounded-[2rem] py-6 pl-16 pr-8 text-brand-text font-bold focus:outline-none focus:ring-2 focus:ring-primary-600/30 transition-all placeholder:text-brand-muted/20 text-lg"
                    placeholder="https://example.com/strategic-report"
                  />
                </div>
              </div>

              {error && (
                <div className="p-5 bg-rose-500/5 border border-rose-500/20 rounded-[1.5rem] flex items-center gap-4 text-rose-600 animate-slide-up">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                </div>
              )}

              <div className="pt-6 border-t border-brand-border">
                <button
                  type="submit"
                  disabled={!url.trim() || researching}
                  className="w-full py-6 bg-primary-600 text-white font-black rounded-[2rem] hover:bg-primary-500 shadow-2xl shadow-primary-900/30 transition-all flex items-center justify-center gap-4 disabled:opacity-50 text-[12px] uppercase tracking-[0.25em] active:scale-95 group"
                >
                  Deploy Research Agent
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-3 opacity-40">
                <ShieldCheck className="w-4 h-4 text-brand-muted" />
                <span className="text-[9px] font-black uppercase tracking-widest text-brand-muted">Secure TLS Link Mandatory</span>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ShieldCheck = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1-1z"/><path d="m9 12 2 2 4-4"/>
  </svg>
);