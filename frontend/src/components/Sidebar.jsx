import React from 'react';

const coreItems = [
  { label: 'Executive Dashboard', path: '/dashboard', icon: 'grid' },
  { label: 'Revenue at Risk', path: '/revenue-risk', icon: 'alert', badge: 'Risk' },
  { label: 'Transactions', path: '/transactions', icon: 'card' },
  { label: 'Recovery Cases', path: '/recovery-cases', icon: 'refresh' },
  { label: 'AI Agent Activity', path: '/agent-activity', icon: 'activity', live: true },
  { label: 'Human Review Queue', path: '/human-review', icon: 'users', badge: 'Gate' },
  { label: 'Measured Recovery', path: '/measured-recovery', icon: 'chart' },
  { label: 'Audit Ledger', path: '/audit-ledger', icon: 'document' },
  { label: 'Demo Simulator', path: '/simulator', icon: 'play' }
];

const configItems = [
  { label: 'System Architecture', path: '/architecture', icon: 'network' },
  { label: 'Agent Config', path: '/agent-config', icon: 'sliders' },
  { label: 'Policies & Safety', path: '/policies', icon: 'shield' },
  { label: 'Settings & Razorpay', path: '/settings', icon: 'settings' }
];

function Icon({ name }) {
  const paths = {
    grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    alert: <><path d="m12 4 8 15H4L12 4Z" /><path d="M12 9v4m0 3h.01" /></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.9-3L3 11" /><path d="M3 5v6h6M4 13a8 8 0 0 0 14.9 3L21 13" /><path d="M21 19v-6h-6" /></>,
    activity: <><path d="M3 12h4l2-7 4 14 2-7h6" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 3-4 3 2 5-7" /></>,
    document: <><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
    play: <><circle cx="12" cy="12" r="9" /><path d="m10 8 5 4-5 4V8Z" /></>,
    network: <><circle cx="12" cy="5" r="2" /><circle cx="5" cy="18" r="2" /><circle cx="19" cy="18" r="2" /><path d="m11 7-5 9m7-9 5 9M7 18h10" /></>,
    sliders: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="11" cy="18" r="2" /></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.4 1.4-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.4-1.4.1-.1A1.7 1.7 0 0 0 9.4 15a1.7 1.7 0 0 0-1.6-1H7v-2h.8a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L9 9l1.4-1.4.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h2v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 9l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v2H21a1.7 1.7 0 0 0-1.6 1Z" /></>
  };
  return <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function NavItem({ item, activePath, onNavigate }) {
  const active = activePath === item.path;
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.path)}
      className={`group flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-[13px] transition-colors ${active ? 'border-blue-200 bg-blue-50 font-medium text-blue-700' : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'}`}
    >
      <span className={active ? 'text-blue-600' : item.live ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-700'}><Icon name={item.icon} /></span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Live" />}
      {item.badge && <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">{item.badge}</span>}
    </button>
  );
}

export default function Sidebar({ activePath, onNavigate, open, onClose }) {
  return (
    <>
      {open && <button type="button" aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/20 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-slate-200 bg-white px-4 py-5 text-slate-700 transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-start justify-between px-2">
          <button type="button" onClick={() => onNavigate('/dashboard')} className="flex items-center gap-2.5 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white"><Icon name="activity" /></span>
            <span><span className="block text-[15px] font-semibold tracking-tight text-slate-900">RecoverAI</span><span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">V1.0 · Detect. Decide. Recover.</span></span>
          </button>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-900 lg:hidden" aria-label="Close navigation">×</button>
        </div>

        <div className="mt-8 flex-1 overflow-y-auto pr-1">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Core Agent Operations</p>
          <nav className="space-y-1">{coreItems.map((item) => <NavItem key={item.path} item={item} activePath={activePath} onNavigate={onNavigate} />)}</nav>
          <p className="mb-2 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Configuration & Guardrails</p>
          <nav className="space-y-1">{configItems.map((item) => <NavItem key={item.path} item={item} activePath={activePath} onNavigate={onNavigate} />)}</nav>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-xs font-semibold text-slate-700">Test Mode</span><span className="ml-auto text-[10px] text-emerald-600">Simulation</span></div>
          <p className="mt-2 text-[11px] text-slate-400">Buildathon 2026</p>
        </div>
      </aside>
    </>
  );
}
