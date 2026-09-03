import React from "react";

const architectureFlow = [
  { name: "Razorpay", icon: "💳", color: "bg-blue-50 border-blue-200" },
  { name: "Payment Event", icon: "📊", color: "bg-indigo-50 border-indigo-200" },
  { name: "PostgreSQL", icon: "🗄️", color: "bg-cyan-50 border-cyan-200" },
  { name: "Risk Engine", icon: "⚖️", color: "bg-orange-50 border-orange-200" },
  { name: "AI Diagnosis", icon: "🧠", color: "bg-purple-50 border-purple-200" },
  { name: "Policy Engine", icon: "📋", color: "bg-emerald-50 border-emerald-200" },
  { name: "Recovery Strategy", icon: "🎯", color: "bg-rose-50 border-rose-200" },
  { name: "Execution", icon: "⚡", color: "bg-yellow-50 border-yellow-200" },
  { name: "Recovery Result", icon: "✓", color: "bg-green-50 border-green-200" },
  { name: "Audit Ledger", icon: "📝", color: "bg-slate-50 border-slate-200" },
];

const systemHealth = [
  { name: "PostgreSQL", status: "Connected", color: "emerald" },
  { name: "Razorpay API", status: "Connected", color: "emerald" },
  { name: "AI Service", status: "Active", color: "emerald" },
  { name: "Policy Engine", status: "Active", color: "emerald" },
  { name: "Email Service", status: "Active", color: "emerald" },
];

const dataFlowDetails = [
  {
    title: "Payment Ingestion",
    description: "Webhook receives payment failure events from Razorpay",
    items: [
      "Event Type: Payment Failed",
      "Transaction ID, Amount, Customer Info",
      "Failure Reason & Error Code",
    ],
  },
  {
    title: "Data Storage",
    description: "Events stored in PostgreSQL with full audit trail",
    items: [
      "Transactions table",
      "Recovery Cases table",
      "Policy Events & Decisions",
    ],
  },
  {
    title: "Risk Assessment",
    description: "Risk engine scores each failure for recovery potential",
    items: ["Score: 0-100", "Category: Low/Medium/High", "Recovery Probability"],
  },
];

const aiFlowDetails = [
  {
    title: "Diagnosis Generation",
    description: "AI analyzes failure patterns and customer history",
    items: [
      "Failure Root Cause Analysis",
      "Customer Behavior Pattern Matching",
      "Optimal Recovery Window Prediction",
    ],
  },
  {
    title: "Decision Making",
    description: "AI recommends recovery strategy with confidence scores",
    items: [
      "Strategy: Email / Retry / Payment Link",
      "Timing: When to attempt recovery",
      "Confidence: Success probability",
    ],
  },
  {
    title: "Learning Loop",
    description: "System learns from outcomes to improve recommendations",
    items: [
      "Success/Failure Attribution",
      "Model Performance Tracking",
      "Policy Effectiveness Analysis",
    ],
  },
];

const policyFlowDetails = [
  {
    title: "Policy Evaluation",
    description: "Every decision checked against business policies",
    items: [
      "Compliance: Regulatory requirements",
      "Limits: Max recovery attempts per case",
      "Constraints: Customer segment rules",
    ],
  },
  {
    title: "Rule Enforcement",
    description: "Policies enforced before any recovery action",
    items: [
      "Frequency Capping",
      "Amount Limits",
      "Channel Restrictions",
    ],
  },
  {
    title: "Human Override",
    description: "High-risk decisions escalated to human team",
    items: [
      "Risk Score > Threshold",
      "Unusual Patterns Detected",
      "Customer Flag or Opt-Out",
    ],
  },
];

const recoveryExecutionDetails = [
  {
    title: "Multi-Channel Execution",
    description: "Recovery strategies executed across multiple channels",
    items: [
      "Email: Reminder notifications",
      "Retry: Automatic payment retry",
      "Payment Link: Direct payment option",
    ],
  },
  {
    title: "Timing Optimization",
    description: "Recovery attempts timed for maximum success rate",
    items: [
      "Day 1: Customer notification",
      "Day 2-3: Automatic retry attempt",
      "Day 4+: Escalation to team",
    ],
  },
  {
    title: "Result Tracking",
    description: "All outcomes recorded and attributed to strategy",
    items: [
      "Payment Success/Failure",
      "Click-through Rates",
      "Conversion Metrics",
    ],
  },
];

