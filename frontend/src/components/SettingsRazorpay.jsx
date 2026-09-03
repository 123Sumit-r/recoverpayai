import React, { useState } from 'react';

const tabs = ['General', 'Razorpay', 'Database', 'Email', 'AI', 'Notifications'];

const webhookEvents = [
  { event: 'payment.failed', paymentId: 'pay_Nx8••••••21', status: 'Received', receivedAt: 'Today, 10:42:18', processing: 'Processed' },
  { event: 'payment.captured', paymentId: 'pay_Nx7••••••04', status: 'Received', receivedAt: 'Today, 10:36:51', processing: 'Processed' },
  { event: 'payment.failed', paymentId: 'pay_Nx5••••••88', status: 'Received', receivedAt: 'Today, 09:58:03', processing: 'Processed' },
  { event: 'order.paid', paymentId: 'pay_Nx2••••••47', status: 'Received', receivedAt: 'Today, 09:41:29', processing: 'Queued' },
];

const statusStyles = {
  Connected: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Configured: 'border-blue-200 bg-blue-50 text-blue-700',
  Processed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Queued: 'border-amber-200 bg-amber-50 text-amber-700',
  Received: 'border-blue-200 bg-blue-50 text-blue-700',
};

function StatusBadge({ children }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusStyles[children] || 'border-slate-200 bg-slate-100 text-slate-600'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{children}</span>;
}

function DetailRow({ label, value, status, masked }) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="flex items-center gap-3 text-right text-sm font-semibold text-slate-800">
        {masked ? <span className="font-mono text-xs tracking-wide text-slate-600">{value}</span> : value}
        {status && <StatusBadge>{status}</StatusBadge>}
      </dd>
    </div>
  );
}

function Panel({ title, description, children, action }) {
  return (
    <section className="border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 className="text-base font-semibold text-slate-900">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>
        {action}
      </div>
      {children}
    </section>
  );
}

function GeneralTab() {
  return <Panel title="Application settings" description="Workspace-level preferences for the RecoverAI control plane."><dl className="px-5"><DetailRow label="Application mode" value="Test Mode" /><DetailRow label="Default currency" value="INR · Indian Rupee" /><DetailRow label="Timezone" value="Asia / Kolkata (IST)" /><DetailRow label="Audit logging" value="Enabled" status="Active" /></dl></Panel>;
}

