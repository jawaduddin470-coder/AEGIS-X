import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, AlertTriangle, Truck, CheckCircle2, Search,
  Filter, ChevronDown, Play, Pause, RotateCcw, X, BarChart2,
  Activity, Clock, Shield, ArrowUp, ArrowDown
} from 'lucide-react';
import { api } from '../utils/api';
import type { Incident } from '../utils/api';

interface AnalyticsCenterProps {
  onBack: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#E63946',
  High: '#F4A261',
  Medium: '#5DADE2',
  Low: '#2E8B57',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="aegis-chart-tooltip">
        <p className="font-bold text-[#1E3A5F] mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="text-[10px]">
            {p.name}: <strong>{p.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const AnalyticsCenter: React.FC<AnalyticsCenterProps> = ({ onBack }) => {
  const [summary, setSummary] = useState<any>(null);
  const [incidentsByHour, setIncidentsByHour] = useState<any[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<any[]>([]);
  const [resourceUtil, setResourceUtil] = useState<any[]>([]);
  const [riskTrend, setRiskTrend] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  // Historical table state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortKey, setSortKey] = useState<'reported_at' | 'severity' | 'type'>('reported_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Replay drawer
  const [replayIncident, setReplayIncident] = useState<Incident | null>(null);
  const [replayStep, setReplayStep] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const replayRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, byHour, types, rUtil, trend, incs] = await Promise.all([
        api.fetchAnalyticsSummary(),
        api.fetchIncidentsByHour(),
        api.fetchIncidentTypes(),
        api.fetchResourceUtilization(),
        api.fetchRiskTrend(),
        api.fetchIncidents(),
      ]);
      setSummary(sum);
      setIncidentsByHour(byHour);
      setIncidentTypes(types);
      setResourceUtil(rUtil);
      setRiskTrend(trend);
      setIncidents(incs);
    } catch (e) {
      console.error('Analytics load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Replay logic
  useEffect(() => {
    if (replayPlaying && replayIncident?.timeline) {
      replayRef.current = setInterval(() => {
        setReplayStep(prev => {
          if (prev >= (replayIncident.timeline?.length ?? 1) - 1) {
            setReplayPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1200);
    }
    return () => { if (replayRef.current) clearInterval(replayRef.current); };
  }, [replayPlaying, replayIncident]);

  const filteredIncidents = incidents
    .filter(i => {
      const matchSearch = search === '' || i.location_name.toLowerCase().includes(search.toLowerCase()) || i.type.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'All' || i.type === typeFilter;
      const matchSeverity = severityFilter === 'All' || i.severity === severityFilter;
      const matchStatus = statusFilter === 'All' || i.status === statusFilter;
      return matchSearch && matchType && matchSeverity && matchStatus;
    })
    .sort((a, b) => {
      let av: string = '';
      let bv: string = '';
      if (sortKey === 'reported_at') { av = a.reported_at; bv = b.reported_at; }
      else if (sortKey === 'severity') { av = a.severity; bv = b.severity; }
      else { av = a.type; bv = b.type; }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const kpis = [
    { label: 'Total Incidents', value: summary?.total_incidents ?? 0, icon: <AlertTriangle size={18} />, color: 'text-danger', bg: 'bg-danger/10' },
    { label: 'Active Now', value: summary?.active_incidents ?? 0, icon: <Activity size={18} />, color: 'text-[#5DADE2]', bg: 'bg-[#5DADE2]/10' },
    { label: 'Resolution Rate', value: summary ? `${summary.resolution_rate}%` : '—', icon: <CheckCircle2 size={18} />, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Avg Response Time', value: summary ? `${summary.avg_response_time_min}m` : '—', icon: <Clock size={18} />, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Resources Available', value: summary?.resources_available ?? 0, icon: <Truck size={18} />, color: 'text-[#1E3A5F]', bg: 'bg-[#1E3A5F]/10' },
    { label: 'Deployed', value: summary?.resources_deployed ?? 0, icon: <Shield size={18} />, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex flex-col">
      {/* Header */}
      <header className="h-16 glass-card-header glass-card px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#E6EEF5] hover:bg-[#D6EAF8] transition-all">
            <X size={14} className="text-[#1E3A5F]" />
          </button>
          <div className="h-8 w-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center">
            <BarChart2 size={16} className="text-[#1E3A5F]" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-[#1E3A5F] tracking-wider">ANALYTICS CENTER</h1>
            <p className="text-[9px] text-[#64748B] font-medium uppercase tracking-widest">Emergency Intelligence Dashboard</p>
          </div>
        </div>
        <button onClick={loadData} className="flex items-center gap-1.5 text-[10px] font-bold text-[#5DADE2] hover:text-[#1E3A5F] transition-all">
          <RotateCcw size={12} />
          Refresh Data
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((kpi, i) => (
            <div key={i} className={`bg-white border border-[#E6EEF5] rounded-xl p-4 flex flex-col gap-2 shadow-glass-sm hover-elevation animate-fade-in-up delay-${i * 100}`}>
              <div className={`h-8 w-8 rounded-lg ${kpi.bg} flex items-center justify-center ${kpi.color}`}>
                {kpi.icon}
              </div>
              <div className="text-xl font-black text-[#1E3A5F] mt-1">{loading ? '…' : kpi.value}</div>
              <div className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider leading-tight">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Area Chart - Incident Frequency */}
          <div className="lg:col-span-2 bg-white border border-[#E6EEF5] rounded-xl p-5 shadow-glass-sm animate-fade-in-up delay-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-extrabold text-[#1E3A5F] uppercase tracking-wider">Incident Frequency</h3>
                <p className="text-[10px] text-[#64748B] mt-0.5">Last 24 hours — Hyderabad grid</p>
              </div>
              <span className="text-[8px] font-extrabold text-success bg-success/10 px-2 py-0.5 rounded border border-success/20">LIVE</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={incidentsByHour} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5DADE2" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#5DADE2" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="critGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E63946" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#E63946" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF5" />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="incidents" name="Total" stroke="#5DADE2" strokeWidth={2} fill="url(#incGrad)" />
                <Area type="monotone" dataKey="critical" name="Critical" stroke="#E63946" strokeWidth={1.5} fill="url(#critGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart - Incident Types */}
          <div className="bg-white border border-[#E6EEF5] rounded-xl p-5 shadow-glass-sm animate-fade-in-up delay-300">
            <h3 className="text-xs font-extrabold text-[#1E3A5F] uppercase tracking-wider mb-1">Type Distribution</h3>
            <p className="text-[10px] text-[#64748B] mb-4">Incidents by category</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={incidentTypes} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {incidentTypes.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {incidentTypes.slice(0, 4).map((t, i) => (
                <div key={i} className="flex items-center justify-between text-[9px]">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="text-[#64748B] font-medium">{t.name}</span>
                  </div>
                  <span className="font-bold text-[#1E3A5F]">{t.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart - Resource Utilization */}
          <div className="bg-white border border-[#E6EEF5] rounded-xl p-5 shadow-glass-sm animate-fade-in-up delay-300">
            <h3 className="text-xs font-extrabold text-[#1E3A5F] uppercase tracking-wider mb-1">Resource Utilization</h3>
            <p className="text-[10px] text-[#64748B] mb-4">Available vs deployed by type</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={resourceUtil} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF5" />
                <XAxis dataKey="type" tick={{ fontSize: 8, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="available" name="Available" fill="#5DADE2" radius={[3, 3, 0, 0]} />
                <Bar dataKey="deployed" name="Deployed" fill="#1E3A5F" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart - Risk Trend */}
          <div className="bg-white border border-[#E6EEF5] rounded-xl p-5 shadow-glass-sm animate-fade-in-up delay-400">
            <h3 className="text-xs font-extrabold text-[#1E3A5F] uppercase tracking-wider mb-1">Risk Score Trend</h3>
            <p className="text-[10px] text-[#64748B] mb-4">Rolling city risk index — 24h window</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={riskTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF5" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#64748B' }} tickLine={false} axisLine={false} interval={3} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="risk_score" name="Risk Score" stroke="#E63946" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="threshold" name="Threshold" stroke="#F4A261" strokeWidth={1} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historical Incident Table */}
        <div className="bg-white border border-[#E6EEF5] rounded-xl shadow-glass-sm animate-fade-in-up delay-400">
          <div className="p-5 border-b border-[#E6EEF5]">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div>
                <h3 className="text-xs font-extrabold text-[#1E3A5F] uppercase tracking-wider">Historical Incident Archive</h3>
                <p className="text-[10px] text-[#64748B] mt-0.5">{filteredIncidents.length} records — click any row to replay timeline</p>
              </div>
              <div className="flex flex-wrap gap-2 md:ml-auto">
                <div className="relative">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search location / type..."
                    className="pl-7 pr-3 py-1.5 text-[10px] rounded-lg border border-[#E6EEF5] bg-[#F7FAFC] focus:outline-none focus:border-[#5DADE2] w-44"
                  />
                </div>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="text-[10px] rounded-lg border border-[#E6EEF5] bg-[#F7FAFC] px-2 py-1.5 text-[#1E3A5F] font-semibold">
                  <option value="All">All Types</option>
                  {['Fire','Flood','Traffic Accident','Building Collapse','Chemical Leak','Stampede'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="text-[10px] rounded-lg border border-[#E6EEF5] bg-[#F7FAFC] px-2 py-1.5 text-[#1E3A5F] font-semibold">
                  <option value="All">All Severities</option>
                  {['Critical','High','Medium','Low'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-[10px] rounded-lg border border-[#E6EEF5] bg-[#F7FAFC] px-2 py-1.5 text-[#1E3A5F] font-semibold">
                  <option value="All">All Statuses</option>
                  {['Reported','Active','Dispatched','Under Investigation','Resolved'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[#E6EEF5] bg-[#F7FAFC]">
                  {[['#ID','id'],['Type','type'],['Location',null],['Severity','severity'],['Status',null],['Reported','reported_at']].map(([label, key]) => (
                    <th
                      key={label as string}
                      onClick={() => key && toggleSort(key as any)}
                      className={`text-left px-4 py-2.5 font-extrabold text-[#64748B] uppercase tracking-widest text-[8px] ${key ? 'cursor-pointer hover:text-[#1E3A5F]' : ''}`}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        {key && sortKey === key && (sortDir === 'asc' ? <ArrowUp size={8}/> : <ArrowDown size={8}/>)}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.slice(0, 20).map(inc => (
                  <tr
                    key={inc.id}
                    className="border-b border-[#E6EEF5] hover:bg-[#F7FAFC] transition-colors cursor-pointer"
                    onClick={() => { setReplayIncident(inc); setReplayStep(0); setReplayPlaying(false); }}
                  >
                    <td className="px-4 py-2.5 font-mono font-bold text-[#5DADE2]">#{inc.id}</td>
                    <td className="px-4 py-2.5 font-semibold text-[#1E3A5F]">{inc.type}</td>
                    <td className="px-4 py-2.5 text-[#64748B] max-w-[180px] truncate">{inc.location_name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                        inc.severity === 'Critical' ? 'bg-danger/10 text-danger' :
                        inc.severity === 'High' ? 'bg-warning/10 text-warning' :
                        inc.severity === 'Medium' ? 'bg-[#5DADE2]/10 text-[#5DADE2]' : 'bg-success/10 text-success'
                      }`}>{inc.severity}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                        inc.status === 'Resolved' ? 'bg-success/10 text-success' :
                        inc.status === 'Active' ? 'bg-danger/10 text-danger' : 'bg-[#F7FAFC] text-[#64748B] border border-[#E6EEF5]'
                      }`}>{inc.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[#64748B] font-mono">{new Date(inc.reported_at).toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <button className="text-[9px] text-[#5DADE2] font-bold hover:text-[#1E3A5F] flex items-center gap-0.5">
                        <Play size={8}/> Replay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Replay Drawer */}
      {replayIncident && (
        <div className="fixed inset-0 z-40 bg-black/20 flex items-end" onClick={() => setReplayIncident(null)}>
          <div
            className="w-full max-h-[70vh] bg-white rounded-t-2xl shadow-glass-lg p-6 overflow-y-auto animate-fade-in-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#1E3A5F]">Incident #{replayIncident.id} — {replayIncident.type} Timeline Replay</h3>
                <p className="text-[10px] text-[#64748B] mt-0.5">{replayIncident.location_name} • {replayIncident.severity}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setReplayStep(0); setReplayPlaying(true); }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#1E3A5F] text-white text-[10px] font-bold rounded-lg"
                >
                  <RotateCcw size={10}/> Replay
                </button>
                <button
                  onClick={() => setReplayPlaying(p => !p)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-[#E6EEF5] text-[#1E3A5F] text-[10px] font-bold rounded-lg"
                >
                  {replayPlaying ? <Pause size={10}/> : <Play size={10}/>}
                  {replayPlaying ? 'Pause' : 'Play'}
                </button>
                <button onClick={() => setReplayIncident(null)} className="h-7 w-7 flex items-center justify-center rounded-lg border border-[#E6EEF5] hover:bg-[#F7FAFC]">
                  <X size={12} className="text-[#64748B]"/>
                </button>
              </div>
            </div>

            {/* Timeline scrubber */}
            {replayIncident.timeline && replayIncident.timeline.length > 0 ? (
              <>
                <input
                  type="range" min={0} max={replayIncident.timeline.length - 1}
                  value={replayStep}
                  onChange={e => { setReplayStep(parseInt(e.target.value)); setReplayPlaying(false); }}
                  className="w-full accent-[#5DADE2] mb-4"
                />
                <div className="relative pl-5 border-l-2 border-[#E6EEF5] space-y-4">
                  {replayIncident.timeline.slice(0, replayStep + 1).map((evt: any, idx: number) => (
                    <div key={evt.id} className={`relative animate-fade-in ${idx === replayStep ? 'opacity-100' : 'opacity-60'}`}>
                      <div className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white ${
                        evt.status === 'Critical' ? 'bg-danger' :
                        evt.status === 'Success' ? 'bg-success' :
                        evt.status === 'Warning' ? 'bg-warning' : 'bg-[#5DADE2]'
                      }`} />
                      <div className="text-[10px] font-bold text-[#1E3A5F]">{evt.event}</div>
                      <div className="text-[9px] text-[#64748B] mt-0.5 font-mono">{evt.timestamp}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-[11px] text-[#64748B] text-center py-8">No timeline events recorded for this incident.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
