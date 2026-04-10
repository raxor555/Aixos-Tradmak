import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useStore } from '../store/useStore';
import { 
  Zap, 
  Send, 
  Bot, 
  User, 
  TrendingUp, 
  ShoppingCart, 
  Calendar, 
  Activity, 
  Loader2, 
  AlertCircle,
  FileText,
  Search,
  Filter,
  Download,
  Clock,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  X
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  created_at: string;
}

export const TradmakDemoPage: React.FC = () => {
  const { agent } = useStore();
  const [data, setData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'inquiries' | 'today' | 'assistant'>('overview');
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ order: '', amount: '' });
  const [updating, setUpdating] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, activeTab]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const { data: records, error: fetchError } = await supabase
        .from('electrical_chatbot_conversation')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setData(records || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Data retrieval failed. Please check Supabase connection.');
    } finally {
      setLoadingData(false);
    }
  };

  const parseConversation = (conv: string) => {
    if (!conv) return [];
    // Basic parser for "User: text\nBot: text" or similar formats
    const lines = conv.split('\n');
    return lines.map(line => {
      const match = line.match(/^(User|Bot|Assistant|AI|Operator):\s*(.*)/i);
      if (match) {
        return {
          role: match[1].toLowerCase() === 'user' ? 'user' : 'ai',
          content: match[2].trim()
        };
      }
      return { role: 'ai', content: line.trim() };
    }).filter(msg => msg.content);
  };

  const handleUpdateOrder = async () => {
    if (!selectedInquiry) return;
    setUpdating(true);
    try {
      const payload = {
        ...selectedInquiry,
        updated_order: editForm.order,
        modified_at: new Date().toISOString()
      };

      const response = await fetch('https://n8n.srv1040836.hstgr.cloud/webhook/updated-changes-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Webhook rejected update');
      
      // Update local state to reflect UI change (optional but good for UX)
      setData(prev => prev.map(item => 
        item.id === selectedInquiry.id 
          ? { ...item, order: editForm.order, total_amount: parseFloat(editForm.amount) } 
          : item
      ));
      
      setIsEditing(false);
      setSelectedInquiry((prev: any) => ({ ...prev, order: editForm.order, total_amount: parseFloat(editForm.amount) }));
      
      // Refresh data
      fetchData();
    } catch (err) {
      console.error('Update error:', err);
      setError('Failed to sync modifications to server.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    return data.filter(r => 
      r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.number?.includes(searchQuery) ||
      r.order?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecords = data.filter(r => r.created_at?.startsWith(todayStr));
    const orders = data.filter(r => r.order && r.order.trim().length > 0);
    const totalRevenue = data.reduce((sum, r) => {
      const amt = parseFloat(r.total_amount);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);

    const inqByDate: Record<string, number> = {};
    data.forEach(r => {
      if (!r.created_at) return;
      const d = r.created_at.split('T')[0];
      inqByDate[d] = (inqByDate[d] || 0) + 1;
    });

    const chartData = Object.keys(inqByDate)
      .sort()
      .slice(-14)
      .map(date => ({ date, inquiries: inqByDate[date] }));

    return {
      total: data.length,
      today: todayRecords.length,
      orders: orders.length,
      totalRevenue,
      todayRecords,
      chartData
    };
  }, [data]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isTyping) return;

    setInput('');
    setIsTyping(true);
    setError(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Always fetch fresh data so Gemini has the latest records
      const { data: freshRecords } = await supabase
        .from('electrical_chatbot_conversation')
        .select('*')
        .order('created_at', { ascending: false });

      const records = freshRecords || data;

      // Build a structured, comprehensive data context
      const todayStr = new Date().toISOString().split('T')[0];
      const todayCount = records.filter((r: any) => r.created_at?.startsWith(todayStr)).length;
      const ordersCount = records.filter((r: any) => r.order && r.order.trim()).length;
      const totalRev = records.reduce((s: number, r: any) => s + (parseFloat(r.total_amount) || 0), 0);

      // Compress records to minimise token usage — use short keys, no whitespace
      const allRecords = records.slice(0, 150).map((r: any) => ({
        id: r.Unique_id || r.session_id,
        n: r.name || '',
        ph: r.number || '',
        em: r.user_email || '',
        ord: r.order || '',
        amt: r.total_amount ?? '',
        dt: r.created_at ? r.created_at.split('T')[0] : '',
        conv: r.conversation ? r.conversation.substring(0, 120) : '',
      }));

      const systemPrompt = `You are the Tradmak Electrical Intelligence Assistant. Answer ONLY using the DATABASE_RECORDS below — never use external knowledge.

Field key: id=unique_id, n=name, ph=phone, em=email, ord=order_details, amt=total_amount, dt=date, conv=conversation_excerpt

RULES:
- Filter on amt for numeric queries (e.g. "less than 4" → find rows where amt<4).
- List results as a Markdown table (| col | col |) when showing multiple rows.
- No ** bold, no # headers.
- If data is absent, say "Not found in Tradmak Electrical database."

SUMMARY: total=${records.length}, today(${todayStr})=${todayCount}, with_orders=${ordersCount}, revenue_sum=${totalRev.toFixed(2)}

RECORDS:
${JSON.stringify(allRecords)}`;

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured. Please add it to your Replit Secrets.');
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `Question: ${text}`,
        config: { systemInstruction: systemPrompt },
      });

      let reply = response.text || 'No data found matching your query.';
      // Strip any residual markdown bold/header symbols
      reply = reply.replace(/\*\*/g, '').replace(/^#+\s/gm, '');

      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: reply,
        created_at: new Date().toISOString(),
      }]);
    } catch (err: any) {
      console.error('[ElectricalAI] Error:', err);
      setError(err.message || 'Intelligence core timeout. Please retry.');
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessageContent = (content: string) => {
    if (content.includes('[SUCCESS_ANIMATION]')) {
      const parts = content.split('[SUCCESS_ANIMATION]');
      return (
        <div>
          {parts[0]}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '20px 0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
              <path d="M22 2L11 13" style={{ strokeDasharray: 20, strokeDashoffset: 20, animation: 'draw 0.5s 0.3s forwards' }} />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: 'draw 0.8s 0.1s forwards' }} />
            </svg>
            <p style={{ color: '#10b981', fontWeight: 600, marginTop: '15px', opacity: 0, animation: 'fadeUp 0.4s 0.8s forwards' }}>Email Sent Successfully!</p>
            <style>
              {`
                @keyframes popIn { 0% { transform: scale(0); } 100% { transform: scale(1); } }
                @keyframes draw { to { stroke-dashoffset: 0; } }
                @keyframes fadeUp { to { opacity: 1; transform: translateY(-5px); } }
              `}
            </style>
          </div>
          <p className="mt-2 text-sm text-zinc-800 text-center">The supplier has been contacted successfully!</p>
          {parts[1]}
        </div>
      );
    }

    if (!content.includes('|')) return <div className="text-sm leading-relaxed whitespace-pre-wrap">{content}</div>;

    const lines = content.split('\n');
    const parts: React.ReactNode[] = [];
    let currentTable: string[][] = [];
    let inTable = false;

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim());
        if (cells.every(c => /^[:\-\s]+$/.test(c))) return;
        inTable = true;
        currentTable.push(cells);
      } else {
        if (inTable && currentTable.length > 0) {
          parts.push(
            <div key={`tbl-${i}`} className="my-4 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50/50">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-100/50 border-b border-zinc-200">
                    {currentTable[0].map((c, ci) => <th key={ci} className="px-4 py-3 font-semibold text-zinc-900">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {currentTable.slice(1).map((row, ri) => (
                    <tr key={ri} className="border-b border-zinc-100 last:border-0 hover:bg-white transition-colors">
                      {row.map((c, ci) => <td key={ci} className="px-4 py-2.5 text-zinc-700">{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          currentTable = [];
          inTable = false;
        }
        if (trimmed) parts.push(<p key={i} className="mb-3 text-sm leading-relaxed text-zinc-800">{line}</p>);
      }
    });

    if (inTable && currentTable.length > 0) {
      parts.push(
        <div key="tbl-end" className="my-4 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50/50">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-zinc-100/50 border-b border-zinc-200">
                {currentTable[0].map((c, ci) => <th key={ci} className="px-4 py-3 font-semibold text-zinc-900">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {currentTable.slice(1).map((row, ri) => (
                <tr key={ri} className="border-b border-zinc-100 last:border-0 hover:bg-white transition-colors">
                  {row.map((c, ci) => <td key={ci} className="px-4 py-2.5 text-zinc-700">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return <div>{parts}</div>;
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-zinc-900 font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="px-8 py-5 bg-white border-b border-zinc-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/10">
              <Zap className="w-5 h-5 text-white fill-current" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-900 flex items-center gap-2">
                Tradmak Electrical <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Dashboard</span>
              </h1>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Performance Intelligence & Management</p>
            </div>
          </div>
          <div className="flex gap-2">
             <button onClick={fetchData} className="p-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 rounded-lg transition-all border border-zinc-200/50">
                <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin text-blue-600' : ''}`} />
             </button>
             <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-xs font-bold shadow-md shadow-blue-600/10 active:scale-95">
                <Download className="w-4 h-4" /> Export Data
             </button>
          </div>
        </div>
      </header>

      {/* TABS */}
      <nav className="px-8 py-4 bg-white border-b border-zinc-100">
        <div className="max-w-[1400px] mx-auto flex items-center gap-1">
          {[
            { id: 'overview', icon: Activity, label: 'Analytics' },
            { id: 'inquiries', icon: FileText, label: 'Inquiry Log' },
            { id: 'today', icon: Clock, label: 'Today Signals' },
            { id: 'assistant', icon: MessageSquare, label: 'AI Assistant' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 active:scale-95' 
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
        <div className="max-w-[1400px] mx-auto space-y-8 pb-10">
          
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Inquiries', value: stats.total, icon: Activity, color: 'blue' },
                  { label: "Today's Inquiries", value: stats.today, icon: Calendar, color: 'emerald' },
                  { label: 'Orders Placed', value: stats.orders, icon: ShoppingCart, color: 'orange' },
                  { label: 'Total Revenue', value: `$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, color: 'indigo' }
                ].map((s, i) => (
                  <div key={i} className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-4">
                       <div className={`p-2.5 rounded-xl bg-zinc-50 text-zinc-900 border border-zinc-200`}>
                          <s.icon className={`w-5 h-5 text-${s.color}-600`} />
                       </div>
                    </div>
                    <h4 className="text-3xl font-bold tracking-tight text-zinc-900">{loadingData ? '...' : s.value}</h4>
                    <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mt-1.5">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
                   <h2 className="text-base font-bold text-zinc-900 mb-8 flex items-center gap-2">
                     <TrendingUp className="w-5 h-5 text-blue-600" /> Pipeline Growth Metrics
                   </h2>
                   <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => v.split('-').slice(1).join('/')} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)' }} />
                          <Area type="monotone" dataKey="inquiries" stroke="#2563eb" strokeWidth={3} fill="url(#colorBlue)" animationDuration={1000} />
                        </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm flex flex-col h-full">
                  <h3 className="text-sm font-bold text-zinc-900 mb-6 flex items-center justify-between">
                    Live Record Stream <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest bg-zinc-50 px-2 py-1 rounded">Real-time</span>
                  </h3>
                  <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {data.slice(0, 15).map((r, i) => (
                      <div key={i} className="flex gap-4 p-4 rounded-2xl bg-zinc-50 hover:bg-white border border-transparent hover:border-zinc-200 transition-all cursor-default">
                        <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex-shrink-0 flex items-center justify-center font-bold text-xs text-zinc-600 shadow-sm">
                          {r.name?.[0] || 'S'}
                        </div>
                        <div className="min-w-0 flex-1">
                           <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-zinc-900 truncate">{r.name || 'Anonymous'}</p>
                              <span className="text-[10px] text-zinc-400 font-medium">{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                           </div>
                           <p className="text-[11px] text-zinc-500 truncate mt-1">Ref ID: {r.Unique_id?.substring(0, 8)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeTab === 'inquiries' || activeTab === 'today') && (
            <div className="bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden animate-slide-up">
              <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900">
                    {activeTab === 'inquiries' ? 'Complete Inquiry Repository' : 'Direct Signal: Today Leads'}
                  </h2>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Filter records..." 
                      className="bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-700 focus:outline-none focus:border-blue-500/30 w-64" 
                    />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 text-[10px] uppercase tracking-widest font-bold text-zinc-500 border-b border-zinc-100">
                      <th className="px-8 py-4">Lead Information</th>
                      <th className="px-8 py-4">Inquiry Content</th>
                      <th className="px-8 py-4 text-center">Status Magnitude</th>
                      <th className="px-8 py-4 text-right">Registered At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeTab === 'inquiries' ? filteredData : stats.todayRecords).map((r, i) => (
                      <tr 
                        key={i} 
                        onClick={() => { setSelectedInquiry(r); setIsModalOpen(true); }}
                        className="hover:bg-zinc-50 border-b border-zinc-100 last:border-0 cursor-pointer active:bg-zinc-100 transition-all group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                              {r.name?.[0] || 'L'}
                            </div>
                             <div className="flex flex-col gap-1">
                               <p className="text-sm font-bold text-zinc-900 group-hover:text-blue-600 transition-colors">{r.name || 'Anonymous'}</p>
                               <div className="flex items-center gap-2">
                                 <p className="text-[11px] text-zinc-400 font-medium">{r.number || r.Unique_id?.substring(0, 10)}</p>
                                 {r.pdf_url && (
                                   <div className="flex items-center gap-1 bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border border-red-100">
                                      <FileText className="w-2.5 h-2.5" /> PDF
                                   </div>
                                 )}
                               </div>
                             </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="max-w-md">
                             <p className="text-xs text-zinc-600 leading-relaxed truncate-2-lines">{r.order || 'Initial pipeline interaction recorded.'}</p>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                           <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black tracking-tight ${r.total_amount ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-zinc-100 text-zinc-500 border border-zinc-200'}`}>
                             {r.total_amount ? `$${r.total_amount.toLocaleString()}` : 'AUDITING'}
                           </span>
                        </td>
                        <td className="px-8 py-5 text-right font-medium text-[10px] text-zinc-500 uppercase tracking-wider">
                           {new Date(r.created_at).toLocaleDateString()} <br/>
                           <span className="text-zinc-400 font-normal">{new Date(r.created_at).toLocaleTimeString()}</span>
                        </td>
                      </tr>
                    ))}
                    {(activeTab === 'today' && stats.today === 0) && (
                      <tr><td colSpan={4} className="px-8 py-20 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">No Signals Recorded Today</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'assistant' && (
            <div className="bg-white border border-zinc-200 rounded-[2.5rem] shadow-sm h-[700px] flex overflow-hidden animate-slide-up bg-white">
               {/* Left Sidebar */}
               <div className="w-72 border-r border-zinc-100 bg-zinc-50/50 p-8 hidden lg:flex flex-col">
                  <div className="flex items-center gap-3 mb-10">
                     <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/10">
                        <Bot className="w-5 h-5 text-white" />
                     </div>
                     <div>
                        <h3 className="font-bold text-zinc-900 leading-tight">AI Assistant</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Connected</p>
                     </div>
                  </div>
                  <div className="space-y-6">
                     <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Core Functions</p>
                        <ul className="space-y-3">
                           {[
                             'Data Auditing',
                             'Record Summary',
                             'Tabular Reporting',
                             'Pattern ID'
                           ].map((item, i) => (
                             <li key={i} className="flex items-center gap-2 text-xs font-bold text-zinc-600 bg-white border border-zinc-200/50 p-3 rounded-xl shadow-sm">
                               <div className="w-1 h-1 rounded-full bg-blue-500" /> {item}
                             </li>
                           ))}
                        </ul>
                     </div>
                  </div>
                  <div className="mt-auto p-4 bg-blue-50 rounded-2xl border border-blue-100/50">
                     <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Knowledge Engine</p>
                     <p className="text-[11px] text-blue-900 leading-relaxed">Ask anything about inquiry volume, specific leads, or historical trends.</p>
                  </div>
               </div>

               {/* Chat Panel */}
               <div className="flex-1 flex flex-col relative bg-white">
                  <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                     <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                       <MessageSquare className="w-4 h-4 text-blue-600" /> Internal Signal Direct Interface
                     </h3>
                     <button onClick={() => setMessages([])} className="text-[10px] font-bold uppercase text-zinc-400 hover:text-red-500 transition-colors">Clear Stream</button>
                  </div>
                  
                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar">
                     {messages.length === 0 && (
                       <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                          <Bot className="w-20 h-20 text-blue-600/20 mb-4" />
                          <h4 className="text-lg font-bold text-zinc-900">Awaiting Commands</h4>
                          <p className="text-xs font-medium max-w-xs mt-2 text-zinc-500">I am synchronized with the Tradmak Electrical database. How can I assist with data analysis today?</p>
                       </div>
                     )}
                     {messages.map(msg => (
                       <div key={msg.id} className={`flex gap-6 ${msg.role === 'ai' ? 'items-start font-medium text-zinc-800' : 'items-start flex-row-reverse font-bold text-zinc-900 animate-slide-up'}`}>
                          <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center border shadow-md transition-transform ${
                            msg.role === 'ai' 
                              ? 'bg-blue-600 text-white border-blue-700' 
                              : 'bg-white text-zinc-700 border-zinc-200'
                          }`}>
                             {msg.role === 'ai' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                          </div>
                          <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'ai' ? 'items-start' : 'items-end'}`}>
                             <div className={`px-6 py-4 rounded-[2rem] border shadow-sm ${
                               msg.role === 'ai' 
                                 ? 'bg-zinc-50 border-zinc-200 text-zinc-900 rounded-tl-none' 
                                 : 'bg-blue-600 text-white border-blue-700 rounded-tr-none'
                             }`}>
                                {renderMessageContent(msg.content)}
                             </div>
                             <span className="text-[9px] font-black text-zinc-400 tracking-[0.2em] uppercase px-4">
                                {msg.role === 'ai' ? 'Gemini AIXOS' : (agent?.name || 'Operator')} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </span>
                          </div>
                       </div>
                     ))}
                     {isTyping && (
                       <div className="flex gap-6 items-start">
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm"><Bot className="w-5 h-5 animate-pulse" /></div>
                          <div className="px-6 py-4 rounded-3xl bg-zinc-50 border border-zinc-200 rounded-tl-none shadow-sm">
                             <div className="flex gap-1.5 pt-1">
                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce delay-100" />
                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce delay-200" />
                             </div>
                          </div>
                       </div>
                     )}
                  </div>

                  <div className="p-6 border-t border-zinc-100 bg-white">
                     {error && (
                       <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold animate-shake shadow-sm">
                          <AlertCircle className="w-4 h-4" /> {error}
                       </div>
                     )}
                     <form onSubmit={handleSendMessage} className="flex gap-4 items-end">
                        <div className="relative flex-1">
                           <textarea 
                             value={input}
                             onChange={e => setInput(e.target.value)}
                             onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                   e.preventDefault();
                                   handleSendMessage();
                                }
                             }}
                             disabled={isTyping}
                             placeholder="Search signals, audit volume, or summarize records..." 
                             className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-6 py-4 text-sm font-semibold text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-inner resize-none h-14 max-h-32" 
                           />
                        </div>
                        <button 
                          type="submit" 
                          disabled={!input.trim() || isTyping}
                          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white rounded-2xl flex items-center justify-center transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex-shrink-0"
                        >
                           {isTyping ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6 ml-0.5" />}
                        </button>
                     </form>
                  </div>
               </div>
            </div>
          )}

        </div>
      </main>

      {/* INQUIRY DETAIL MODAL */}
      {isModalOpen && selectedInquiry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-fade-in">
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white border border-zinc-200 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up">
            <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                     <FileText className="w-6 h-6" />
                  </div>
                  <div>
                     <h3 className="font-bold text-lg text-zinc-900">{selectedInquiry.name || 'Anonymous Lead'}</h3>
                     <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{selectedInquiry.number || 'No Contact ID'}</p>
                  </div>
               </div>
               <button 
                 onClick={() => setIsModalOpen(false)}
                 className="w-10 h-10 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-all"
               >
                  <X className="w-5 h-5" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-white">
                {isEditing ? (
                  <div className="space-y-6 animate-fade-in">
                     <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-3xl space-y-4">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Modified Inquiry Information</label>
                        <textarea 
                           value={editForm.order}
                           onChange={e => setEditForm(prev => ({ ...prev, order: e.target.value }))}
                           className="w-full bg-white border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-blue-600/50 min-h-[120px]"
                           placeholder="Update order details..."
                        />
                        <div className="flex items-center gap-4">
                           <button 
                             onClick={handleUpdateOrder}
                             disabled={updating}
                             className="px-10 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2"
                           >
                              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Changes'}
                           </button>
                           <button 
                             onClick={() => setIsEditing(false)}
                             className="px-6 py-3 bg-zinc-200 text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-300 transition-all"
                           >
                              Cancel
                           </button>
                        </div>
                     </div>
                  </div>
                ) : (
                  parseConversation(selectedInquiry.conversation).length > 0 ? (
                    parseConversation(selectedInquiry.conversation).map((msg: any, idx: number) => (
                      <div key={idx} className={`flex gap-4 ${msg.role === 'ai' ? 'items-start' : 'flex-row-reverse items-start'}`}>
                         <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center border shadow-sm ${
                           msg.role === 'ai' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-zinc-700 border-zinc-200'
                         }`}>
                            {msg.role === 'ai' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                         </div>
                         <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === 'ai' ? 'items-start' : 'items-end'}`}>
                            <div className={`px-5 py-3.5 rounded-2xl border shadow-sm text-sm leading-relaxed ${
                              msg.role === 'ai' 
                                ? 'bg-zinc-50 border-zinc-200 text-zinc-800 rounded-tl-none' 
                                : 'bg-blue-600 text-white border-blue-700 rounded-tr-none'
                            }`}>
                               {msg.content}
                            </div>
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-2">
                              {msg.role === 'ai' ? 'Tradmak AI' : 'Inquirer'}
                            </span>
                         </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                       <MessageSquare className="w-16 h-16 text-zinc-300 mb-4" />
                       <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">No detailed transcript available</p>
                       <p className="text-xs text-zinc-400 mt-2">Initial order: {selectedInquiry.order}</p>
                    </div>
                  )
                )}
            </div>

            <div className="px-8 py-5 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
               <div className="flex items-center gap-6">
                  {selectedInquiry.pdf_url && (
                    <div className="flex items-center gap-2">
                      <a 
                        href={selectedInquiry.pdf_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-red-50 hover:bg-red-100 border border-red-100 rounded-2xl transition-all group/pdf"
                        onClick={(e) => e.stopPropagation()}
                      >
                         <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/10 group-hover/pdf:scale-110 transition-transform">
                            <FileText className="w-5 h-5" />
                         </div>
                         <div className="pr-2">
                            <p className="text-[9px] font-black text-red-600 uppercase tracking-widest leading-none mb-1">Attached Document</p>
                            <p className="text-xs font-bold text-red-900">Signed PDF File</p>
                         </div>
                      </a>
                      <button 
                         onClick={() => {
                            setIsEditing(true);
                            setEditForm({ order: selectedInquiry.order || '', amount: selectedInquiry.total_amount || '' });
                         }}
                         className="h-16 px-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl flex flex-col items-center justify-center gap-1 transition-all group"
                      >
                         <Activity className="w-4 h-4 group-hover:scale-110 transition-transform" />
                         <span className="text-[9px] font-black uppercase tracking-[0.2em]">Edit</span>
                      </button>
                    </div>
                  )}
                  <div className="w-px h-8 bg-zinc-200" />
                  <div>
                     <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Reference Magnitude</p>
                     <p className="text-sm font-bold text-zinc-900">{selectedInquiry.total_amount ? `$${selectedInquiry.total_amount.toLocaleString()}` : 'Audit Pending'}</p>
                  </div>
                  <div className="w-px h-8 bg-zinc-200" />
                  <div>
                     <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Session Identity</p>
                     <p className="text-sm font-bold text-blue-600 uppercase tracking-tight">{selectedInquiry.Unique_id?.substring(0, 12)}</p>
                  </div>
               </div>
               <button 
                 onClick={() => setIsModalOpen(false)}
                 className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10 active:scale-95"
               >
                 Close Auditor
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
