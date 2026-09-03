import React, { useMemo, useState } from "react";

const eventTypeColors = {
  "Payment Failed": "bg-red-50 border-red-200 text-red-700",
  "Risk Scored": "bg-orange-50 border-orange-200 text-orange-700",
  "AI Diagnosis Generated": "bg-purple-50 border-purple-200 text-purple-700",
  "Policy Evaluated": "bg-blue-50 border-blue-200 text-blue-700",
  "Recovery Approved": "bg-green-50 border-green-200 text-green-700",
  "Email Sent": "bg-cyan-50 border-cyan-200 text-cyan-700",
  "Retry Attempted": "bg-indigo-50 border-indigo-200 text-indigo-700",
  "Human Escalated": "bg-yellow-50 border-yellow-200 text-yellow-700",
  "Payment Recovered": "bg-emerald-50 border-emerald-200 text-emerald-700",
  "Recovery Stopped": "bg-slate-50 border-slate-200 text-slate-700",
};

const resultIcons = {
  success: "✓",
  pending: "⏳",
  failed: "✕",
  info: "ⓘ",
};

// Sample audit data
const sampleEvents = [
  {
    id: "AUD-2026-09-001",
    timestamp: "2026-09-03T14:32:15Z",
    caseId: "CASE-2026-001",
    paymentId: "PAY-2026-5001",
    actor: "AI Agent v2.1",
    eventType: "Payment Failed",
    decision: "Automatic",
    policy: "Payment Retry Policy v1.0",
    result: "failed",
    metadata: {
      errorCode: "PAYMENT_DECLINED",
      retryCount: 0,
      reason: "Card declined by issuer",
    },
    details: {
      timestamp: "2026-09-03T14:32:15Z",
      actor: "AI Agent v2.1",
      input: {
        paymentId: "PAY-2026-5001",
        amount: 50000,
        customerId: "CUST-001",
        attemptNumber: 1,
      },
      aiDecision: "Payment failed - eligible for recovery workflow",
      policyDecision: "Approved for automated recovery",
      actionTaken: "Queued for risk assessment",
      actionResult: "Risk assessment scheduled in 2 minutes",
      relatedCase: "CASE-2026-001",
      relatedPayment: "PAY-2026-5001",
    },
  },
  {
    id: "AUD-2026-09-002",
    timestamp: "2026-09-03T14:34:42Z",
    caseId: "CASE-2026-001",
    paymentId: "PAY-2026-5001",
    actor: "Risk Scorer",
    eventType: "Risk Scored",
    decision: "Automatic",
    policy: "Risk Scoring Engine v3.2",
    result: "success",
    metadata: {
      riskScore: 78,
      category: "High Priority",
      factors: ["Card Decline", "First Attempt", "High Value"],
    },
    details: {
      timestamp: "2026-09-03T14:34:42Z",
      actor: "Risk Scorer",
      input: {
        paymentId: "PAY-2026-5001",
        failureReason: "Card declined",
        customerAge: "45 days",
        previousRecoverySuccess: 2,
      },
      aiDecision: "High recovery priority (Score: 78/100)",
      policyDecision: "Prioritize for automated recovery",
      actionTaken: "Flagged for AI diagnosis",
      actionResult: "Assigned to diagnosis queue",
      relatedCase: "CASE-2026-001",
      relatedPayment: "PAY-2026-5001",
    },
  },
  {
    id: "AUD-2026-09-003",
    timestamp: "2026-09-03T14:36:18Z",
    caseId: "CASE-2026-001",
    paymentId: "PAY-2026-5001",
    actor: "AI Diagnosis",
    eventType: "AI Diagnosis Generated",
    decision: "Automatic",
    policy: "Diagnosis Rules v2.1",
    result: "success",
    metadata: {
      diagnosis: "Temporary card block - likely temporary",
      confidence: 0.92,
      recommendations: ["Retry after 24h", "Email reminder", "Payment link"],
    },
    details: {
      timestamp: "2026-09-03T14:36:18Z",
      actor: "AI Diagnosis",
      input: {
        failureReason: "Card declined",
        customerHistory: "Active, 45 days",
        paymentAmount: "₹50,000",
      },
      aiDecision:
        "Temporary card block likely - high recovery probability (92% confidence)",
      policyDecision: "Approved for multi-channel recovery",
      actionTaken: "Generated recovery strategy",
      actionResult: "Strategy: Email (24h) → Retry → Payment Link",
      relatedCase: "CASE-2026-001",
      relatedPayment: "PAY-2026-5001",
    },
  },
  {
    id: "AUD-2026-09-004",
    timestamp: "2026-09-03T14:38:05Z",
    caseId: "CASE-2026-001",
    paymentId: "PAY-2026-5001",
    actor: "Policy Engine",
    eventType: "Policy Evaluated",
    decision: "Automatic",
    policy: "Recovery Policy v4.0",
    result: "success",
    metadata: {
      applicablePolicies: [
        "Automated Recovery",
        "Multi-Channel Engagement",
        "Compliance Check",
      ],
      violations: 0,
    },
    details: {
      timestamp: "2026-09-03T14:38:05Z",
      actor: "Policy Engine",
      input: {
        caseId: "CASE-2026-001",
        customerType: "Enterprise",
        recoveryAttempts: 0,
      },
      aiDecision: "All policies compliant",
      policyDecision: "Approved - proceed with recovery",
      actionTaken: "Checked compliance and legal constraints",
      actionResult: "No violations detected - recovery approved",
      relatedCase: "CASE-2026-001",
      relatedPayment: "PAY-2026-5001",
    },
  },
  {
    id: "AUD-2026-09-005",
    timestamp: "2026-09-03T14:40:12Z",
    caseId: "CASE-2026-001",
    paymentId: "PAY-2026-5001",
    actor: "Recovery Orchestrator",
    eventType: "Recovery Approved",
    decision: "Automatic",
    policy: "Orchestration Policy v1.5",
    result: "success",
    metadata: {
      approvalLevel: "Automated",
      strategies: [
        "Email Reminder",
        "Retry Payment",
        "Payment Link",
      ],
      expectedOutcome: "70% recovery probability",
    },
    details: {
      timestamp: "2026-09-03T14:40:12Z",
      actor: "Recovery Orchestrator",
      input: {
        riskScore: 78,
        diagnosis: "Temporary card block",
        customerSegment: "Enterprise",
      },
      aiDecision:
        "Optimal strategy selected: Multi-channel with 70% success probability",
      policyDecision: "Approved for immediate execution",
      actionTaken: "Queued first strategy execution",
      actionResult: "Email campaign scheduled for 2026-09-04",
      relatedCase: "CASE-2026-001",
      relatedPayment: "PAY-2026-5001",
    },
  },
  {
    id: "AUD-2026-09-006",
    timestamp: "2026-09-03T15:05:33Z",
    caseId: "CASE-2026-001",
    paymentId: "PAY-2026-5001",
    actor: "Email Service",
    eventType: "Email Sent",
    decision: "Automatic",
    policy: "Email Policy v2.0",
    result: "success",
    metadata: {
      template: "recovery-reminder-v1",
      recipient: "customer@example.com",
      deliveryStatus: "Delivered",
    },
    details: {
      timestamp: "2026-09-03T15:05:33Z",
      actor: "Email Service",
      input: {
        caseId: "CASE-2026-001",
        template: "recovery-reminder-v1",
        customerEmail: "customer@example.com",
      },
      aiDecision: "Email timing optimal - send immediately",
      policyDecision: "Approved - complies with email policies",
      actionTaken: "Sent recovery reminder email",
      actionResult: "Email delivered successfully at 2026-09-03 15:05:33",
      relatedCase: "CASE-2026-001",
      relatedPayment: "PAY-2026-5001",
    },
  },
  {
    id: "AUD-2026-09-007",
    timestamp: "2026-09-04T08:15:22Z",
    caseId: "CASE-2026-001",
    paymentId: "PAY-2026-5001",
    actor: "Retry Scheduler",
    eventType: "Retry Attempted",
    decision: "Automatic",
    policy: "Retry Policy v1.0",
    result: "pending",
    metadata: {
      attemptNumber: 1,
      delayHours: 24,
      method: "Automated Retry",
    },
    details: {
      timestamp: "2026-09-04T08:15:22Z",
      actor: "Retry Scheduler",
      input: {
        caseId: "CASE-2026-001",
        previousAttempts: 1,
        lastFailureCode: "PAYMENT_DECLINED",
      },
      aiDecision: "Optimal retry timing reached - attempt payment",
      policyDecision: "Approved for automatic retry",
      actionTaken: "Executed payment retry",
      actionResult: "Processing... awaiting payment gateway response",
      relatedCase: "CASE-2026-001",
      relatedPayment: "PAY-2026-5001",
    },
  },
  {
    id: "AUD-2026-09-008",
    timestamp: "2026-09-04T08:16:45Z",
    caseId: "CASE-2026-001",
    paymentId: "PAY-2026-5002",
    actor: "AI Agent v2.1",
    eventType: "Payment Recovered",
    decision: "Automatic",
    policy: "Recovery Policy v4.0",
    result: "success",
    metadata: {
      recoveredAmount: 50000,
      timeToRecovery: "23h 44m",
      strategy: "Retry Attempt",
    },
    details: {
      timestamp: "2026-09-04T08:16:45Z",
      actor: "AI Agent v2.1",
      input: {
        caseId: "CASE-2026-001",
        originalPaymentId: "PAY-2026-5001",
        recoveryAttempts: 1,
      },
      aiDecision: "Payment successful - recovery complete",
      policyDecision: "Closed - recovery successful",
      actionTaken: "Marked case as recovered",
      actionResult: "Case closed with ₹50,000 recovered in 23h 44m",
      relatedCase: "CASE-2026-001",
      relatedPayment: "PAY-2026-5001",
    },
  },
];

