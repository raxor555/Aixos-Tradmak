
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Inbox, Search, Mail, User, Clock, CheckCircle, Trash2, Loader2, MessageSquare } from 'lucide-react';

interface Inquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  created_at: string;
}

export const Inquiries: React.FC = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchInquiries = async () => {
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInquiries(data || []);
    } catch (err) {
      console.error('Error fetching inquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();

    // Subscribe to new inquiries
    const subscription = supabase
      .channel('inquiries-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inquiries' }, fetchInquiries)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const filtered = inquiries.filter(i => 
    i.name.toLowerCase().includes(filter.toLowerCase()) || 
    i.email.toLowerCase().includes(filter.toLowerCase()) ||
    i.message.toLowerCase().includes(filter.toLowerCase())
  );

  const resolveInquiry = async (id: string) => {
    await supabase.from('inquiries').update({ status: 'contacted' }).eq('id', id);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-brand-surface animate-fade-in transition-colors duration-500">
      <header className="p-8 border-b border-brand-border flex justify-between items-center glass-card z-10">
        <div>
          <h1 className="text-3xl font-display font-bold text-brand-text mb-1">Customer Inquiries</h1>
          <p className="text-brand-muted font-medium">Manage incoming lead forms and feedback</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
          <input 
            placeholder="Search inquiries..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-zinc-500/5 border border-brand-border rounded-xl py-2.5 pl-12 pr-4 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-primary-600/20 transition-all placeholder:text-brand-muted/50"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-brand-muted">
            <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
            <p className="font-black uppercase tracking-widest text-[10px]">Gathering inquiries...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
            <div className="w-20 h-20 bg-zinc-500/5 rounded-3xl flex items-center justify-center mb-6 border border-brand-border">
              <Inbox className="w-10 h-10 text-brand-muted opacity-40" />
            </div>
            <h3 className="text-xl font-bold text-brand-text mb-2">Inbox is Clear</h3>
            <p className="text-brand-muted">No customer inquiries match your criteria. You're all caught up!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {filtered.map(inquiry => (
              <div 
                key={inquiry.id} 
                className={`glass-card rounded-[2rem] p-8 transition-all group ${
                  inquiry.status === 'contacted' ? 'opacity-60 grayscale-[0.5]' : 'shadow-xl'
                }`}
              >
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-zinc-500/5 rounded-2xl flex items-center justify-center border border-brand-border group-hover:border-primary-500/40 transition-colors">
                      <User className="w-7 h-7 text-primary-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-brand-text text-xl">{inquiry.name}</h4>
                      <div className="flex items-center gap-5 mt-1.5">
                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-muted">
                          <Mail className="w-3.5 h-3.5 text-primary-600" />
                          {inquiry.email}
                        </span>
                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-muted">
                          <Clock className="w-3.5 h-3.5 text-primary-600" />
                          {new Date(inquiry.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${
                    inquiry.status === 'new' 
                      ? 'bg-primary-600/10 text-primary-600 border-primary-500/30' 
                      : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                  }`}>
                    {inquiry.status}
                  </div>
                </div>

                <div className="bg-zinc-500/5 border border-brand-border rounded-[1.5rem] p-6 mb-8 relative">
                  <MessageSquare className="absolute top-4 right-4 w-4 h-4 text-primary-500 opacity-20" />
                  <p className="text-base text-brand-text leading-relaxed font-medium">
                    {inquiry.message}
                  </p>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-brand-border">
                  <button className="p-3 text-brand-muted hover:text-rose-500 transition-colors bg-zinc-500/5 rounded-xl border border-brand-border">
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => resolveInquiry(inquiry.id)}
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-3.5 bg-primary-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-lg shadow-primary-900/30 active:scale-95"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Archive Intelligence
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
