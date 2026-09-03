import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });
const label = (value) => (value || 'Pending').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export default function AgentActivity() {
  const [cases, setCases] = useState([]);
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({ agent: 'all', action: 'all', outcome: 'all', confidence: 'all', policy: 'all', date: 'all' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/recovery/cases'), api.get('/recovery/audit-ledger')])
      .then(([caseResponse, logResponse]) => { setCases(caseResponse.data.data || []); setLogs(logResponse.data.data || []); })
      .catch(() => setError('Could not load AI agent activity from PostgreSQL.'))
      .finally(() => setLoading(false));
  }, []);

  const activities = useMemo(() => logs.map((log) => ({ ...log, action: log.event_type, outcome: log.event_type.includes('rejected') || log.event_type.includes('failed') ? 'Blocked / Failed' : log.event_type.includes('succeeded') ? 'Successful' : 'Recorded', policy: log.event_type.includes('policy_approved') ? 'Approved' : log.event_type.includes('policy_rejected') ? 'Blocked' : 'Not evaluated', confidence: 'Unavailable' })), [logs]);
  const filtered = activities.filter((item) => (filters.action === 'all' || item.action === filters.action) && (filters.outcome === 'all' || item.outcome === filters.outcome) && (filters.policy === 'all' || item.policy === filters.policy) && (filters.confidence === 'all' || filters.confidence === 'Unavailable') && (filters.date === 'all' || item.created_at?.slice(0, 10) === filters.date));
  const today = new Date().toISOString().slice(0, 10);
  const metrics = { activeAgents: cases.length ? 1 : 0, decisions: logs.filter((item) => item.created_at?.slice(0, 10) === today).length, successful: logs.filter((item) => item.event_type === 'recovery_succeeded').length, escalations: cases.filter((item) => item.status === 'escalated').length, blocks: logs.filter((item) => item.event_type === 'policy_rejected').length };
  const performance = [{ name: 'Decisions', value: logs.length }, { name: 'Successful', value: metrics.successful }, { name: 'Escalations', value: metrics.escalations }, { name: 'Policy blocks', value: metrics.blocks }];
  const actions = [...new Set(activities.map((item) => item.action))];
  const dates = [...new Set(activities.map((item) => item.created_at?.slice(0, 10)).filter(Boolean))];
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <section className="page-surface min-h-screen bg-slate-50 p-5 text-slate-800 sm:p-7">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">Operations telemetry</p><h1 className="mt-2 text-2xl font-semibold text-slate-900">AI Agent Activity</h1><p className="mt-1 text-sm text-slate-500">Monitor AI decisions, actions, confidence and policy enforcement.</p></div><span className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Live data</span></div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{[['Active Agents', metrics.activeAgents], ['Decisions Today', metrics.decisions], ['Successful Actions', metrics.successful], ['Average Confidence', 'Unavailable'], ['Escalations', metrics.escalations], ['Policy Blocks', metrics.blocks]].map(([title, value]) => <div key={title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] uppercase tracking-wide text-slate-500">{title}</p><p className="mt-2 text-xl font-semibold text-slate-900">{value}</p></div>)}</div>
        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]"><section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Live activity timeline</h2><p className="mt-1 text-xs text-slate-500">AI and policy events recorded from recovery workflows.</p></div><span className="text-xs text-slate-400">{filtered.length} events</span></div><div className="mt-4 flex flex-wrap gap-2">{[['agent', ['AI Recovery Agent']], ['action', actions], ['outcome', ['Successful', 'Recorded', 'Blocked / Failed']], ['confidence', ['Unavailable']], ['policy', ['Approved', 'Blocked', 'Not evaluated']], ['date', dates]].map(([key, options]) => <select key={key} value={filters[key]} onChange={(event) => setFilter(key, event.target.value)} className="rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700"><option value="all">{label(key)}</option>{options.map((option) => <option key={option} value={option}>{label(option)}</option>)}</select>)}</div>{loading ? <div className="py-12 text-center text-sm text-slate-500">Loading activity...</div> : error ? <div className="py-12 text-center text-sm text-red-600">{error}</div> : filtered.length === 0 ? <div className="py-12 text-center text-sm text-slate-500">No activity matches these filters.</div> : <div className="mt-5 divide-y divide-slate-100">{filtered.slice(0, 100).map((item) => <div key={item.id} className="grid gap-3 py-4 lg:grid-cols-[145px_100px_minmax(0,1fr)_120px_110px]"><div className="text-xs text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleString('en-IN') : '—'}</div><div className="font-mono text-xs text-blue-700">CASE_{String(item.case_id).padStart(6, '0')}</div><div><p className="text-xs font-semibold text-slate-800">{label(item.event_type)}</p><p className="mt-1 text-xs text-slate-500">{item.message}</p></div><div className="text-xs text-slate-600">{item.confidence}</div><div><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${item.policy === 'Blocked' ? 'border-red-200 bg-red-50 text-red-700' : item.policy === 'Approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{item.policy}</span></div></div>)}</div>}</section><section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-semibold text-slate-900">AI performance</h2><p className="mt-1 text-xs text-slate-500">Recorded event counts. Confidence is unavailable in the current schema.</p><div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={performance} layout="vertical" margin={{ left: 10, right: 12 }}><CartesianGrid stroke="#e5e7eb" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={88} tick={{ fill: '#374151', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="value" fill="#2563eb" radius={[0, 3, 3, 0]} barSize={22} /></BarChart></ResponsiveContainer></div></section></div>
      </div>
    </section>
  );
}
