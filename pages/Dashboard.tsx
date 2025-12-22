
import React from 'react';
import { 
  Users, 
  MessageCircle, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { useStore } from '../store/useStore';

const data = [
  { name: 'Mon', value: 42 },
  { name: 'Tue', value: 38 },
  { name: 'Wed', value: 72 },
  { name: 'Thu', value: 54 },
  { name: 'Fri', value: 95 },
  { name: 'Sat', value: 62 },
  { name: 'Sun', value: 78 },
];

const channelData = [
  { name: 'AI Assistant', value: 450, color: '#3b82f6' },
  { name: 'External Bot', value: 320, color: '#8b5cf6' },
  { name: 'WhatsApp', value: 180, color: '#10b981' },
  { name: 'Email Hub', value: 140, color: '#f59e0b' },
];

const StatCard = ({ title, value, icon: Icon, trend, trendValue }: any) => (
  <div className="glass-card p-7 rounded-[2rem] group hover:border-primary-500/40 transition-all duration-500 shadow-sm relative overflow-hidden">
    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary-600/10 transition-colors" />
    <div className="flex justify-between items-start mb-6 relative z-10">
      <div className="p-4 bg-zinc-500/5 rounded-2xl border border-brand-border group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
      </div>
      <div className={`flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
        {trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        {trendValue}
      </div>
    </div>
    <p className="text-brand-muted text-[10px] font-extrabold uppercase tracking-[0.2em] mb-2">{title}</p>
    <h3 className="text-4xl font-display font-bold text-brand-text tracking-tight">{value}</h3>
  </div>
);

const Dashboard: React.FC = () => {
  const { theme } = useStore();
  
  return (
    <div className="flex-1 overflow-y-auto p-10 space-y-10 animate-fade-in custom-scrollbar">
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <LayoutDashboard className="w-5 h-5 text-primary-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-brand-muted">Operational Center</span>
          </div>
          <h1 className="text-5xl font-display font-bold text-brand-text mb-3 tracking-tight">System Performance</h1>
          <p className="text-brand-muted font-bold text-sm tracking-wide">Real-time intelligence auditing for Tradmak enterprise operations.</p>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-3.5 bg-zinc-500/5 border border-brand-border rounded-2xl text-brand-muted text-[10px] font-extrabold uppercase tracking-widest hover:text-brand-text hover:bg-zinc-500/10 transition-all shadow-sm">
            Temporal: 7 Days
          </button>
          <button className="px-7 py-3.5 bg-primary-600 text-white rounded-2xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-900/30 active:scale-95">
            Generate Intelligence
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard title="Active Network" value="3,124" icon={Users} trend="up" trendValue="+14.2%" />
        <StatCard title="Total Comms" value="158" icon={MessageCircle} trend="up" trendValue="+4.8%" />
        <StatCard title="Neural Latency" value="0.8s" icon={Clock} trend="down" trendValue="-22.5%" />
        <StatCard title="Automation" value="96.1%" icon={CheckCircle2} trend="up" trendValue="+3.1%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card rounded-[2.5rem] p-10 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-display font-bold text-brand-text">Flow Dynamics</h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <span className="text-[10px] font-extrabold text-brand-muted uppercase tracking-widest">Inbound Throughput</span>
              </div>
            </div>
          </div>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.05)'} vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" fontSize={10} fontWeight="900" tickLine={false} axisLine={false} tickMargin={15} />
                <YAxis stroke="#64748B" fontSize={10} fontWeight="900" tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.95)', 
                    border: '1px solid rgba(59,130,246,0.2)', 
                    borderRadius: '24px',
                    boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.2)',
                    backdropFilter: 'blur(10px)'
                  }}
                  itemStyle={{ color: theme === 'light' ? '#0F172A' : '#F8FAFD', fontWeight: 'bold', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={5} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-[2.5rem] p-10 shadow-sm flex flex-col">
          <h3 className="text-2xl font-display font-bold text-brand-text mb-10">Neural Sources</h3>
          <div className="flex-1 flex flex-col justify-center">
            <div className="h-64 w-full mb-10">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelData}>
                  <Tooltip 
                    cursor={{fill: 'rgba(59,130,246,0.05)'}}
                    contentStyle={{ 
                      backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.9)', 
                      border: '1px solid rgba(59,130,246,0.1)', 
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}
                  />
                  <Bar dataKey="value" radius={[12, 12, 12, 12]}>
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-6">
              {channelData.map((item) => (
                <div key={item.name} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 rounded-full border-2 border-brand-border transition-transform group-hover:scale-125" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] font-extrabold text-brand-muted uppercase tracking-widest group-hover:text-brand-text transition-colors">{item.name}</span>
                  </div>
                  <span className="text-sm font-black text-brand-text tracking-tight">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
