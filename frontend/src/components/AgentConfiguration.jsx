import React, { useState } from 'react';

const initialConfiguration = {
  status: 'Active',
  lowRisk: '0-30',
  mediumRisk: '31-70',
  highRisk: '71-100',
  confidence: 75,
  attemptLimit: 3,
  retryDelay: '24 hours',
  maximumAmount: 100000,
  escalationThreshold: 80,
  strategies: {
    email: true,
    retry: true,
    smartRetry: true,
    paymentLink: true,
    humanReview: true,
  },
};

const strategyOptions = [
  { key: 'email', label: 'Email', description: 'Send a contextual payment recovery message.' },
  { key: 'retry', label: 'Retry Payment', description: 'Attempt payment again when the failure is recoverable.' },
  { key: 'smartRetry', label: 'Smart Retry', description: 'Use AI-selected timing and payment retry windows.' },
  { key: 'paymentLink', label: 'Payment Link', description: 'Offer the customer a secure link to complete payment.' },
  { key: 'humanReview', label: 'Human Review', description: 'Route cases to an operator when AI should not act alone.' },
];

function SettingRow({ label, description, children }) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-100 py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-xl">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <div className="w-full shrink-0 sm:w-56">{children}</div>
    </div>
  );
}

function SelectControl({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    >
      {children}
    </select>
  );
}

function NumberControl({ value, onChange, suffix, min = 0, max }) {
  return (
    <div className="relative">
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-14 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">{suffix}</span>
    </div>
  );
}

export default function AgentConfiguration() {
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [saved, setSaved] = useState(false);

  const update = (key, value) => {
    setSaved(false);
    setConfiguration((current) => ({ ...current, [key]: value }));
  };

  const toggleStrategy = (key) => {
    setSaved(false);
    setConfiguration((current) => ({
      ...current,
      strategies: { ...current.strategies, [key]: !current.strategies[key] },
    }));
  };

  const saveConfiguration = () => {
    setSaved(true);
  };

  return (
    <section className="min-h-screen bg-slate-50 p-5 text-slate-700 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600">Configuration &amp; Guardrails</p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Agent Configuration</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">Configure AI recovery behavior and decision boundaries.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Frontend-only configuration
            </span>
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white px-5 shadow-sm">
              <div className="border-b border-slate-200 py-5">
                <h2 className="text-base font-semibold text-slate-900">Agent Status</h2>
                <p className="mt-1 text-xs text-slate-500">Control whether the agent can make recovery decisions.</p>
              </div>
              <SettingRow label="Agent Status" description="Paused agents continue recording events but do not initiate recovery actions.">
                <SelectControl value={configuration.status} onChange={(event) => update('status', event.target.value)}>
                  <option>Active</option>
                  <option>Paused</option>
                </SelectControl>
              </SettingRow>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white px-5 shadow-sm">
              <div className="border-b border-slate-200 py-5">
                <h2 className="text-base font-semibold text-slate-900">Risk Thresholds</h2>
                <p className="mt-1 text-xs text-slate-500">Define the score boundaries used to classify payment recovery risk.</p>
              </div>
              <SettingRow label="Low Risk" description="Cases in this range can follow the default automated strategy.">
                <SelectControl value={configuration.lowRisk} onChange={(event) => update('lowRisk', event.target.value)}>
                  <option>0-30</option><option>0-25</option><option>0-20</option>
                </SelectControl>
              </SettingRow>
              <SettingRow label="Medium Risk" description="Cases in this range receive additional policy and confidence checks.">
                <SelectControl value={configuration.mediumRisk} onChange={(event) => update('mediumRisk', event.target.value)}>
                  <option>31-70</option><option>26-65</option><option>21-60</option>
                </SelectControl>
              </SettingRow>
              <SettingRow label="High Risk" description="Cases in this range are candidates for escalation before action.">
                <SelectControl value={configuration.highRisk} onChange={(event) => update('highRisk', event.target.value)}>
                  <option>71-100</option><option>66-100</option><option>61-100</option>
                </SelectControl>
              </SettingRow>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white px-5 shadow-sm">
              <div className="border-b border-slate-200 py-5">
                <h2 className="text-base font-semibold text-slate-900">Decision Boundaries</h2>
                <p className="mt-1 text-xs text-slate-500">Limit when and how often the agent can attempt recovery.</p>
              </div>
              <SettingRow label="AI Confidence Threshold" description="Minimum confidence required before AI can recommend an automated action.">
                <NumberControl value={configuration.confidence} suffix="%" max={100} onChange={(event) => update('confidence', event.target.value)} />
              </SettingRow>
              <SettingRow label="Recovery Attempt Limit" description="Maximum number of automated recovery attempts allowed per case.">
                <NumberControl value={configuration.attemptLimit} suffix="times" max={10} onChange={(event) => update('attemptLimit', event.target.value)} />
              </SettingRow>
              <SettingRow label="Retry Delay" description="Time the agent waits before scheduling the next payment retry.">
                <SelectControl value={configuration.retryDelay} onChange={(event) => update('retryDelay', event.target.value)}>
                  <option>6 hours</option><option>12 hours</option><option>24 hours</option><option>48 hours</option>
                </SelectControl>
              </SettingRow>
              <SettingRow label="Maximum Recovery Amount" description="Highest transaction amount eligible for automated recovery.">
                <NumberControl value={configuration.maximumAmount} suffix="INR" onChange={(event) => update('maximumAmount', event.target.value)} />
              </SettingRow>
              <SettingRow label="Human Escalation Threshold" description="Risk score at or above this value routes the case for human review.">
                <NumberControl value={configuration.escalationThreshold} suffix="score" max={100} onChange={(event) => update('escalationThreshold', event.target.value)} />
              </SettingRow>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white px-5 shadow-sm">
              <div className="border-b border-slate-200 py-5">
                <h2 className="text-base font-semibold text-slate-900">Available Recovery Strategies</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Choose which actions the agent may recommend or execute.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {strategyOptions.map((strategy) => (
                  <label key={strategy.key} className="flex cursor-pointer items-start gap-3 py-4">
                    <input
                      type="checkbox"
                      checked={configuration.strategies[strategy.key]}
                      onChange={() => toggleStrategy(strategy.key)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-800">{strategy.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{strategy.description}</span>
                    </span>
                    <span className={`ml-auto mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wide ${configuration.strategies[strategy.key] ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {configuration.strategies[strategy.key] ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <aside className="rounded-lg border border-blue-200 bg-blue-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Operational note</p>
              <p className="mt-2 text-sm leading-6 text-blue-900">These controls are currently stored in this page session only. Saving does not update backend configuration or alter live recovery behavior.</p>
            </aside>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-end gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
          {saved && <p className="text-xs font-medium text-emerald-700">Configuration saved for this session.</p>}
          <button type="button" onClick={saveConfiguration} className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Save Configuration
          </button>
        </div>
      </div>
    </section>
  );
}
