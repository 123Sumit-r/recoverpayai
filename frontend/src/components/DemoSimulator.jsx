import React, { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function DemoSimulator() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Configuration
  const [config, setConfig] = useState({
    numTransactions: 100,
    minValue: 1000,
    maxValue: 50000,
    failureRate: 15,
    aiEnabled: true,
    humanReviewEnabled: true,
  });

  // Simulation state
  const [stats, setStats] = useState({
    processed: 0,
    failures: 0,
    revenueAtRisk: 0,
    aiDecisions: 0,
    recoveryAttempts: 0,
    recovered: 0,
  });

  const [activityLog, setActivityLog] = useState([]);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [funnelData, setFunnelData] = useState({
    failed: 0,
    detected: 0,
    diagnosed: 0,
    policyChecked: 0,
    recoveryAttempted: 0,
    recovered: 0,
  });

  const recoveryRate = stats.failures > 0 ? ((stats.recovered / stats.failures) * 100).toFixed(1) : 0;

  // Simulation logic
  useEffect(() => {
    if (!isRunning || isPaused) return;

    const interval = setInterval(() => {
      setStats((prev) => {
        const randomFailure = Math.random() * 100 < config.failureRate;
        const transactionValue =
          Math.floor(Math.random() * (config.maxValue - config.minValue)) +
          config.minValue;

        let newStats = { ...prev, processed: prev.processed + 1 };

        if (randomFailure) {
          newStats.failures += 1;
          newStats.revenueAtRisk += transactionValue;

          // Add activity log
          setActivityLog((logs) => [
            {
              id: Date.now(),
              timestamp: new Date().toLocaleTimeString(),
              event: "Payment Failed",
              amount: transactionValue,
              status: "detected",
            },
            ...logs.slice(0, 14),
          ]);

          // Update funnel
          setFunnelData((prev) => ({
            ...prev,
            failed: prev.failed + 1,
            detected: prev.detected + 1,
          }));

          if (config.aiEnabled) {
            newStats.aiDecisions += 1;

            // Simulate AI diagnosis
            setTimeout(() => {
              setFunnelData((prev) => ({
                ...prev,
                diagnosed: prev.diagnosed + 1,
                policyChecked: prev.policyChecked + 1,
              }));

              setActivityLog((logs) => [
                {
                  id: Date.now(),
                  timestamp: new Date().toLocaleTimeString(),
                  event: "AI Diagnosis Complete",
                  amount: transactionValue,
                  status: "diagnosed",
                },
                ...logs.slice(0, 14),
              ]);

              // Simulate recovery attempt
              newStats.recoveryAttempts += 1;
              const recoverySuccess = Math.random() * 100 < 65;

              setFunnelData((prev) => ({
                ...prev,
                recoveryAttempted: prev.recoveryAttempted + 1,
                recovered: recoverySuccess ? prev.recovered + 1 : prev.recovered,
              }));

              if (recoverySuccess) {
                setStats((s) => ({
                  ...s,
                  recovered: s.recovered + 1,
                  revenueAtRisk: Math.max(0, s.revenueAtRisk - transactionValue),
                }));

                setActivityLog((logs) => [
                  {
                    id: Date.now(),
                    timestamp: new Date().toLocaleTimeString(),
                    event: "Payment Recovered",
                    amount: transactionValue,
                    status: "recovered",
                  },
                  ...logs.slice(0, 14),
                ]);
              } else if (config.humanReviewEnabled && Math.random() * 100 < 30) {
                setActivityLog((logs) => [
                  {
                    id: Date.now(),
                    timestamp: new Date().toLocaleTimeString(),
                    event: "Human Escalation",
                    amount: transactionValue,
                    status: "escalated",
                  },
                  ...logs.slice(0, 14),
                ]);
              }
            }, 800);
          }
        }

        // Update time series
        setTimeSeriesData((prev) => {
          const newData = [
            ...prev,
            {
              time: `${newStats.processed}`,
              processed: newStats.processed,
              failures: newStats.failures,
              recovered: newStats.recovered,
            },
          ];
          return newData.slice(-30);
        });

        return newStats;
      });
    }, 600);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, config]);

  const handleStart = () => {
    setStats({
      processed: 0,
      failures: 0,
      revenueAtRisk: 0,
      aiDecisions: 0,
      recoveryAttempts: 0,
      recovered: 0,
    });
    setActivityLog([]);
    setTimeSeriesData([]);
    setFunnelData({
      failed: 0,
      detected: 0,
      diagnosed: 0,
      policyChecked: 0,
      recoveryAttempted: 0,
      recovered: 0,
    });
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setStats({
      processed: 0,
      failures: 0,
      revenueAtRisk: 0,
      aiDecisions: 0,
      recoveryAttempts: 0,
      recovered: 0,
    });
    setActivityLog([]);
    setTimeSeriesData([]);
    setFunnelData({
      failed: 0,
      detected: 0,
      diagnosed: 0,
      policyChecked: 0,
      recoveryAttempted: 0,
      recovered: 0,
    });
  };

  const revenueAtRiskData = [
    { name: "At Risk", value: stats.revenueAtRisk, fill: "#ef4444" },
    { name: "Recovered", value: stats.recovered * 25000, fill: "#10b981" },
  ];

  const funnelStages = [
    { name: "Failed", value: funnelData.failed },
    { name: "Detected", value: funnelData.detected },
    { name: "Diagnosed", value: funnelData.diagnosed },
    { name: "Policy Checked", value: funnelData.policyChecked },
    { name: "Recovery Attempted", value: funnelData.recoveryAttempted },
    { name: "Recovered", value: funnelData.recovered },
  ];

  return (
    <section className="min-h-screen bg-slate-50 p-5 text-slate-800 sm:p-7">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="border-b border-slate-200 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Testing & Validation
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            Demo Simulator
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Simulate failed payments and observe the complete AI recovery
            workflow.
          </p>
        </div>

        {/* Configuration Panel */}
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            Simulation Configuration
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Number of Transactions
              </label>
              <input
                type="number"
                value={config.numTransactions}
                onChange={(e) =>
                  setConfig({ ...config, numTransactions: parseInt(e.target.value) })
                }
                disabled={isRunning}
                className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Min Transaction Value (₹)
              </label>
              <input
                type="number"
                value={config.minValue}
                onChange={(e) =>
                  setConfig({ ...config, minValue: parseInt(e.target.value) })
                }
                disabled={isRunning}
                className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Max Transaction Value (₹)
              </label>
              <input
                type="number"
                value={config.maxValue}
                onChange={(e) =>
                  setConfig({ ...config, maxValue: parseInt(e.target.value) })
                }
                disabled={isRunning}
                className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Failure Rate (%)
              </label>
              <input
                type="number"
                value={config.failureRate}
                onChange={(e) =>
                  setConfig({ ...config, failureRate: parseInt(e.target.value) })
                }
                disabled={isRunning}
                min="0"
                max="100"
                className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="aiEnabled"
                checked={config.aiEnabled}
                onChange={(e) =>
                  setConfig({ ...config, aiEnabled: e.target.checked })
                }
                disabled={isRunning}
                className="rounded"
              />
              <label
                htmlFor="aiEnabled"
                className="text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                AI Recovery Enabled
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="humanReviewEnabled"
                checked={config.humanReviewEnabled}
                onChange={(e) =>
                  setConfig({ ...config, humanReviewEnabled: e.target.checked })
                }
                disabled={isRunning}
                className="rounded"
              />
              <label
                htmlFor="humanReviewEnabled"
                className="text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Human Review Enabled
              </label>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleStart}
              disabled={isRunning}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:bg-slate-300"
            >
              ▶ Start Simulation
            </button>
            <button
              onClick={handlePause}
              disabled={!isRunning}
              className="px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 disabled:bg-slate-300"
            >
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-slate-600 text-white text-sm font-semibold rounded-lg hover:bg-slate-700"
            >
              ⟲ Reset
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Transactions Processed
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {stats.processed}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Failures Detected
            </p>
            <p className="mt-2 text-2xl font-bold text-red-600">{stats.failures}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Revenue at Risk
            </p>
            <p className="mt-2 text-2xl font-bold text-orange-600">
              ₹{(stats.revenueAtRisk / 100000).toFixed(1)}L
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Recovered Revenue
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">
              ₹{(stats.recovered * 25000 / 100000).toFixed(1)}L
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              AI Decisions
            </p>
            <p className="mt-2 text-2xl font-bold text-blue-600">
              {stats.aiDecisions}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Recovery Attempts
            </p>
            <p className="mt-2 text-2xl font-bold text-indigo-600">
              {stats.recoveryAttempts}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Recovery Rate
            </p>
            <p className="mt-2 text-2xl font-bold text-green-600">
              {recoveryRate}%
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </p>
            <p className="mt-2 text-sm font-semibold">
              {isRunning ? (
                <span className={isPaused ? "text-orange-600" : "text-green-600"}>
                  {isPaused ? "⏸ Paused" : "● Running"}
                </span>
              ) : (
                <span className="text-slate-500">Ready</span>
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Activity Feed */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">
              Activity Feed
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activityLog.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Activity will appear here during simulation...
                </p>
              ) : (
                activityLog.map((log) => (
                  <div
                    key={log.id}
                    className={`text-xs p-2 rounded border ${
                      log.status === "recovered"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : log.status === "escalated"
                          ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                          : log.status === "diagnosed"
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "bg-red-50 border-red-200 text-red-700"
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{log.event}</span>
                      <span className="text-[10px]">{log.timestamp}</span>
                    </div>
                    <div className="text-slate-600">
                      Amount: ₹{(log.amount / 1000).toFixed(1)}K
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Charts Column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Transactions Over Time */}
            {timeSeriesData.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">
                  Transactions Over Time
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid stroke="#e5e7eb" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="processed"
                        stroke="#3b82f6"
                        dot={false}
                        name="Processed"
                      />
                      <Line
                        type="monotone"
                        dataKey="failures"
                        stroke="#ef4444"
                        dot={false}
                        name="Failures"
                      />
                      <Line
                        type="monotone"
                        dataKey="recovered"
                        stroke="#10b981"
                        dot={false}
                        name="Recovered"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Revenue Chart */}
            {stats.revenueAtRisk > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">
                  Revenue at Risk vs Recovered
                </h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={revenueAtRiskData}
                      margin={{ left: -20, right: 10 }}
                    >
                      <CartesianGrid stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value) => `₹${(value / 100000).toFixed(1)}L`} />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recovery Funnel */}
        <div className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            AI Recovery Funnel
          </h2>
          <div className="space-y-3">
            {funnelStages.map((stage, idx) => {
              const maxValue = Math.max(...funnelStages.map((s) => s.value), 1);
              const percentage = (stage.value / maxValue) * 100;
              const colors = [
                "bg-red-500",
                "bg-orange-500",
                "bg-yellow-500",
                "bg-blue-500",
                "bg-indigo-500",
                "bg-emerald-500",
              ];

              return (
                <div key={idx}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">
                      {stage.name}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {stage.value}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-8 overflow-hidden">
                    <div
                      className={`h-full ${colors[idx]} transition-all duration-300 flex items-center justify-center`}
                      style={{ width: `${percentage}%` }}
                    >
                      {percentage > 10 && (
                        <span className="text-xs font-bold text-white">
                          {percentage.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