function EventDetailsModal({ event, onClose }) {
  if (!event) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 text-white p-6 flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Event Details
            </p>
            <h2 className="text-lg font-semibold mt-1">{event.eventType}</h2>
            <p className="text-sm text-slate-300 mt-2">{event.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Timeline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Event Timestamp
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {new Date(event.details.timestamp).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actor
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {event.details.actor}
              </p>
            </div>
          </div>

          {/* Input */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Input
            </p>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono">
                {JSON.stringify(event.details.input, null, 2)}
              </pre>
            </div>
          </div>

          {/* Decisions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                AI Decision
              </p>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-slate-700">
                  {event.details.aiDecision}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                Policy Decision
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-slate-700">
                  {event.details.policyDecision}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                Action Taken
              </p>
              <p className="text-sm text-slate-700">
                {event.details.actionTaken}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                Result
              </p>
              <p className="text-sm text-slate-700">
                {event.details.actionResult}
              </p>
            </div>
          </div>

          {/* Related Records */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                Related Case
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-sm font-mono text-blue-600">
                  {event.details.relatedCase}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                Related Payment
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-sm font-mono text-blue-600">
                  {event.details.relatedPayment}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuditLedger() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("All");
  const [selectedActor, setSelectedActor] = useState("All");
  const [selectedResult, setSelectedResult] = useState("All");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const eventTypes = useMemo(
    () => [
      "All",
      ...new Set(sampleEvents.map((e) => e.eventType)),
    ],
    [],
  );
  const actors = useMemo(
    () => ["All", ...new Set(sampleEvents.map((e) => e.actor))],
    [],
  );
  const results = useMemo(
    () => ["All", ...new Set(sampleEvents.map((e) => e.result))],
    [],
  );

  const filteredEvents = useMemo(() => {
    return sampleEvents.filter((event) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        event.caseId.toLowerCase().includes(searchLower) ||
        event.paymentId.toLowerCase().includes(searchLower) ||
        event.id.toLowerCase().includes(searchLower) ||
        event.eventType.toLowerCase().includes(searchLower);

      const matchesType =
        selectedEventType === "All" || event.eventType === selectedEventType;
      const matchesActor =
        selectedActor === "All" || event.actor === selectedActor;
      const matchesResult =
        selectedResult === "All" || event.result === selectedResult;

      return matchesSearch && matchesType && matchesActor && matchesResult;
    });
  }, [searchTerm, selectedEventType, selectedActor, selectedResult]);

  return (
    <section className="min-h-screen bg-slate-50 p-5 text-slate-800 sm:p-7">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="border-b border-slate-200 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Compliance & Governance
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            Audit Ledger
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Immutable record of recovery decisions, actions and policy events.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="mt-6 space-y-4">
          {/* Search Box */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search by case ID, payment ID, action..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-3">
            {/* Event Type */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Event Type:
              </label>
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {eventTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Actor */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actor:
              </label>
              <select
                value={selectedActor}
                onChange={(e) => setSelectedActor(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {actors.map((actor) => (
                  <option key={actor} value={actor}>
                    {actor}
                  </option>
                ))}
              </select>
            </div>

            {/* Result */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Result:
              </label>
              <select
                value={selectedResult}
                onChange={(e) => setSelectedResult(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {results.map((result) => (
                  <option key={result} value={result}>
                    {result === "All"
                      ? "All"
                      : result.charAt(0).toUpperCase() + result.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-xs text-slate-600">
          Showing {filteredEvents.length} of {sampleEvents.length} events
        </div>

        {/* Events Table */}
        <div className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider">
                  Event ID
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider">
                  Case ID
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider">
                  Payment ID
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider">
                  Actor
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider">
                  Decision
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider">
                  Result
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.map((event) => (
                <tr
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-slate-700">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-blue-600">
                    {event.id}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {event.caseId}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {event.paymentId}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{event.actor}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1.5 rounded-full border text-xs font-medium ${
                        eventTypeColors[event.eventType] ||
                        "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      {event.eventType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                      {event.decision}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{resultIcons[event.result]}</span>
                      <span className="text-slate-700 capitalize">
                        {event.result}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEvents.length === 0 && (
            <div className="flex items-center justify-center h-64 text-sm text-slate-500">
              No events found matching your criteria.
            </div>
          )}
        </div>

        {/* Event Details Modal */}
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      </div>
    </section>
  );
}
