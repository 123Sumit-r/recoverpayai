import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short'
  });
}

function formatAxisValue(value) {
  const amount = Number(value || 0);
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}k`;
  return `₹${amount}`;
}

function Metric({ label, value, accent = 'text-white', note }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${accent}`}>{value}</p>
      {note && <p className="mt-1 text-[11px] text-slate-500">{note}</p>}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <p className="mb-2 text-xs font-medium text-slate-500">{formatDate(label)}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-5 text-xs">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-semibold text-slate-900">{money(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function RevenueRecoveryChart({ data = [], loading = false, error = '', baselineRecoveredRevenue = null }) {
  const revenueAtRisk = data.reduce((total, item) => total + Number(item.revenueAtRisk || 0), 0);
  const recoveredRevenue = data.reduce((total, item) => total + Number(item.recoveredRevenue || 0), 0);
  const recoveryRate = revenueAtRisk ? (recoveredRevenue / revenueAtRisk) * 100 : 0;
  const incrementalRevenue = baselineRecoveredRevenue === null
    ? null
    : recoveredRevenue - Number(baselineRecoveredRevenue || 0);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-400">Performance analytics</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Revenue Recovery Performance</h2>
            <p className="mt-1 text-xs text-slate-500">Failed payment risk compared with successfully recovered transaction revenue</p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Metric label="Incremental Revenue" value={incrementalRevenue === null ? 'Unavailable' : money(incrementalRevenue)} accent={incrementalRevenue === null ? 'text-slate-300' : 'text-orange-300'} note={incrementalRevenue === null ? 'No baseline data' : 'vs baseline'} />
            <Metric label="Revenue at Risk" value={money(revenueAtRisk)} />
            <Metric label="Recovered Revenue" value={money(recoveredRevenue)} accent="text-emerald-400" />
            <Metric label="Recovery Rate" value={`${recoveryRate.toFixed(1)}%`} accent="text-cyan-300" />
          </div>
        </div>
      </div>

      <div className="px-3 pb-5 pt-4 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-5 text-xs text-slate-600">
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-orange-400" />Revenue at Risk</span>
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />AI Recovered Revenue</span>
        </div>
        {loading ? (
          <div className="flex h-72 items-center justify-center text-sm text-slate-500">Loading recovery performance...</div>
        ) : error ? (
          <div className="flex h-72 items-center justify-center px-4 text-center text-sm text-red-300">{error}</div>
        ) : data.length === 0 ? (
          <div className="flex h-72 items-center justify-center px-4 text-center text-sm text-slate-500">No failed payment recovery data is available yet.</div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb923c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="recoveredFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tickFormatter={formatAxisValue} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={58} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#9ca3af', strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="revenueAtRisk" name="Revenue at Risk" stroke="#fb923c" strokeWidth={2.5} fill="url(#riskFill)" activeDot={{ r: 4, fill: '#fb923c', stroke: '#fff', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="recoveredRevenue" name="AI Recovered Revenue" stroke="#34d399" strokeWidth={2.5} fill="url(#recoveredFill)" activeDot={{ r: 4, fill: '#34d399', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