const auditObservabilityDetails = [
  {
    title: "Complete Audit Trail",
    description: "Every decision and action immutably recorded",
    items: [
      "Event ID & Timestamp",
      "Actor: AI / Policy / System",
      "Input, Decision, Action, Result",
    ],
  },
  {
    title: "Compliance Reporting",
    description: "Audit ledger enables compliance and accountability",
    items: [
      "Decision Justification",
      "Policy Adherence Proof",
      "Regulatory Audit Trail",
    ],
  },
  {
    title: "Performance Monitoring",
    description: "Real-time system health and metrics visibility",
    items: [
      "Recovery Rate & Trends",
      "Revenue Impact",
      "System Latency & Uptime",
    ],
  },
];

export default function SystemArchitecture() {
  return (
    <section className="min-h-screen bg-slate-50 p-5 text-slate-800 sm:p-7">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="border-b border-slate-200 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Configuration & Guardrails
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            System Architecture
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Understand how RecoverAI processes payment failures and recovery
            decisions.
          </p>
        </div>

        {/* System Health Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {systemHealth.map((component) => (
            <div
              key={component.name}
              className={`rounded-lg border border-${component.color}-200 bg-${component.color}-50 p-4 shadow-sm`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {component.name}
              </p>
              <p className={`mt-2 text-sm font-semibold text-${component.color}-700`}>
                ● {component.status}
              </p>
            </div>
          ))}
        </div>

        {/* Architecture Flow Diagram */}
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-6">
            Payment Recovery Pipeline
          </h2>
          <div className="space-y-3">
            {architectureFlow.map((stage, idx) => (
              <div key={idx}>
                <div className={`rounded-lg border-2 ${stage.color} p-4`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{stage.icon}</span>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {stage.name}
                      </p>
                      {idx === 7 && (
                        <p className="text-xs text-slate-500">
                          Email • Retry • Payment Link
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {idx < architectureFlow.length - 1 && (
                  <div className="flex justify-center py-2">
                    <div className="text-xl text-slate-400">↓</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="mt-8 space-y-8">
          {/* Data Flow */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Data Flow
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {dataFlowDetails.map((section, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="font-semibold text-slate-900">{section.title}</h3>
                  <p className="mt-2 text-xs text-slate-600">{section.description}</p>
                  <ul className="mt-3 space-y-2">
                    {section.items.map((item, i) => (
                      <li key={i} className="text-xs text-slate-700 flex gap-2">
                        <span className="text-slate-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* AI Decision Flow */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              AI Decision Flow
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {aiFlowDetails.map((section, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="font-semibold text-slate-900">{section.title}</h3>
                  <p className="mt-2 text-xs text-slate-600">{section.description}</p>
                  <ul className="mt-3 space-y-2">
                    {section.items.map((item, i) => (
                      <li key={i} className="text-xs text-slate-700 flex gap-2">
                        <span className="text-slate-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Policy Enforcement */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Policy Enforcement
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {policyFlowDetails.map((section, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="font-semibold text-slate-900">{section.title}</h3>
                  <p className="mt-2 text-xs text-slate-600">{section.description}</p>
                  <ul className="mt-3 space-y-2">
                    {section.items.map((item, i) => (
                      <li key={i} className="text-xs text-slate-700 flex gap-2">
                        <span className="text-slate-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Recovery Execution */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Recovery Execution
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {recoveryExecutionDetails.map((section, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="font-semibold text-slate-900">{section.title}</h3>
                  <p className="mt-2 text-xs text-slate-600">{section.description}</p>
                  <ul className="mt-3 space-y-2">
                    {section.items.map((item, i) => (
                      <li key={i} className="text-xs text-slate-700 flex gap-2">
                        <span className="text-slate-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Audit & Observability */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Audit & Observability
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {auditObservabilityDetails.map((section, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="font-semibold text-slate-900">{section.title}</h3>
                  <p className="mt-2 text-xs text-slate-600">{section.description}</p>
                  <ul className="mt-3 space-y-2">
                    {section.items.map((item, i) => (
                      <li key={i} className="text-xs text-slate-700 flex gap-2">
                        <span className="text-slate-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Key Principles */}
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-blue-900 mb-4">
            Core Architecture Principles
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-semibold text-blue-900">🔒 Security First</p>
              <p className="mt-1 text-xs text-blue-700">
                All payment data encrypted and audit logged
              </p>
            </div>
            <div>
              <p className="font-semibold text-blue-900">📊 Data-Driven</p>
              <p className="mt-1 text-xs text-blue-700">
                Every decision backed by metrics and evidence
              </p>
            </div>
            <div>
              <p className="font-semibold text-blue-900">👥 Human-in-Loop</p>
              <p className="mt-1 text-xs text-blue-700">
                AI recommends, humans decide and approve
              </p>
            </div>
            <div>
              <p className="font-semibold text-blue-900">📝 Fully Compliant</p>
              <p className="mt-1 text-xs text-blue-700">
                Complete audit trail for regulatory requirements
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
