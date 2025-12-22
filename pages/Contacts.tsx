
import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  MessageSquare, 
  UserPlus,
  Loader2,
  Tag,
  ArrowRight,
  X,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Contact } from '../types';
import { useStore } from '../store/useStore';
// @ts-ignore
import { useNavigate } from 'react-router-dom';

export const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserTags, setNewUserTags] = useState('');

  const { agent, setActiveConversation } = useStore();
  const navigate = useNavigate();

  const isAdmin = agent?.role === 'admin';

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleIntroduceUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !agent) return;

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        organization_id: agent.organization_id,
        name: newUserName,
        email: newUserEmail,
        phone: newUserPhone,
        tags: newUserTags.split(',').map(t => t.trim()).filter(t => t !== ''),
      })
      .select()
      .single();

    if (!error && data) {
      setShowAddModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserTags('');
      fetchContacts();
    }
  };

  const handleStartSupportSession = async (contactId: string) => {
    if (!agent) return;
    
    const { data: convId, error } = await supabase.rpc('get_or_create_conversation', {
      p_contact_id: contactId,
      p_agent_id: agent.id
    });

    if (!error && convId) {
      setActiveConversation(convId);
      navigate('/conversations');
    }
  };

  const filtered = contacts.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-brand-surface animate-fade-in transition-colors duration-500">
      <header className="p-10 border-b border-brand-border flex justify-between items-end glass-card z-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-primary-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-muted">Operational Directory</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-brand-text mb-2 tracking-tight">Partner Registry</h1>
          <p className="text-brand-muted font-bold text-sm">Audit user profiles and initiate secure engagement sessions.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <input 
              placeholder="Filter database..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-500/5 border border-brand-border rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-brand-text focus:outline-none focus:ring-2 focus:ring-primary-600/20 transition-all placeholder:text-brand-muted/40"
            />
          </div>
          {isAdmin && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-3 px-6 py-3.5 bg-primary-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-900/30"
            >
              <Plus className="w-4 h-4" />
              Introduce Subject
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        {loading && contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-brand-muted">
            <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
            <p className="font-black uppercase tracking-widest text-[10px]">Retrieving User Chain...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto animate-slide-up">
            <div className="w-24 h-24 bg-zinc-500/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-brand-border shadow-2xl">
              <Users className="w-10 h-10 text-brand-muted opacity-30" />
            </div>
            <h3 className="text-2xl font-bold text-brand-text mb-3">Null Results</h3>
            <p className="text-brand-muted leading-relaxed italic">No contact profiles match the current filter parameters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filtered.map(contact => (
              <div 
                key={contact.id} 
                className="glass-card rounded-[2.5rem] p-8 transition-all group relative overflow-hidden shadow-sm hover:border-primary-500/30"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/5 rounded-full -mr-12 -mt-12 blur-3xl group-hover:bg-primary-600/10 transition-colors" />
                
                <div className="flex items-start justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-5">
                    <img 
                      src={contact.avatar_url || `https://ui-avatars.com/api/?name=${contact.name}&background=3b82f6&color=fff`} 
                      className="w-16 h-16 rounded-[1.5rem] object-cover border-2 border-brand-border group-hover:border-primary-600/50 transition-colors shadow-sm"
                      alt={contact.name}
                    />
                    <div>
                      <h4 className="font-bold text-brand-text text-xl leading-tight mb-1.5">{contact.name}</h4>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Authenticated</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-8 relative z-10">
                  <div className="flex items-center gap-4 text-xs font-bold text-brand-muted group-hover:text-brand-text transition-colors">
                    <Mail className="w-4 h-4 text-primary-600/50" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                  {contact.phone && (
                    <div className="flex items-center gap-4 text-xs font-bold text-brand-muted group-hover:text-brand-text transition-colors">
                      <Phone className="w-4 h-4 text-primary-600/50" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5 mb-10 relative z-10 min-h-[28px]">
                  {Array.isArray(contact.tags) && contact.tags.length > 0 ? contact.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-zinc-500/5 border border-brand-border rounded-xl text-[9px] font-black text-primary-600 uppercase tracking-[0.15em]">
                      {tag}
                    </span>
                  )) : (
                    <span className="text-[9px] font-black text-brand-muted uppercase tracking-[0.2em] flex items-center gap-2 opacity-40">
                      <Tag className="w-3.5 h-3.5" />
                      Unclassified
                    </span>
                  )}
                </div>

                <button 
                  onClick={() => handleStartSupportSession(contact.id)}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-zinc-500/5 border border-brand-border rounded-2xl text-[11px] font-black text-brand-muted uppercase tracking-widest hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-all group/btn shadow-sm active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" />
                  Initiate Sync
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-3 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-md glass-card rounded-[3rem] p-10 md:p-12 shadow-3xl animate-slide-up">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-600/10 rounded-2xl flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-primary-500" />
                </div>
                <h2 className="text-3xl font-display font-bold text-brand-text">Introduce Partner</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-brand-muted hover:text-brand-text transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>
            
            <form onSubmit={handleIntroduceUser} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-brand-muted uppercase tracking-[0.25em] mb-3 ml-2">Identity Name</label>
                <input
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-zinc-500/5 border border-brand-border rounded-2xl py-4 px-6 text-brand-text font-bold focus:outline-none focus:ring-2 focus:ring-primary-600/30 transition-all placeholder:text-brand-muted/20"
                  placeholder="Subject Identity"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-brand-muted uppercase tracking-[0.25em] mb-3 ml-2">Communication Email</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-zinc-500/5 border border-brand-border rounded-2xl py-4 px-6 text-brand-text font-bold focus:outline-none focus:ring-2 focus:ring-primary-600/30 transition-all placeholder:text-brand-muted/20"
                  placeholder="identity@tradmak.com"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-brand-muted uppercase tracking-[0.25em] mb-3 ml-2">Direct Phone</label>
                <input
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  className="w-full bg-zinc-500/5 border border-brand-border rounded-2xl py-4 px-6 text-brand-text font-bold focus:outline-none focus:ring-2 focus:ring-primary-600/30 transition-all placeholder:text-brand-muted/20"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="pt-6 flex items-center gap-4 border-t border-brand-border">
                <div className="p-3 bg-emerald-500/10 rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-[10px] text-brand-muted font-bold leading-relaxed uppercase tracking-tight">Encryption protocol active. Data will be indexed for enterprise-grade sync.</p>
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-primary-600 text-white font-black rounded-2xl hover:bg-primary-700 shadow-2xl shadow-primary-900/40 transition-all text-[11px] uppercase tracking-widest active:scale-95"
              >
                Index Partner
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