function RazorpayTab({ onAction, actionLabel }) {
  return <div className="space-y-6">
    <Panel title="Razorpay connection" description="Review the payment gateway connection without exposing credentials." action={<StatusBadge>Connected</StatusBadge>}>
      <dl className="px-5"><DetailRow label="Connection Status" value="Razorpay API reachable" status="Connected" /><DetailRow label="API Key Status" value="rzp_************" masked status="Configured" /><DetailRow label="Webhook Status" value="Signature verification enabled" status="Active" /><DetailRow label="Last Webhook Event" value="payment.failed · Today, 10:42:18" /><DetailRow label="Environment" value="Test" /></dl>
      <div className="flex flex-wrap gap-3 border-t border-slate-200 bg-slate-50 p-5">
        <button type="button" onClick={() => onAction('Connection test completed successfully.')} className="rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700">Test Connection</button>
        <button type="button" onClick={() => onAction('Webhook and payment status sync queued.')} className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Sync</button>
        <button type="button" onClick={() => document.getElementById('webhook-events')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">View Webhook Events</button>
      </div>
      {actionLabel && <p className="border-t border-blue-100 bg-blue-50 px-5 py-3 text-xs font-medium text-blue-800">{actionLabel}</p>}
    </Panel>
    <section id="webhook-events" className="border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5"><h2 className="text-base font-semibold text-slate-900">Webhook Events</h2><p className="mt-1 text-xs leading-5 text-slate-500">Recent gateway events received by the integration.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead className="border-b border-slate-200 bg-slate-50"><tr className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><th className="px-5 py-3">Event</th><th className="px-5 py-3">Payment ID</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Received At</th><th className="px-5 py-3">Processing Status</th></tr></thead><tbody className="divide-y divide-slate-100">{webhookEvents.map((event) => <tr key={`${event.event}-${event.paymentId}`} className="text-xs text-slate-700 hover:bg-slate-50"><td className="px-5 py-4 font-mono font-semibold text-slate-900">{event.event}</td><td className="px-5 py-4 font-mono text-slate-600">{event.paymentId}</td><td className="px-5 py-4"><StatusBadge>{event.status}</StatusBadge></td><td className="px-5 py-4 whitespace-nowrap text-slate-500">{event.receivedAt}</td><td className="px-5 py-4"><StatusBadge>{event.processing}</StatusBadge></td></tr>)}</tbody></table></div>
      <p className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-[11px] text-slate-500">Payment IDs are partially masked for operational privacy.</p>
    </section>
  </div>;
}

function DatabaseTab() {
  return <Panel title="Database connection" description="Current PostgreSQL connectivity and synchronization metadata."><dl className="px-5"><DetailRow label="PostgreSQL Status" value="Primary database" status="Connected" /><DetailRow label="Connection Status" value="Healthy · pool available" status="Connected" /><DetailRow label="Last Sync" value="Today, 10:40:02 IST" /><DetailRow label="Records" value="2,481 payment and recovery records" /></dl></Panel>;
}

function EmailTab({ onAction, actionLabel }) {
  return <Panel title="Email service" description="Review the notification provider used for recovery communications." action={<StatusBadge>Active</StatusBadge>}><dl className="px-5"><DetailRow label="Email Provider" value="SMTP relay" /><DetailRow label="Connection Status" value="Provider reachable" status="Connected" /><DetailRow label="Test Email" value="Ready to send" /></dl><div className="border-t border-slate-200 bg-slate-50 p-5"><button type="button" onClick={() => onAction('Test email queued for the configured recipient.')} className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Send Test Email</button>{actionLabel && <p className="mt-3 text-xs font-medium text-blue-800">{actionLabel}</p>}</div></Panel>;
}

function SimpleTab({ title, description, rows }) {
  return <Panel title={title} description={description}><dl className="px-5">{rows.map((row) => <DetailRow key={row[0]} label={row[0]} value={row[1]} status={row[2]} />)}</dl></Panel>;
}

export default function SettingsRazorpay() {
  const [activeTab, setActiveTab] = useState('General');
  const [actionLabel, setActionLabel] = useState('');

  const handleAction = (message) => {
    setActionLabel(message);
    window.setTimeout(() => setActionLabel(''), 4000);
  };

  return <section className="min-h-screen bg-slate-100 p-5 text-slate-700 sm:p-8"><div className="mx-auto max-w-6xl">
    <header className="border-b border-slate-300 pb-6"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Administration / Service Connections</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Settings &amp; Razorpay</h1><p className="mt-2 text-sm leading-6 text-slate-600">Manage payment integration, application settings and service connections.</p></header>
    <div className="mt-6 border border-slate-300 bg-white shadow-sm"><div className="flex overflow-x-auto border-b border-slate-200 px-2 sm:px-4">{tabs.map((tab) => <button key={tab} type="button" onClick={() => { setActiveTab(tab); setActionLabel(''); }} className={`whitespace-nowrap border-b-2 px-4 py-4 text-xs font-semibold transition ${activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>{tab}</button>)}</div><div className="p-5 sm:p-6">
      {activeTab === 'General' && <GeneralTab />}
      {activeTab === 'Razorpay' && <RazorpayTab onAction={handleAction} actionLabel={actionLabel} />}
      {activeTab === 'Database' && <DatabaseTab />}
      {activeTab === 'Email' && <EmailTab onAction={handleAction} actionLabel={actionLabel} />}
      {activeTab === 'AI' && <SimpleTab title="AI service" description="Decision service status and model configuration visibility." rows={[["AI service status", "Operational", "Active"], ["Decision mode", "Test mode"], ["Confidence scoring", "Enabled", "Active"]]} />}
      {activeTab === 'Notifications' && <SimpleTab title="Notification channels" description="Channels available for recovery and operational alerts." rows={[["Recovery email", "Enabled", "Active"], ["Operations alerts", "Enabled", "Active"], ["Webhook failure alerts", "Enabled", "Active"]]} />}
    </div></div>
    <p className="mt-4 text-[11px] text-slate-500">Credential values are never displayed in this interface. Integration changes remain governed by the existing backend environment configuration.</p>
  </div></section>;
}
