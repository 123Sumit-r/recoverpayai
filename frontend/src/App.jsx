import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import RevenueRecoveryChart from './components/RevenueRecoveryChart';
import TransactionExplorer from './components/TransactionExplorer';
import RecoveryCases, { RecoveryCaseDetail } from './components/RecoveryCases';
import AgentActivity from './components/AgentActivity';
import HumanReview from './components/HumanReview';
import AuditLedger from './components/AuditLedger';
import DemoSimulator from './components/DemoSimulator';
import RevenueRisk from './components/RevenueRisk';
import MeasuredRecovery from './components/MeasuredRecovery';
import SystemArchitecture from './components/SystemArchitecture';
import AgentConfiguration from './components/AgentConfiguration';
import PoliciesSafety from './components/PoliciesSafety';
import SettingsRazorpay from './components/SettingsRazorpay';
import Sidebar from './components/Sidebar';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

// Formatters for human-friendly display
function formatRootCause(code) {
  if (!code) return 'Unknown Issue';
  const labels = {
    expired_card: 'Expired Card',
    insufficient_funds: 'Insufficient Funds',
    bank_declined: 'Bank Declined',
    temporary_failure: 'Temporary Gateway Failure',
    invalid_payment_method: 'Invalid Payment Method',
    overdue_invoice: 'Overdue Invoice',
    price_concern: 'Price Concern',
    payment_friction: 'Payment Friction',
    technical_issue: 'Technical Checkout Issue',
    user_distraction: 'User Distraction',
    unknown_abandonment: 'Checkout Abandoned'
  };
  return labels[code] || code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAction(action) {
  if (!action) return 'Pending Analysis';
  const labels = {
    request_payment_method_update: 'Request Payment Method Update',
    retry_payment: 'Instant Payment Retry',
    retry_payment_later: 'Schedule Smart Retry',
    send_payment_reminder: 'Send Payment Reminder',
    send_invoice_notification: 'Send Invoice Notification',
    send_checkout_recovery: 'Send Checkout Recovery Link',
    escalate_to_human: 'Escalate to Human Agent'
  };
  return labels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusBadge(status) {
  switch (status) {
    case 'recovered':
      return { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Recovered' };
    case 'email_sent':
      return { cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Email Sent' };
    case 'open':
      return { cls: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Open' };
    case 'escalated':
      return { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Escalated' };
    case 'failed':
      return { cls: 'bg-red-50 text-red-700 border-red-200', label: 'Failed' };
    default:
      return { cls: 'bg-gray-50 text-gray-600 border-gray-200', label: status || 'Pending' };
  }
}

function getReasonBadge(reason) {
  const map = {
    expired_card: 'bg-amber-50 text-amber-700 border-amber-200',
    insufficient_funds: 'bg-red-50 text-red-700 border-red-200',
    bank_declined: 'bg-purple-50 text-purple-700 border-purple-200',
    temporary_failure: 'bg-blue-50 text-blue-700 border-blue-200',
    invalid_payment_method: 'bg-amber-50 text-amber-700 border-amber-200',
    overdue_invoice: 'bg-orange-50 text-orange-700 border-orange-200',
    price_concern: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    payment_friction: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    technical_issue: 'bg-red-50 text-red-700 border-red-200',
    user_distraction: 'bg-blue-50 text-blue-700 border-blue-200',
    unknown_abandonment: 'bg-gray-50 text-gray-600 border-gray-200'
  };
  return map[reason] || 'bg-gray-50 text-gray-600 border-gray-200';
}

function getRiskBadge(level) {
  switch (level?.toLowerCase()) {
    case 'critical':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'high':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'medium':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'low':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

function DashboardPage({ defaultTab = 'overview' }) {
  const [risk, setRisk] = useState(null);
  const [summary, setSummary] = useState(null);
  const [failedTransactions, setFailedTransactions] = useState([]);
  const [abandonedCheckouts, setAbandonedCheckouts] = useState([]);
  const [overdueInvoices, setOverdueInvoices] = useState([]);
  const [cases, setCases] = useState([]);
  const [revenuePerformance, setRevenuePerformance] = useState([]);
  const [revenuePerformanceLoading, setRevenuePerformanceLoading] = useState(true);
  const [revenuePerformanceError, setRevenuePerformanceError] = useState('');
  const [baselineRecoveredRevenue, setBaselineRecoveredRevenue] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyzingTransaction, setAnalyzingTransaction] = useState(null);
  const [analyzingCheckoutId, setAnalyzingCheckoutId] = useState(null);
  const [analyzingInvoiceId, setAnalyzingInvoiceId] = useState(null);
  const [executingCaseId, setExecutingCaseId] = useState(null);
  const [activeTab, setActiveTab] = useState(defaultTab); // 'overview' | 'queue' | 'invoices' | 'payments' | 'checkouts'
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseAuditLogs, setCaseAuditLogs] = useState([]);
  const [caseEmailLogs, setCaseEmailLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals for Real Data Input & Email Test
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState('payment'); // 'payment' | 'invoice' | 'checkout'
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    amount: '',
    failure_reason: 'insufficient_funds',
    due_date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    abandonment_reason: 'payment_friction'
  });

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  useEffect(() => setActiveTab(defaultTab), [defaultTab]);

  const chartRevenueAtRisk = revenuePerformance.reduce((total, item) => total + Number(item.revenueAtRisk || 0), 0);
  const chartRecoveredRevenue = revenuePerformance.reduce((total, item) => total + Number(item.recoveredRevenue || 0), 0);
  const chartRecoveryRate = chartRevenueAtRisk ? (chartRecoveredRevenue / chartRevenueAtRisk) * 100 : 0;
  const policyGatedAmount = cases.reduce((total, item) => total + (item.policy_allowed ? Number(item.amount_at_risk || 0) : 0), 0);
  const pendingActionsAmount = cases.reduce((total, item) => total + (['open', 'processing', 'email_sent'].includes(item.status) ? Number(item.amount_at_risk || 0) : 0), 0);
  const escalatedAmount = cases.reduce((total, item) => total + (item.status === 'escalated' ? Number(item.amount_at_risk || 0) : 0), 0);
  const stoppedAmount = cases.reduce((total, item) => total + (item.status === 'failed' ? Number(item.amount_at_risk || 0) : 0), 0);

  async function refresh() {
    setLoading(true);
    setRevenuePerformanceLoading(true);
    setRevenuePerformanceError('');
    try {
      const [riskResponse, summaryResponse, transactionResponse, checkoutResponse, invoiceResponse, caseResponse, performanceResponse] =
        await Promise.all([
          api.get('/risk/summary'),
          api.get('/recovery/summary'),
          api.get('/transactions/failed'),
          api.get('/checkouts/abandoned'),
          api.get('/invoices/overdue'),
          api.get('/recovery/cases'),
          api.get('/recovery/revenue-performance')
        ]);
      setRisk(riskResponse.data.data);
      setSummary(summaryResponse.data.data);
      setFailedTransactions(transactionResponse.data.data || []);
      setAbandonedCheckouts(checkoutResponse.data.data || []);
      setOverdueInvoices(invoiceResponse.data.data || []);
      setCases(caseResponse.data.data || []);
      setRevenuePerformance(performanceResponse.data.data || []);
      setBaselineRecoveredRevenue(performanceResponse.data.baselineRecoveredRevenue ?? null);

      if (selectedCase) {
        const updated = (caseResponse.data.data || []).find((c) => c.id === selectedCase.id);
        if (updated) setSelectedCase(updated);
      }
    } catch {
      setError('Could not load recovery workspace. Verify PostgreSQL and backend are running.');
      setRevenuePerformanceError('Could not load revenue recovery performance.');
    } finally {
      setLoading(false);
      setRevenuePerformanceLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function analyze(transactionId) {
    setError('');
    setMessage(`Analyzing transaction #${transactionId} with Groq AI...`);
    setAnalyzingTransaction(transactionId);
    try {
      const created = await api.post('/recovery/cases', { transaction_id: transactionId });
      const analysis = await api.post(`/recovery/${created.data.data.id}/ai-analyze`);
      setMessage(
        `Case #${created.data.data.id} analyzed successfully: ${formatAction(
          analysis.data.data.analysis?.recommended_action
        )}.`
      );
      await refresh();
      if (analysis.data.data.case) {
        inspectCase(analysis.data.data.case);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Case analysis failed.');
    } finally {
      setAnalyzingTransaction(null);
    }
  }

  async function execute(caseId) {
    setError('');
    setExecutingCaseId(caseId);
    try {
      const response = await api.post(`/recovery/${caseId}/execute`);
      if (response.data.success) {
        setMessage(`Case #${caseId}: ${response.data.data?.status === 'email_sent' ? 'Notification email dispatched to customer' : response.data.data?.status || 'Action executed successfully'}.`);
      } else {
        setMessage(`Case #${caseId}: Policy blocked the action.`);
      }
      await refresh();
      if (selectedCase && selectedCase.id === caseId) {
        inspectCase({ ...selectedCase, id: caseId });
      }
    } catch (requestError) {
      setMessage(requestError.response?.data?.data?.policy?.reason || 'Recovery action was rejected by policy.');
      await refresh();
    } finally {
      setExecutingCaseId(null);
    }
  }

  function analyzeFirstFailedPayment() {
    if (failedTransactions[0]) analyze(failedTransactions[0].id);
  }

  async function analyzeCheckout(checkoutId) {
    setError('');
    setMessage(`Analyzing checkout #${checkoutId} with Groq AI...`);
    setAnalyzingCheckoutId(checkoutId);
    try {
      const created = await api.post('/recovery/cases', { checkout_event_id: checkoutId });
      const analysis = await api.post(`/recovery/${created.data.data.id}/ai-analyze`);
      setMessage(
        `Checkout Case #${created.data.data.id} analyzed: ${formatAction(
          analysis.data.data.analysis?.recommended_action
        )}.`
      );
      await refresh();
      if (analysis.data.data.case) {
        inspectCase(analysis.data.data.case);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Checkout analysis failed.');
    } finally {
      setAnalyzingCheckoutId(null);
    }
  }

  async function analyzeInvoice(invoiceId) {
    setError('');
    setMessage(`Analyzing invoice #${invoiceId} with Groq AI...`);
    setAnalyzingInvoiceId(invoiceId);
    try {
      const created = await api.post('/recovery/cases', { invoice_id: invoiceId });
      const analysis = await api.post(`/recovery/${created.data.data.id}/ai-analyze`);
      setMessage(
        `Invoice Case #${created.data.data.id} analyzed: ${formatAction(
          analysis.data.data.analysis?.recommended_action
        )}.`
      );
      await refresh();
      if (analysis.data.data.case) {
        inspectCase(analysis.data.data.case);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Invoice analysis failed.');
    } finally {
      setAnalyzingInvoiceId(null);
    }
  }

  async function inspectCase(caseItem) {
    setSelectedCase(caseItem);
    setLoadingAudit(true);
    try {
      const res = await api.get(`/recovery/${caseItem.id}`);
      if (res.data.data) {
        setSelectedCase(res.data.data);
        setCaseAuditLogs(res.data.audit || []);
        setCaseEmailLogs(res.data.emails || []);
      }
    } catch {
      setCaseAuditLogs([]);
      setCaseEmailLogs([]);
    } finally {
      setLoadingAudit(false);
    }
  }

  // Handle Real Data Ingestion
  async function handleCreateSubmit(e) {
    e.preventDefault();
    if (!formData.customer_name || !formData.customer_email || !formData.customer_phone || !formData.amount) {
      setError('Please fill in all required fields, including customer phone.');
      return;
    }
    setFormSubmitting(true);
    setError('');

    try {
      let createdCaseId = null;

      if (createType === 'payment') {
        const txnRes = await api.post('/transactions', {
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          amount: Number(formData.amount),
          failure_reason: formData.failure_reason,
          status: 'failed'
        });
        const caseRes = await api.post('/recovery/cases', { transaction_id: txnRes.data.data.id });
        createdCaseId = caseRes.data.data.id;
      } else if (createType === 'invoice') {
        const invRes = await api.post('/invoices', {
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          amount: Number(formData.amount),
          due_date: formData.due_date,
          status: 'overdue'
        });
        const caseRes = await api.post('/recovery/cases', { invoice_id: invRes.data.data.id });
        createdCaseId = caseRes.data.data.id;
      } else if (createType === 'checkout') {
        const chkRes = await api.post('/checkouts', {
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          amount: Number(formData.amount),
          status: 'abandoned',
          abandonment_reason: formData.abandonment_reason
        });
        const caseRes = await api.post('/recovery/cases', { checkout_event_id: chkRes.data.data.id });
        createdCaseId = caseRes.data.data.id;
      }

      // Auto-analyze with AI & execute policy-approved recovery email immediately
      let execMsg = '';
      if (createdCaseId) {
        try {
          await api.post(`/recovery/${createdCaseId}/ai-analyze`);
          const execRes = await api.post(`/recovery/${createdCaseId}/execute`);
          const status = execRes.data?.data?.status;
          const emailSuccess = execRes.data?.data?.email?.success === true && Boolean(execRes.data?.data?.email?.emailId || execRes.data?.data?.email?.message_id);
          execMsg = emailSuccess
            ? ' Recovery email dispatched successfully.'
            : status === 'email_sent'
              ? ' Recovery action recorded, but no valid provider confirmation was returned.'
              : ` Action executed (${status || 'completed'}).`;
        } catch (execErr) {
          execMsg = ` Notice: ${execErr.response?.data?.message || execErr.message}`;
        }
      }

      setMessage(`Case #${createdCaseId} created.${execMsg}`);
      setShowCreateModal(false);
      setFormData({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        amount: '',
        failure_reason: 'insufficient_funds',
        due_date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
        abandonment_reason: 'payment_friction'
      });
      await refresh();
      if (createdCaseId) {
        inspectCase({ id: createdCaseId });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create real entry in database.');
    } finally {
      setFormSubmitting(false);
    }
  }

  // Handle Safe Test Email Dispatch
  async function handleSendTestEmail(e) {
    e.preventDefault();
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setSendingTestEmail(true);
    setError('');

    try {
      const res = await api.post('/email/test', {
        to: testEmailAddress,
        subject: 'RecoverPay AI — Email Integration Test'
      });
      const emailId = res.data.emailId || res.data.data?.message_id || '';
      if (!emailId) {
        setError('Email delivery failed: the backend did not receive a valid Resend message ID.');
        return;
      }

      setMessage(`Email sent successfully to ${testEmailAddress}. ID: ${emailId}`);
      setShowEmailModal(false);
      setTestEmailAddress('');
    } catch (err) {
      setError(err.response?.data?.message || 'Email delivery failed. Check backend logs for details.');
    } finally {
      setSendingTestEmail(false);
    }
  }

  // Filtered lists
  const filteredCases = cases.filter(
    (c) =>
      c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.failure_reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.recommended_action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.id).includes(searchTerm)
  );

  const filteredTransactions = failedTransactions.filter(
    (t) =>
      t.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.failure_reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(t.id).includes(searchTerm)
  );

  const filteredCheckouts = abandonedCheckouts.filter(
    (ch) =>
      ch.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ch.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ch.abandonment_reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ch.session_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInvoices = overdueInvoices.filter(
    (inv) =>
      inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(inv.id).includes(searchTerm)
  );

  const latestAiCase = cases.find((c) => c.diagnosis || c.ai_analysis) || cases[0];

  const Spinner = ({ size = 'w-3.5 h-3.5' }) => (
    <svg className={`${size} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
    </svg>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-orange-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-semibold text-base text-gray-900">RecoverPay AI</span>
              <span className="hidden sm:inline px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200 rounded">
                v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Real Data Mode Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>REAL DATA MODE</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>PostgreSQL Active</span>
              <span className="text-gray-300 mx-1">·</span>
              <span>Policy Engine Active</span>
            </div>

            <button
              onClick={() => setShowEmailModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors"
              title="Send a real test email to verify your email provider integration"
            >
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Test Email</span>
            </button>

            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors disabled:opacity-50"
            >
              <svg
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{loading ? 'Syncing…' : 'Sync'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col gap-6">
        {/* Banner Alerts */}
        {error && (
          <div className="px-4 py-3 rounded-md bg-red-50 border border-red-200 text-red-800 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {message && (
          <div className="px-4 py-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage('')} className="text-emerald-400 hover:text-emerald-600 ml-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Dashboard Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Revenue Recovery Operations</h1>
            <p className="text-sm text-gray-500 mt-0.5">Real database records, Groq AI root-cause diagnosis, and policy-governed email recovery</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Create Recovery Case</span>
            </button>

            <button
              onClick={analyzeFirstFailedPayment}
              disabled={!failedTransactions.length || analyzingTransaction !== null}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors disabled:opacity-50"
            >
              {analyzingTransaction !== null ? (
                <>
                  <Spinner />
                  <span>Analyzing…</span>
                </>
              ) : (
                <span>Analyze First Payment</span>
              )}
            </button>
          </div>
        </div>

        {/* Primary KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment Revenue At Risk</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{money(chartRevenueAtRisk)}</p>
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-400">
              <span>Failed payments only</span>
              <span>{failedTransactions.length} records</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment Recovered</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-600">{money(summary?.amount_recovered)}</p>
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-400">
              <span className="text-emerald-600 font-medium">{summary?.recovered_cases ?? 0} settled</span>
              <span>{summary?.total_cases ?? 0} total cases</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recovery Rate</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-gray-900">{chartRecoveryRate.toFixed(1)}%</span>
              <span className="text-xs text-gray-400">by recovered amount</span>
            </div>
            <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, chartRecoveryRate))}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Risk Records</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{risk?.failed_payment_count ?? 0}</p>
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-400">
              <span>Overdue: {risk?.overdue_invoice_count ?? 0}</span>
              <span>Abandoned: {risk?.checkout_abandonment_count ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Pending Actions', pendingActionsAmount],
            ['Escalated to Human', escalatedAmount],
            ['Stopped / Reached Cap', stoppedAmount],
            ['Total Monitored', failedTransactions.length]
          ].map(([label, value], index) => (
            <div key={label} className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-slate-200 shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
              <p className={`mt-1 text-sm font-semibold ${index === 1 ? 'text-indigo-300' : index === 2 ? 'text-slate-300' : 'text-white'}`}>{index === 3 ? `${value} payments` : money(value)}</p>
            </div>
          ))}
        </div>

        <RevenueRecoveryChart
          data={revenuePerformance}
          loading={revenuePerformanceLoading}
          error={revenuePerformanceError}
          baselineRecoveredRevenue={baselineRecoveredRevenue}
        />

        {/* AI Case Spotlight */}
        {latestAiCase && (
          <section className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-gray-900">AI Case Intelligence</h2>
                  <span className="px-1.5 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200 rounded">
                    Case #{latestAiCase.id}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Customer: <strong>{latestAiCase.customer_name}</strong> ({latestAiCase.customer_email}) · Amount: <strong>{money(latestAiCase.amount_at_risk)}</strong>
                </p>
              </div>
              <button
                onClick={() => inspectCase(latestAiCase)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 transition-colors"
              >
                View Audit Trail →
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-100 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">1. Root-Cause Diagnosis</span>
                  <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${getRiskBadge(latestAiCase.risk_level || 'medium')}`}>
                    {latestAiCase.risk_level ? `${latestAiCase.risk_level.toUpperCase()} RISK` : 'MEDIUM RISK'}
                  </span>
                </div>
                <div className="mt-2">
                  <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded border ${getReasonBadge(latestAiCase.diagnosis_code || latestAiCase.failure_reason)}`}>
                    {formatRootCause(latestAiCase.diagnosis_code || latestAiCase.failure_reason)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                  {latestAiCase.diagnosis || 'Analysis pending.'}
                </p>
              </div>

              <div className="border border-gray-100 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">2. Recovery Strategy</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded border bg-blue-50 text-blue-700 border-blue-200">
                    Recommended
                  </span>
                </div>
                <div className="mt-2">
                  <span className="inline-flex px-2 py-0.5 text-[11px] font-semibold rounded border bg-blue-50 text-blue-700 border-blue-200">
                    {formatAction(latestAiCase.recommended_action)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                  {latestAiCase.ai_analysis?.reason || 'Compliance-safe recovery action suggested.'}
                </p>
              </div>

              <div className="border border-gray-100 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">3. Policy Engine Gate</span>
                  {latestAiCase.policy_allowed === null ? (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded border bg-gray-50 text-gray-500 border-gray-200">
                      Pending
                    </span>
                  ) : latestAiCase.policy_allowed ? (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                      ✓ Approved
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded border bg-red-50 text-red-700 border-red-200">
                      ✕ Blocked
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                  {latestAiCase.policy_reason || 'Policy engine verifies retry limits, aging, and high-value rules.'}
                </p>

                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Status:</span>
                    {(() => {
                      const badge = getStatusBadge(latestAiCase.status);
                      return (
                        <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                  <button
                    onClick={() => execute(latestAiCase.id)}
                    disabled={['recovered', 'closed'].includes(latestAiCase.status) || executingCaseId === latestAiCase.id}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {executingCaseId === latestAiCase.id ? 'Executing…' : 'Execute Action'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tab Navigation & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: 'overview', label: 'All Queues', count: cases.length },
              { id: 'queue', label: 'Recovery Cases', count: cases.length },
              { id: 'invoices', label: 'Overdue Invoices', count: overdueInvoices.length },
              { id: 'payments', label: 'Failed Payments', count: failedTransactions.length },
              { id: 'checkouts', label: 'Abandoned Checkouts', count: abandonedCheckouts.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search by customer or email…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-56 pl-8 pr-3 py-1.5 text-xs rounded-md bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
            <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* 1. Recovery Cases Table */}
        {(activeTab === 'overview' || activeTab === 'queue') && (
          <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Recovery Cases Queue</h2>
                <p className="text-xs text-gray-500 mt-0.5">PostgreSQL records scheduled for AI analysis & policy verification</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[11px] font-medium border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5">Case ID</th>
                    <th className="px-4 py-2.5">Customer & Email</th>
                    <th className="px-4 py-2.5">Amount</th>
                    <th className="px-4 py-2.5">Root Cause</th>
                    <th className="px-4 py-2.5">Recommended Action</th>
                    <th className="px-4 py-2.5">Policy</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCases.map((item) => {
                    const statusBadge = getStatusBadge(item.status);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-gray-700 font-medium">#{item.id}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{item.customer_name}</div>
                          <div className="text-[11px] text-gray-500">{item.customer_email}</div>
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-gray-900">{money(item.amount_at_risk)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium border ${getReasonBadge(item.failure_reason || item.case_type)}`}>
                            {formatRootCause(item.failure_reason || item.case_type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <div className="font-medium text-gray-800 truncate">{formatAction(item.recommended_action)}</div>
                          <div className="text-[11px] text-gray-400 truncate" title={item.diagnosis}>
                            {item.diagnosis || 'Pending analysis'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {item.policy_allowed === null ? (
                            <span className="text-gray-400">—</span>
                          ) : item.policy_allowed ? (
                            <span className="text-[11px] font-medium text-emerald-600">✓ Approved</span>
                          ) : (
                            <span className="text-[11px] font-medium text-red-600">✕ Blocked</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded border ${statusBadge.cls}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => inspectCase(item)}
                              className="px-2 py-1 text-xs font-medium rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition-colors"
                            >
                              Inspect
                            </button>
                            <button
                              disabled={['recovered', 'closed'].includes(item.status) || executingCaseId === item.id}
                              onClick={() => execute(item.id)}
                              className="px-2.5 py-1 text-xs font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {executingCaseId === item.id ? 'Executing…' : 'Execute'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredCases.length && (
                    <tr>
                      <td colSpan="8" className="px-4 py-10 text-center text-gray-400">
                        No recovery cases found. Click <strong>"+ Create Recovery Case"</strong> to add a real test entry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 2. Failed Payments Table */}
        {(activeTab === 'overview' || activeTab === 'payments') && (
          <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Failed Payments (PostgreSQL)</h2>
              <p className="text-xs text-gray-500 mt-0.5">Real transaction failure records</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[11px] font-medium border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5">Txn ID</th>
                    <th className="px-4 py-2.5">Customer</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">Amount</th>
                    <th className="px-4 py-2.5">Failure Reason</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.slice(0, 15).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-gray-700">#{item.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.customer_name || `Customer #${item.customer_id}`}</td>
                      <td className="px-4 py-3 text-gray-500">{item.customer_email || '—'}</td>
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">{money(item.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium border ${getReasonBadge(item.failure_reason)}`}>
                          {formatRootCause(item.failure_reason)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => analyze(item.id)}
                          disabled={analyzingTransaction === item.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50 ml-auto"
                        >
                          {analyzingTransaction === item.id ? (
                            <>
                              <Spinner />
                              <span>Analyzing…</span>
                            </>
                          ) : (
                            <span>Analyze Case</span>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!filteredTransactions.length && (
                    <tr>
                      <td colSpan="6" className="px-4 py-10 text-center text-gray-400">
                        No failed payments found in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 3. Overdue Invoices Table */}
        {(activeTab === 'overview' || activeTab === 'invoices') && (
          <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Overdue Commercial Invoices</h2>
              <p className="text-xs text-gray-500 mt-0.5">B2B accounts receivable with dynamically computed days overdue</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[11px] font-medium border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5">Invoice</th>
                    <th className="px-4 py-2.5">Customer & Email</th>
                    <th className="px-4 py-2.5">Amount</th>
                    <th className="px-4 py-2.5">Due Date</th>
                    <th className="px-4 py-2.5">Days Overdue</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.slice(0, 15).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-gray-700">#{item.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.customer_name}</div>
                        <div className="text-[11px] text-gray-500">{item.customer_email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">{money(item.amount)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
                          {item.days_overdue || 0}d overdue
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => analyzeInvoice(item.id)}
                          disabled={analyzingInvoiceId === item.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50 ml-auto"
                        >
                          {analyzingInvoiceId === item.id ? (
                            <>
                              <Spinner />
                              <span>Analyzing…</span>
                            </>
                          ) : (
                            <span>Analyze Case</span>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!filteredInvoices.length && (
                    <tr>
                      <td colSpan="6" className="px-4 py-10 text-center text-gray-400">
                        No overdue invoices found in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 4. Abandoned Checkouts Table */}
        {(activeTab === 'overview' || activeTab === 'checkouts') && (
          <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Abandoned Checkouts</h2>
              <p className="text-xs text-gray-500 mt-0.5">E-commerce cart sessions requiring recovery intervention</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[11px] font-medium border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5">Session</th>
                    <th className="px-4 py-2.5">Customer & Email</th>
                    <th className="px-4 py-2.5">Cart Amount</th>
                    <th className="px-4 py-2.5">Abandonment Trigger</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCheckouts.slice(0, 15).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-gray-700 font-medium">{item.session_id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.customer_name}</div>
                        <div className="text-[11px] text-gray-500">{item.customer_email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">{money(item.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium border ${getReasonBadge(item.abandonment_reason)}`}>
                          {formatRootCause(item.abandonment_reason || 'unknown_abandonment')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => analyzeCheckout(item.id)}
                          disabled={analyzingCheckoutId === item.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50 ml-auto"
                        >
                          {analyzingCheckoutId === item.id ? (
                            <>
                              <Spinner />
                              <span>Analyzing…</span>
                            </>
                          ) : (
                            <span>Analyze Case</span>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!filteredCheckouts.length && (
                    <tr>
                      <td colSpan="5" className="px-4 py-10 text-center text-gray-400">
                        No abandoned checkouts found in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Deterministic Policy Engine Active · Audited PostgreSQL Backend · Real Email Integration</span>
          </div>
          <div>Sandboxed financial transactions with live transactional notification capabilities.</div>
        </footer>
      </div>

      {/* Modal: Create Real Recovery Entry */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowCreateModal(false)}>
          <div
            className="relative w-full max-w-lg rounded-lg bg-white border border-gray-200 shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Create Real Recovery Entry</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {/* Entry Type Selector */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Entry Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'payment', label: 'Failed Payment' },
                    { id: 'invoice', label: 'Overdue Invoice' },
                    { id: 'checkout', label: 'Abandoned Cart' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setCreateType(t.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border text-center transition-colors ${
                        createType === t.id
                          ? 'bg-orange-50 text-orange-700 border-orange-300 font-semibold'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Real Email Address */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Customer Real Email Address *
                  <span className="text-[11px] text-gray-400 font-normal ml-1">(Where recovery emails will be sent)</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. your-email@gmail.com"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Real Phone Number */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Customer Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount at Risk (₹) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 1499"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Type-Specific Fields */}
              {createType === 'payment' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Payment Failure Reason</label>
                  <select
                    value={formData.failure_reason}
                    onChange={(e) => setFormData({ ...formData, failure_reason: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="insufficient_funds">Insufficient Funds (Smart later retry)</option>
                    <option value="expired_card">Expired Card (Request payment update)</option>
                    <option value="bank_declined">Bank Declined (Request payment update)</option>
                    <option value="temporary_failure">Temporary Gateway Failure (Instant retry)</option>
                    <option value="invalid_payment_method">Invalid Payment Method (Update card)</option>
                  </select>
                </div>
              )}

              {createType === 'invoice' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Due Date</label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              )}

              {createType === 'checkout' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Abandonment Trigger</label>
                  <select
                    value={formData.abandonment_reason}
                    onChange={(e) => setFormData({ ...formData, abandonment_reason: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="payment_friction">Payment Friction (Payment form hesitation)</option>
                    <option value="price_concern">Price Concern (Unexpected charges/shipping)</option>
                    <option value="technical_issue">Technical Issue (Gateway error / timeout)</option>
                    <option value="user_distraction">User Distraction (Left cart open)</option>
                    <option value="unknown_abandonment">Unknown Abandonment</option>
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50"
                >
                  {formSubmitting ? (
                    <>
                      <Spinner />
                      <span>Saving to PostgreSQL…</span>
                    </>
                  ) : (
                    <span>Save to Database</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Test Real Email */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowEmailModal(false)}>
          <div
            className="relative w-full max-w-md rounded-lg bg-white border border-gray-200 shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Send Test Email</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSendTestEmail} className="p-6 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                Test your email integration directly. Enter your real email address below to receive an authenticated RecoverPay AI recovery notification.
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Your Real Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. your-name@gmail.com"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>This sends a live test notification via Resend. No real payment charge is made.</span>
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingTestEmail}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50"
                >
                  {sendingTestEmail ? (
                    <>
                      <Spinner />
                      <span>Sending Email…</span>
                    </>
                  ) : (
                    <span>Send Test Email</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Case Inspector Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelectedCase(null)}>
          <div
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white border border-gray-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900">Case #{selectedCase.id} Inspector</h3>
                  {(() => {
                    const b = getStatusBadge(selectedCase.status);
                    return (
                      <span className={`px-2 py-0.5 text-[11px] font-medium rounded border ${b.cls}`}>
                        {b.label}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Customer: <strong>{selectedCase.customer_name}</strong> ({selectedCase.customer_email})
                </p>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-md bg-gray-50 border border-gray-100">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Amount At Risk</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 font-mono">{money(selectedCase.amount_at_risk)}</p>
                </div>
                <div className="p-3 rounded-md bg-gray-50 border border-gray-100">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Payment Recovered</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-600 font-mono">{money(selectedCase.amount_recovered)}</p>
                </div>
                <div className="p-3 rounded-md bg-gray-50 border border-gray-100">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Retries / Reminders</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 font-mono">{selectedCase.retry_count ?? 0} / {selectedCase.reminder_count ?? 0}</p>
                </div>
                <div className="p-3 rounded-md bg-gray-50 border border-gray-100">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Risk Assessment</p>
                  <span className={`inline-block mt-1 px-1.5 py-0.5 text-[11px] font-medium rounded border ${getRiskBadge(selectedCase.risk_level || 'medium')}`}>
                    {(selectedCase.risk_level || 'medium').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-md border border-gray-200">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">AI Root-Cause Diagnosis</span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${getReasonBadge(selectedCase.diagnosis_code || selectedCase.failure_reason)}`}>
                      {formatRootCause(selectedCase.diagnosis_code || selectedCase.failure_reason)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-700 leading-relaxed">
                    {selectedCase.diagnosis || 'Diagnosis pending computation.'}
                  </p>
                </div>

                <div className="p-4 rounded-md border border-gray-200">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Policy-Approved Action</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded border bg-blue-50 text-blue-700 border-blue-200">
                      Strategy
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-gray-900">{formatAction(selectedCase.recommended_action)}</p>
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                    {selectedCase.ai_analysis?.reason || 'Compliance-safe recovery step.'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-md border border-gray-200">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Policy Engine Verification</span>
                  {selectedCase.policy_allowed ? (
                    <span className="px-1.5 py-0.5 text-[11px] font-medium rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                      ✓ Approved
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 text-[11px] font-medium rounded border bg-red-50 text-red-700 border-red-200">
                      ✕ Policy Blocked
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  {selectedCase.policy_reason || 'Policy compliance verified.'}
                </p>
              </div>

              {/* Real Email Notifications (Resend) */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Email Notifications & Delivery (Resend)</h4>
                {caseEmailLogs.length ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {caseEmailLogs.map((em) => (
                      <div key={em.id} className="p-3 rounded-md bg-gray-50 border border-gray-100 text-xs flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              em.status === 'sent'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {em.status === 'sent' ? '✓ Accepted by Resend' : '✕ Delivery Failed'}
                            </span>
                            <span className="font-medium text-gray-800">{em.subject}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(em.sent_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center justify-between">
                          <span>Recipient: <strong>{em.recipient}</strong></span>
                          {em.provider_message_id && (
                            <span className="font-mono text-gray-400">ID: {em.provider_message_id}</span>
                          )}
                        </div>
                        {em.error_message && (
                          <div className="text-[11px] text-red-600 bg-red-50 p-1.5 rounded border border-red-100 mt-1">
                            Error: {em.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-md bg-gray-50 border border-gray-100 text-xs text-gray-500 flex items-center justify-between">
                    <span>No recovery email dispatched yet for this case.</span>
                    <span className="text-[11px] text-gray-400">Policy-gated</span>
                  </div>
                )}
              </div>

              {/* Audit Logs Timeline */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Audit Logs & History (PostgreSQL)</h4>
                {loadingAudit ? (
                  <p className="text-xs text-gray-400 py-4 text-center">Loading audit events…</p>
                ) : caseAuditLogs.length ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {caseAuditLogs.map((log) => (
                      <div key={log.id} className="px-3 py-2 rounded-md bg-gray-50 border border-gray-100 text-xs flex items-start justify-between gap-3">
                        <div>
                          <span className="font-medium text-gray-700 font-mono">[{log.event_type}]</span>
                          <span className="ml-1.5 text-gray-600">{log.message}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-2">No audit logs recorded for this case yet.</p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedCase(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 transition-colors"
              >
                Close
              </button>
              <button
                disabled={['recovered', 'closed'].includes(selectedCase.status) || executingCaseId === selectedCase.id}
                onClick={() => execute(selectedCase.id)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {executingCaseId === selectedCase.id ? 'Executing…' : 'Execute Recovery Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RouteShell({ title, description }) {
  return (
    <section className="min-h-screen bg-slate-50 p-6 text-slate-700 sm:p-10">
      <div className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600">RecoverAI workspace</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </section>
  );
}

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar activePath={location.pathname} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="app-main min-h-screen lg:ml-[260px]">
        <button type="button" onClick={() => setSidebarOpen(true)} className="fixed left-4 top-4 z-30 rounded-md border border-slate-200 bg-white p-2 text-slate-600 shadow-sm lg:hidden" aria-label="Open navigation">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/revenue-risk" element={<RevenueRisk />} />
          <Route path="/transactions" element={<TransactionExplorer />} />
          <Route path="/recovery-cases" element={<RecoveryCases />} />
          <Route path="/recovery-cases/:caseId" element={<RecoveryCaseDetail />} />
          <Route path="/agent-activity" element={<AgentActivity />} />
          <Route path="/human-review" element={<HumanReview />} />
          <Route path="/measured-recovery" element={<MeasuredRecovery />} />
          <Route path="/analytics" element={<MeasuredRecovery />} />
          <Route path="/audit-ledger" element={<AuditLedger />} />
          <Route path="/simulator" element={<DemoSimulator />} />
          <Route path="/architecture" element={<SystemArchitecture />} />
          <Route path="/agent-config" element={<AgentConfiguration />} />
          <Route path="/policies" element={<PoliciesSafety />} />
          <Route path="/settings" element={<SettingsRazorpay />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
