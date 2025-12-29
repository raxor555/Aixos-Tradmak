
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
  Sparkles,
  RefreshCw,
  Layers,
  Activity
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
    "Scanning Target Node Infrastructure...",
    "Bypassing Perimeter Protocols...",
    "Crawling Deep Web Topography...",
    "Extracting Latent Semantic Data...",
    "Synthesizing Strategic Intelligence...",
    "Compiling Neural Briefing..."
  ];

  useEffect(() => {
    let interval: any;
    if (researching) {
      interval = setInterval(() => {
        setThinkingStep(prev => (prev + 1) % thinkingMessages.length);
      }, 2500);
    }
    return () => clearInterval(interval);
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
      // Fetch logic with standard headers to minimize CORS issues
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url.trim(),
          agent: agent.name,
          agent_id: agent.id,
          timestamp: new Date().toISOString()
        })
      });

      if (!res.ok) {
        throw new Error(`Connection unstable: Target node returned ${res.status}.`);
      }

      const data = await res.json();
      
      // Handle diverse response structures from n8n
      const output = typeof data === 'string' 
        ? data 
        : data.output || data.research || data.report || JSON.stringify(data, null, 2);

      // Record this mission in the archive
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
      console.error("Deep Research Exception:", err);
      setError(err.message || "Neural signal lost during synthesis.");
    } finally {
      setResearching(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-12 animate-fade-in bg-brand-surface custom-scrollbar">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-600/10 rounded-lg border border-primary-500/20">
              <Activity className="w-5 h-5 text-primary-500 animate-pulse" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-muted">Neural Intelligence Layer</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-bold text-brand-text mb-3 tracking-tight">Quantum Research</h1>
          <p className="text-brand-muted font-bold text-lg max-w-2xl leading-relaxed opacity-70">
            Deploy cognitive agents to scrape, index, and synthesize high-fidelity intelligence from the global web topography.
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="group relative px-10 py-5 bg-primary-600 text-white rounded-3xl text-[12px] font-black uppercase tracking-[0.2em] flex items-center gap-4 hover:bg-primary-500 shadow-3xl shadow-primary-900/40 transition-all active:scale-95 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Sparkles className="w-5 h-5 animate-pulse" />
          Initiate New Mission
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Research Archive (Sidebar style) */}
        <div className="lg:col-span-1 space-y-8">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Terminal className="w-4 h-4 text-primary-500" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Historical Archive</h3>
            </div>
            <button onClick={fetchLogs} className="text-brand-muted hover:text-primary-500 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500 opacity-50" /></div>
            ) : logs.length === 0 ? (
              <div className="glass-card rounded-[2.5rem] p-12 text-center border-dashed border-2 opacity-40">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Archive Empty</p>
              </div>
            ) : logs.map(log => (
              <button 
                key={log.id}
                onClick={() => setActiveLog(log)}
                className={`w-full text-left glass-card p-6 rounded-[2rem] transition-all border group relative overflow-hidden ${
                  activeLog?.id === log.id ? 'border-primary-500 ring-2 ring-primary-500/20 bg-primary-600/5' : 'hover:border-primary-500/40'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[9px] font-black text-primary-500 uppercase tracking-widest bg-primary-600/10 px-2 py-0.5 rounded-md">Verified</span>
                  <span className="text-[9px] font-bold text-brand-muted opacity-50">{new Date(log.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm font-bold text-brand-text truncate group-hover:text-primary-600 transition-colors mb-2">{log.target_url}</p>
                <div className="flex items-center gap-2 text-[10px] text-brand-muted font-medium italic truncate opacity-50">
                  <Layers className="w-3 h-3" /> Report Index: {log.id.split('-')[0]}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tactical Intel Display */}
        <div className="lg:col-span-3">
          {activeLog ? (
            <div className="glass-card rounded-[3rem] p-10 md:p-16 animate-slide-up h-full flex flex-col min-h-[700px] border-primary-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/5 rounded-full blur-[100px] -mr-32 -mt-32" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-brand-border pb-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Globe className="w-6 h-6 text-primary-600" />
                    <h2 className="text-3xl font-display font-bold text-brand-text">Mission Intel Briefing</h2>
                  </div>
                  <p className="text-xs font-bold text-brand-muted uppercase tracking-widest flex items-center gap-2">
                    <span className="text-primary-500 italic">Source:</span> {activeLog.target_url}
                  </p>
                </div>
                <div className="flex gap-4">
                   <button 
                    className="p-4 bg-zinc-500/5 rounded-2xl hover:bg-rose-500/10 hover:text-rose-500 transition-all text-brand-muted border border-brand-border"
                    onClick={() => setActiveLog(null)}
                    title="Close Briefing"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-6">
                <div className="prose prose-invert max-w-none text-brand-text text-lg leading-[2] font-medium opacity-90">
                  {activeLog.research_output.split('\n').map((para, i) => (
                    para.trim() ? <p key={i} className="mb-8 p-4 rounded-2xl hover:bg-zinc-500/5 transition-colors">{para}</p> : null
                  ))}
                </div>
              </div>

              <div className="mt-12 pt-10 border-t border-brand-border flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 text-emerald-500 shadow-inner">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Integrity Verified</span>
                    <span className="text-[10px] font-bold text-brand-muted">Quantum Timestamp: {new Date(activeLog.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button className="px-6 py-3 border border-brand-border rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-muted hover:text-primary-500 hover:border-primary-500/40 transition-all">Download CSV</button>
                  <button className="px-6 py-3 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-500 transition-all shadow-lg shadow-primary-900/30">Generate PDF</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-[3.5rem] h-full min-h-[700px] flex flex-col items-center justify-center p-16 text-center border-dashed border-2 group">
              <div className="relative mb-12">
                <div className="w-32 h-32 bg-zinc-500/5 rounded-[3rem] flex items-center justify-center border border-brand-border group-hover:border-primary-500/40 transition-all duration-700">
                  <BrainCircuit className="w-16 h-16 text-brand-muted opacity-30 group-hover:opacity-60 transition-opacity" />
                </div>
                <div className="absolute inset-0 bg-primary-600/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              </div>
              <h3 className="text-4xl font-display font-bold text-brand-text mb-6 tracking-tight">System Status: Awaiting Signal</h3>
              <p className="text-brand-muted max-w-md italic leading-relaxed text-xl opacity-60 font-medium">
                "Select a historical node from the archive or initiate a fresh ingestion sequence to synthesize web intelligence."
              </p>
              <div className="mt-12 flex gap-4">
                 {[...Array(3)].map((_, i) => (
                   <div key={i} className="w-2 h-2 rounded-full bg-zinc-500/20 animate-bounce" style={{ animationDelay: `${i * 200}ms` }} />
                 ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Deep Research Initiation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-2xl animate-fade-in">
          <div className="w-full max-w-2xl glass-card rounded-[3.5rem] p-12 md:p-16 shadow-3xl animate-slide-up relative overflow-hidden border-primary-500/20">
            
            {/* Thinking / Processing Layer */}
            {researching && (
              <div className="absolute inset-0 bg-brand-surface z-50 flex flex-col items-center justify-center p-12 text-center animate-fade-in">
                <div className="relative mb-16 scale-110">
                   {/* Advanced Neural Thinking Loader */}
                   <div className="w-40 h-40 bg-primary-600/5 rounded-full flex items-center justify-center relative">
                      <div className="absolute inset-0 rounded-full border-[6px] border-primary-600/10" />
                      <div className="absolute inset-0 rounded-full border-[6px] border-primary-600 border-t-transparent animate-spin duration-1000" />
                      <div className="absolute inset-4 rounded-full border-[4px] border-primary-400/20 border-b-transparent animate-spin-reverse duration-[2000ms]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-14 h-14 text-primary-600 animate-pulse" />
                      </div>
                   </div>
                   <div className="absolute -inset-12 bg-primary-600/10 rounded-full blur-3xl animate-pulse" />
                </div>
                
                <h3 className="text-4xl font-display font-bold text-brand-text mb-6">Neural Synthesis in Progress</h3>
                <div className="flex flex-col items-center gap-3">
                   <p className="text-[12px] font-black uppercase tracking-[0.4em] text-primary-500 animate-pulse min-h-[20px]">
                     {thinkingMessages[thinkingStep]}
                   </p>
                   <div className="flex gap-2.5 mt-6">
                     {thinkingMessages.map((_, i) => (
                       <div 
                        key={i} 
                        className={`w-2 h-2 rounded-full transition-all duration-700 ${
                          i === thinkingStep ? 'bg-primary-600 scale-[1.8] shadow-[0_0_12px_rgba(59,130,246,0.8)]' : 'bg-zinc-500/20'
                        }`} 
                       />
                     ))}
                   </div>
                </div>
                <p className="text-brand-muted mt-16 text-base italic font-medium opacity-60 leading-relaxed max-w-xs">
                  Tradmak Intelligence is processing cross-node datasets. High-fidelity synthesis active.
                </p>
              </div>
            )}

            <button 
              onClick={() => { setShowModal(false); setError(null); setUrl(''); }}
              className="absolute top-10 right-10 text-brand-muted hover:text-brand-text transition-all hover:rotate-90 duration-300"
            >
              <X className="w-10 h-10" />
            </button>

            <div className="text-center mb-16">
              <div className="w-24 h-24 bg-primary-600/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-primary-500/20 shadow-2xl relative">
                <Globe className="w-12 h-12 text-primary-600" />
                <div className="absolute inset-0 rounded-[2.5rem] border border-white/10" />
              </div>
              <h2 className="text-5xl font-display font-bold text-brand-text mb-4 tracking-tight">Neural Ingestion</h2>
              <p className="text-[11px] text-brand-muted font-extrabold uppercase tracking-[0.4em] opacity-60">Phase I: Target Identification</p>
            </div>

            <form onSubmit={initiateResearch} className="space-y-10">
              <div className="relative group">
                <label className="block text-[11px] font-black text-brand-muted uppercase tracking-[0.3em] mb-5 ml-4">Target Intelligence URL</label>
                <div className="relative">
                  <Database className="absolute left-8 top-1/2 -translate-y-1/2 w-7 h-7 text-brand-muted group-focus-within:text-primary-600 transition-colors" />
                  <input
                    required
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-zinc-500/5 border-2 border-brand-border rounded-[2.5rem] py-8 pl-20 pr-10 text-brand-text font-bold focus:outline-none focus:border-primary-600/40 focus:ring-4 focus:ring-primary-600/5 transition-all placeholder:text-brand-muted/20 text-xl"
                    placeholder="https://strategic-intel.ai/mission-brief"
                  />
                </div>
              </div>

              {error && (
                <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] flex items-center gap-5 text-rose-500 animate-slide-up">
                  <AlertTriangle className="w-7 h-7 flex-shrink-0" />
                  <span className="text-xs font-black uppercase tracking-widest leading-relaxed">{error}</span>
                </div>
              )}

              <div className="pt-8">
                <button
                  type="submit"
                  disabled={!url.trim() || researching}
                  className="w-full py-7 bg-primary-600 text-white font-black rounded-[2.5rem] hover:bg-primary-500 shadow-3xl shadow-primary-900/50 transition-all flex items-center justify-center gap-5 disabled:opacity-40 text-[14px] uppercase tracking-[0.3em] active:scale-[0.98] group"
                >
                  <Search className="w-6 h-6 group-hover:scale-125 transition-transform" />
                  Execute Deep Research
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-3 transition-transform" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 opacity-30 mt-8">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-muted">Quantum Encryption Protocols Active</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// CSS Injection for reverse spin animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin-reverse {
    from { transform: rotate(0deg); }
    to { transform: rotate(-360deg); }
  }
  .animate-spin-reverse {
    animation: spin-reverse 2s linear infinite;
  }
`;
document.head.appendChild(style);
