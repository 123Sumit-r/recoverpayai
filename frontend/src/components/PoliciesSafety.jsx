import React from 'react';

const policies = [
  {
    name: 'High Value Transaction Policy',
    status: 'Requires Review',
    rule: 'Transactions above the review threshold cannot be recovered autonomously.',
    threshold: '₹50,000+',
    action: 'Require human approval',
    updated: 'Today, 09:42',
    warning: true,
  },
  {
    name: 'Human Approval Policy',
    status: 'Active',
    rule: 'High-risk recovery decisions must be approved before execution.',
    threshold: 'Risk score ≥ 80',
    action: 'Escalate to review queue',
    updated: 'Yesterday, 16:18',
  },
  {
    name: 'Retry Limit Policy',
    status: 'Active',
    rule: 'A payment may not be retried more than the configured attempt limit.',
    threshold: '3 attempts / case',
    action: 'Stop automated retries',
    updated: 'Aug 28, 11:05',
  },
  {
    name: 'Customer Contact Policy',
    status: 'Active',
    rule: 'Do not contact customers more frequently than the approved cadence.',
    threshold: '1 message / 24 hours',
    action: 'Suppress duplicate contact',
    updated: 'Aug 27, 14:32',
  },
  {
    name: 'Recovery Amount Cap',
    status: 'Active',
    rule: 'Automated recovery is restricted to transactions below the amount cap.',
    threshold: '₹100,000 maximum',
    action: 'Route higher values to review',
    updated: 'Aug 25, 10:11',
  },
  {
    name: 'Escalation Policy',
    status: 'Requires Review',
    rule: 'Unresolved high-risk cases must be visible to an operations reviewer.',
    threshold: 'Open after 48 hours',
    action: 'Create human review task',
    updated: 'Aug 22, 17:46',
    warning: true,
  },
  {
    name: 'Failed Payment Policy',
    status: 'Disabled',
    rule: 'Temporary gateway failures may receive a limited automated recovery path.',
    threshold: 'Gateway error codes only',
    action: 'Await policy activation',
    updated: 'Aug 19, 08:27',
  },
];

const decisions = [
  { caseId: '#192', amount: '₹75,000', risk: 'High', policy: 'Human Approval Required', decision: 'Escalated', time: 'Today, 09:42', tone: 'amber' },
  { caseId: '#191', amount: '₹12,500', risk: 'Medium', policy: 'Retry Limit Policy', decision: 'Retry blocked', time: 'Today, 09:15', tone: 'red' },
  { caseId: '#190', amount: '₹4,800', risk: 'Low', policy: 'Failed Payment Policy', decision: 'Awaiting activation', time: 'Today, 08:51', tone: 'slate' },
  { caseId: '#189', amount: '₹32,000', risk: 'Medium', policy: 'Customer Contact Policy', decision: 'Approved', time: 'Yesterday, 18:26', tone: 'green' },
  { caseId: '#188', amount: '₹125,000', risk: 'High', policy: 'Recovery Amount Cap', decision: 'Escalated', time: 'Yesterday, 17:04', tone: 'amber' },
];

const statusStyles = {
  Active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Disabled: 'border-slate-200 bg-slate-100 text-slate-500',
  'Requires Review': 'border-amber-200 bg-amber-50 text-amber-700',
};

const decisionStyles = {
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  red: 'border-red-200 bg-red-50 text-red-700',
  slate: 'border-slate-200 bg-slate-100 text-slate-600',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusStyles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'Active' ? 'bg-emerald-500' : status === 'Disabled' ? 'bg-slate-400' : 'bg-amber-500'}`} />
      {status}
    </span>
  );
}

function PolicyCard({ policy }) {
  return (
    <article className={`border bg-white shadow-sm ${policy.warning ? 'border-amber-300' : 'border-slate-200'}`}>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border text-sm font-bold ${policy.warning ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
            {policy.warning ? '!' : '§'}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{policy.name}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">{policy.rule}</p>
          </div>
        </div>
        <StatusBadge status={policy.status} />
      </div>
      <dl className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Threshold</dt>
          <dd className="mt-1 text-xs font-semibold text-slate-800">{policy.threshold}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Action</dt>
          <dd className="mt-1 text-xs font-semibold text-slate-800">{policy.action}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Last Updated</dt>
          <dd className="mt-1 text-xs font-semibold text-slate-600">{policy.updated}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function PoliciesSafety() {
  return (
    <section className="min-h-screen bg-slate-100 p-5 text-slate-700 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-slate-300 pb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Governance / Control Register</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Policies &amp; Safety</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Control how AI recovery actions are governed and approved.</p>
        </header>

        <section className="mt-6 border border-slate-300 bg-white p-5 shadow-sm sm:p-6" aria-label="Policy control posture">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-amber-300 bg-amber-50 text-xl font-bold text-amber-700">!</div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">Control posture</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Review required before autonomous recovery</h2>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">Two policies need review. High-value and high-risk actions remain gated while the current rules are assessed.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-5 border-t border-slate-200 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <div><p className="text-2xl font-semibold text-emerald-700">5</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Active</p></div>
              <div><p className="text-2xl font-semibold text-amber-700">2</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Review</p></div>
              <div><p className="text-2xl font-semibold text-slate-500">1</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Disabled</p></div>
            </div>
          </div>
        </section>

        <div className="mt-8 flex items-end justify-between border-b border-slate-300 pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Policy register</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Active guardrails</h2>
          </div>
          <span className="text-xs text-slate-500">{policies.length} controls registered</span>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {policies.map((policy) => <PolicyCard key={policy.name} policy={policy} />)}
        </div>

        <section className="mt-10 border border-slate-300 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Immutable review history</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">Policy Decision Log</h2>
            </div>
            <p className="text-xs text-slate-500">Most recent policy evaluations</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  <th className="px-5 py-3">Case</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Risk</th><th className="px-5 py-3">Policy</th><th className="px-5 py-3">Decision</th><th className="px-5 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {decisions.map((entry) => (
                  <tr key={entry.caseId} className="text-xs text-slate-700 hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold text-slate-900">Case {entry.caseId}</td>
                    <td className="px-5 py-4 font-medium">{entry.amount}</td>
                    <td className="px-5 py-4"><span className={`font-semibold ${entry.risk === 'High' ? 'text-red-700' : entry.risk === 'Medium' ? 'text-amber-700' : 'text-emerald-700'}`}>{entry.risk === 'High' && '! '}{entry.risk}</span></td>
                    <td className="px-5 py-4">{entry.policy}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded border px-2 py-1 text-[10px] font-bold ${decisionStyles[entry.tone]}`}>{entry.decision}</span></td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-500">{entry.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-[11px] text-slate-500">
            <span className="font-bold text-slate-700">Read-only log</span>
            <span>•</span>
            <span>Decisions are recorded with the governing policy and cannot be edited from this view.</span>
          </div>
        </section>
      </div>
    </section>
  );
}
