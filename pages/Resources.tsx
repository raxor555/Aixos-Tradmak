
import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Zap, 
  Loader2, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  Fingerprint,
  MonitorPlay,
  Factory,
  UserCheck,
  CircleDollarSign,
  SearchCode
} from 'lucide-react';
// @ts-ignore
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useStore } from '../store/useStore';

interface Resource {
  id: string;
  key: string;
  name: string;
  description: string;
  knowledge_content: string;
  is_unlocked?: boolean;
}

const ICON_MAP: Record<string, any> = {
  'marketing': MonitorPlay,
  'manufacturing': Factory,
  'hr': UserCheck,
  'finance': CircleDollarSign,
  'market-research': SearchCode
};

export const ResourcesPage: React.FC = () => {
  const { agent } = useStore();
  const [searchParams] = useSearchParams();
  const targetNode = searchParams.get('node');
  
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = async () => {
    if (!agent) return;
    setLoading(true);
    
    // Fetch all resources
    const { data: allResources } = await supabase.from('resources').select('*');
    
    // Fetch unlocked resources for this agent
    const { data: unlockedData } = await supabase
      .from('unlocked_resources')
      .select('resource_id')
      .eq('agent_id', agent.id);

    const unlockedIds = new Set((unlockedData || []).map(d => d.resource_id));

    if (allResources) {
      setResources(allResources.map(r => ({
        ...r,
        is_unlocked: unlockedIds.has(r.id)
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResources();
  }, [agent]);

  const handleUnlock = async () => {
    if (!selectedResource || pin.length !== 6 || !agent) return;
    
    setVerifying(true);
    setError(null);

    try {
      // Check PIN in DB
      const { data, error: fetchError } = await supabase
        .from('resources')
        .select('id')
        .eq('id', selectedResource.id)
        .eq('pin', pin)
        .single();

      if (fetchError || !data) {
        throw new Error("Invalid Security PIN. Node lockdown active.");
      }

      // Record unlock
      const { error: unlockError } = await supabase
        .from('unlocked_resources')
        .upsert({
          agent_id: agent.id,
          resource_id: selectedResource.id
        });

      if (unlockError) throw unlockError;

      setSelectedResource(null);
      setPin('');
      fetchResources();
    } catch (err: any) {
      setError(err.message);
      setPin('');
    } finally {
      setVerifying(false);
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 animate-fade-in bg-brand-surface custom-scrollbar">
      <header>
        <div className="flex items-center gap-3 mb-3">
          <Database className="w-5 h-5 text-primary-500" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-brand-muted">Neural Knowledge Nodes</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-brand-text mb-2 tracking-tight">Tactical Vault</h1>
        <p className="text-brand-muted font-bold text-sm max-w-2xl leading-relaxed">
          Authorize access to domain-specific intelligence modules to augment your AI agent's cognitive layer.
        </p>
      </header>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {resources.map((resource) => {
            const IconComp = ICON_MAP[resource.key] || Lock;
            const isTargeted = targetNode === resource.key;

            return (
              <div 
                key={resource.id}
                className={`glass-card rounded-[2.5rem] p-8 flex flex-col transition-all duration-500 relative overflow-hidden ${
                  resource.is_unlocked ? 'border-emerald-500/30 ring-1 ring-emerald-500/20' : 'hover:border-primary-500/30'
                } ${isTargeted ? 'ring-2 ring-primary-500 shadow-2xl scale-[1.02]' : ''}`}
              >
                {resource.is_unlocked && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-12 -mt-12" />
                )}
                
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className={`p-4 rounded-2xl border ${
                    resource.is_unlocked ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-zinc-500/5 border-brand-border text-primary-600'
                  }`}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    resource.is_unlocked ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-rose-500/10 border-rose-500/30 text-rose-600'
                  }`}>
                    {resource.is_unlocked ? 'Node Active' : 'Encrypted'}
                  </div>
                </div>

                <h3 className="text-2xl font-display font-bold text-brand-text mb-3">{resource.name}</h3>
                <p className="text-brand-muted text-sm font-medium leading-relaxed mb-8 flex-1 opacity-70">
                  {resource.description}
                </p>

                <button
                  disabled={resource.is_unlocked}
                  onClick={() => setSelectedResource(resource)}
                  className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                    resource.is_unlocked 
                      ? 'bg-emerald-500/10 text-emerald-600 cursor-default' 
                      : 'bg-primary-600 text-white hover:bg-primary-500 shadow-xl shadow-primary-900/30 active:scale-95'
                  }`}
                >
                  {resource.is_unlocked ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Neural Link Established
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      Bypass Security
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* PIN Modal */}
      {selectedResource && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-md glass-card rounded-[3rem] p-10 shadow-3xl animate-slide-up relative border-primary-500/20">
            <button 
              onClick={() => { setSelectedResource(null); setPin(''); setError(null); }}
              className="absolute top-8 right-8 text-brand-muted hover:text-brand-text transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-primary-600/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-primary-500/20">
                <ShieldCheck className="w-10 h-10 text-primary-600" />
              </div>
              <h2 className="text-2xl font-display font-bold text-brand-text">Authorize Neural Key</h2>
              <p className="text-[10px] text-brand-muted font-extrabold uppercase tracking-widest mt-2">Resource: {selectedResource.name}</p>
            </div>

            <div className="flex justify-center gap-3 mb-10">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-10 h-14 md:w-12 md:h-16 rounded-2xl border-2 flex items-center justify-center transition-all ${
                    pin.length > i ? 'border-primary-600 bg-primary-600/10' : 'border-brand-border bg-zinc-500/5'
                  }`}
                >
                  {pin.length > i && <div className="w-2.5 h-2.5 rounded-full bg-primary-600 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-8 p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-600 animate-slide-up">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest leading-tight">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 mb-8">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0].map((n, i) => (
                n !== '' ? (
                  <button
                    key={i}
                    onClick={() => handlePinInput(n.toString())}
                    className="h-16 rounded-2xl bg-zinc-500/5 border border-brand-border text-lg font-bold text-brand-text hover:bg-zinc-500/10 hover:border-primary-500/30 transition-all active:scale-95"
                  >
                    {n}
                  </button>
                ) : <div key={i} />
              ))}
              <button 
                onClick={() => setPin(prev => prev.slice(0, -1))}
                className="h-16 rounded-2xl bg-zinc-500/5 border border-brand-border text-xs font-black uppercase text-brand-muted hover:text-rose-500 transition-all active:scale-95"
              >
                DEL
              </button>
            </div>

            <button
              onClick={handleUnlock}
              disabled={pin.length !== 6 || verifying}
              className="w-full py-5 bg-primary-600 text-white font-black rounded-2xl hover:bg-primary-500 shadow-2xl shadow-primary-900/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-[11px] uppercase tracking-[0.2em]"
            >
              {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              Execute Handshake
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
