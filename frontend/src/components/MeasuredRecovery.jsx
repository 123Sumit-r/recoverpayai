import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const shortMoney = (value) =>
  Number(value || 0) >= 100000
    ? `₹${(Number(value) / 100000).toFixed(1)}L`
    : money(value);
const label = (value) =>
  (value || "Unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

function Metric({ title, value, note, color = "text-slate-900" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </p>
      <p className={`mt-2 text-xl font-semibold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}
function TooltipBox({ active, payload, label: chartLabel }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="mb-2 font-medium text-slate-700">{chartLabel}</p>
      {payload.map((item) => (
        <p key={item.dataKey} style={{ color: item.color }}>
          {item.name}:{" "}
          <strong className="text-slate-900">{money(item.value)}</strong>
        </p>
      ))}
    </div>
  );
}

export default function MeasuredRecovery() {
  const [series, setSeries] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      api.get("/recovery/revenue-performance"),
      api.get("/recovery/cases"),
    ])
      .then(([performance, caseResponse]) => {
        setSeries(performance.data.data || []);
        setCases(caseResponse.data.data || []);
      })
      .catch(() =>
        setError("Could not load measured recovery data from PostgreSQL."),
      )
      .finally(() => setLoading(false));
  }, []);
  const totals = series.reduce(
    (result, item) => ({
      risk: result.risk + Number(item.revenueAtRisk || 0),
      recovered: result.recovered + Number(item.recoveredRevenue || 0),
    }),
    { risk: 0, recovered: 0 },
  );
  const rate = totals.risk ? (totals.recovered / totals.risk) * 100 : 0;
  const recoveredCases = cases.filter((item) => item.status === "recovered");
  const recoveryCost = null;
  const baseline = null;
  const reasonRows = useMemo(() => {
    const groups = {};
    cases.forEach((item) => {
      const key = item.failure_reason || "unknown";
      if (!groups[key]) groups[key] = { cases: 0, risk: 0, recovered: 0 };
      groups[key].cases += 1;
      groups[key].risk += Number(item.amount_at_risk || 0);
      groups[key].recovered += Number(item.amount_recovered || 0);
    });
    return Object.entries(groups).map(([key, value]) => ({
      name: label(key),
      rate: value.risk ? (value.recovered / value.risk) * 100 : 0,
      ...value,
    }));
  }, [cases]);
  const segmentRows = useMemo(() => {
    const groups = {};
    cases.forEach((item) => {
      const key = item.customer_type || "unknown";
      if (!groups[key]) groups[key] = { cases: 0, risk: 0, recovered: 0 };
      groups[key].cases += 1;
      groups[key].risk += Number(item.amount_at_risk || 0);
      groups[key].recovered += Number(item.amount_recovered || 0);
    });
    return Object.entries(groups).map(([key, value]) => ({
      name: label(key),
      rate: value.risk ? (value.recovered / value.risk) * 100 : 0,
      ...value,
    }));
  }, [cases]);
  const strategyRows = useMemo(() => {
    const groups = {
      Email: [],
      Retry: [],
      "Smart Retry": [],
      "Payment Link": [],
      "Human Intervention": [],
    };
    cases.forEach((item) => {
      const action = item.last_action || item.recommended_action || "";
      const key =
        action.includes("reminder") ||
        action.includes("notification") ||
        action.includes("checkout")
          ? "Email"
          : action === "retry_payment_later"
            ? "Smart Retry"
            : action.includes("retry")
              ? "Retry"
              : action.includes("escalate")
                ? "Human Intervention"
                : "Payment Link";
      groups[key].push(item);
    });
    return Object.entries(groups).map(([strategy, items]) => {
      const recoveredItems = items.filter(
        (item) => item.status === "recovered",
      );
      const recoveredAmount = items.reduce(
        (sum, item) => sum + Number(item.amount_recovered || 0),
        0,
      );
      const attempts = items.reduce(
        (sum, item) =>
          sum +
          Number(item.retry_count || 0) +
          Number(item.reminder_count || 0),
        0,
      );
      const durations = recoveredItems
        .map(
          (item) =>
            new Date(item.updated_at).getTime() -
            new Date(item.created_at).getTime(),
        )
        .filter((value) => value >= 0);
      return {
        strategy,
        cases: items.length,
        attempts,
        recovered: recoveredItems.length,
        rate: items.length ? (recoveredItems.length / items.length) * 100 : 0,
        revenue: recoveredAmount,
        avgTime: durations.length
          ? `${(durations.reduce((sum, value) => sum + value, 0) / durations.length / 3600000).toFixed(1)}h`
          : "Unavailable",
      };
    });
  }, [cases]);
  if (loading)
    return (
      <section className="min-h-screen bg-slate-50 p-8 text-center text-sm text-slate-500">
        Loading measured recovery analytics...
      </section>
    );
  if (error)
    return (
      <section className="min-h-screen bg-slate-50 p-8 text-center text-sm text-red-600">
        {error}
      </section>
    );
  return (
    <section className="min-h-screen bg-slate-50 p-5 text-slate-800 sm:p-7">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">
              Business impact
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              Measured Recovery
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Measure recovered revenue, recovery efficiency and incremental
              impact.
            </p>
          </div>
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            Real outcomes only
          </span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Metric
            title="Recovery Rate"
            value={`${rate.toFixed(1)}%`}
            note="Recovered / at risk"
            color="text-blue-600"
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Recovery Rate by Failure Reason
            </h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reasonRows}>
                  <CartesianGrid stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    angle={-20}
                    textAnchor="end"
                    height={55}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    unit="%"
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => `${Number(value).toFixed(1)}%`}
                  />
                  <Bar
                    dataKey="rate"
                    name="Recovery Rate"
                    fill="#059669"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Recovery Rate by Customer Segment
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Uses customer type stored with each recovery case.
            </p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segmentRows}>
                  <CartesianGrid stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    unit="%"
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => `${Number(value).toFixed(1)}%`}
                  />
                  <Bar
                    dataKey="rate"
                    name="Recovery Rate"
                    fill="#2563eb"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Recovery Performance by Strategy
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Strategies are grouped from stored recommended or last actions.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-3">Strategy</th>
                  <th className="px-3 py-3">Cases</th>
                  <th className="px-3 py-3">Attempts</th>
                  <th className="px-3 py-3">Recovered</th>
                  <th className="px-3 py-3">Recovery Rate</th>
                  <th className="px-3 py-3">Average Recovery Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {strategyRows.map((item) => (
                  <tr key={item.strategy}>
                    <td className="px-3 py-3 font-medium text-slate-800">
                      {item.strategy}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{item.cases}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {item.attempts}
                    </td>
                    <td className="px-3 py-3 text-emerald-600">
                      {item.recovered}
                    </td>
                    <td className="px-3 py-3 text-blue-600">
                      {item.rate.toFixed(1)}%
                    </td>
                    <td className="px-3 py-3 text-slate-500">{item.avgTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}
