import React from 'react';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const stages = [
  { key: 'failed', label: 'Payment Failed', color: 'border-rose-400/30 bg-rose-500/10 text-rose-100' },
  { key: 'risk', label: 'Revenue at Risk Detected', color: 'border-amber-400/30 bg-amber-500/10 text-amber-100' },
  { key: 'gated', label: 'Policy-Gated Interventions', color: 'border-indigo-400/30 bg-indigo-500/10 text-indigo-100' },
  { key: 'recovered', label: 'Revenue Successfully Recovered', color: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100' }
];

export default function RecoveryFunnel({ revenueAtRisk = 0, recoveredRevenue = 0, failedCount = 0, cases = [] }) {
  const policyAmount = cases.reduce((total, item) => total + (item.policy_allowed ? Number(item.amount_at_risk || 0) : 0), 0);
  const activeAmount = cases.reduce((total, item) => total + (['open', 'processing', 'email_sent'].includes(item.status) ? Number(item.amount_at_risk || 0) : 0), 0);
  const base = Number(revenueAtRisk || 0);
  const percent = (value) => base ? `${Math.min(100, (value / base) * 100).toFixed(1)}%` : '0.0%';
  const values = { failed: base, risk: base, gated: policyAmount || activeAmount, recovered: Number(recoveredRevenue || 0) };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 text-slate-700 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">AI Recovery Funnel</h2>
          <p className="mt-1 text-xs text-slate-500">Step-by-step conversion from failure to recovery</p>
        </div>
        <span className="text-[11px] text-indigo-300">Live analytics</span>
      </div>
      <div className="mt-5 space-y-2">
        {stages.map((stage, index) => (
          <React.Fragment key={stage.key}>
            <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-3 ${stage.color}`}>
              <span className="text-xs font-semibold"><span className="mr-2 text-slate-400">{index + 1}.</span>{stage.label}</span>
              <span className="shrink-0 text-xs font-semibold">{money(values[stage.key])} <span className="ml-2 rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">{stage.key === 'failed' ? failedCount : percent(values[stage.key])}</span></span>
            </div>
            {index < stages.length - 1 && <div className="text-center text-xs text-slate-600">↓</div>}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
