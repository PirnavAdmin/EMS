import React, { useState } from "react";
import {
  FaCreditCard,
  FaFileInvoiceDollar,
  FaRedo,
  FaWallet,
  FaShieldAlt,
  FaLock,
  FaCheckCircle,
  FaQrcode,
  FaBuilding,
  FaSearch,
  FaTimes,
  FaCheck,
  FaPrint,
  FaBolt,
  FaQuestionCircle,
  FaCopy
} from "react-icons/fa";
import "./SuperAdmin.css";
import "./Billing.css";
import "../Employees/EmployeeList.css";
import "../dashboard/Dashboard.css";
import {
  BILLING_STORAGE_KEYS,
  calculateInvoiceSnapshot,
  calculateLateFee,
  formatBillingPeriod,
  formatCurrency,
  formatDateDisplay,
  generateMonthlyInvoices,
  getBillingState,
  getBillingSummary,
  getDaysOverdue,
  getInvoicesWithStatus,
  resetBillingDemo,
  simulatePayment,
  updateClientBilling,
} from "../services/billingService";
import { getAuthenticatedUserSnapshot, getStoredAuthValue } from "../utils/authStorage";
import { isAdmin, isSuperAdmin } from "../utils/authorization";

const ADMIN_EMAIL = "admin@ems.com";
const SUPER_ADMIN_TABS = ["Clients", "Invoices", "Payments", "Overdue", "History"];
const ADMIN_TABS = ["My Invoices", "Pending Payment", "Payment History"];

const POPULAR_BANKS = [
  { name: "HDFC Bank", short: "HDFC", color: "#004c8f", initial: "H" },
  { name: "ICICI Bank", short: "ICICI", color: "#f37e20", initial: "i" },
  { name: "State Bank of India", short: "SBI", color: "#280071", initial: "S" },
  { name: "Axis Bank", short: "Axis", color: "#97144d", initial: "A" },
  { name: "Kotak Mahindra Bank", short: "Kotak", color: "#ed1c24", initial: "K" },
  { name: "Bank of Baroda", short: "BOB", color: "#f26522", initial: "B" },
];

const ALL_OTHER_BANKS = [
  "Punjab National Bank (PNB)",
  "Canara Bank",
  "Union Bank of India",
  "IndusInd Bank",
  "IDFC FIRST Bank",
  "Federal Bank",
  "Yes Bank",
  "Central Bank of India",
  "South Indian Bank",
  "Karur Vysya Bank"
];

const getCurrentUserEmail = () => {
  const snapshot = getAuthenticatedUserSnapshot();
  return (
    snapshot.adminEmail ||
    snapshot.user?.email ||
    snapshot.user?.Email ||
    snapshot.payload?.email ||
    getStoredAuthValue("email") ||
    getStoredAuthValue("adminEmail") ||
    (isAdmin() ? ADMIN_EMAIL : "")
  );
};

const normalizeStatusClass = (status = "") => String(status).toLowerCase();

function EmptyState({ children }) {
  return <div className="super-admin-empty">{children}</div>;
}

function StatusBadge({ status }) {
  return <span className={`super-admin-badge ${normalizeStatusClass(status)}`}>{status}</span>;
}

function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="emp-modal-overlay">
      <div className={`emp-modal-box billing-modal ${wide ? "billing-modal--wide" : ""}`}>
        <div className="emp-modal-header">
          <h3>{title}</h3>
          <button className="emp-modal-close-icon" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SummaryCards({ summary }) {
  const cards = [
    ["Total Clients", summary.totalClients, FaFileInvoiceDollar],
    ["Active Billing", summary.activeBilling, FaWallet],
    ["Pending Payments", summary.pendingPayments, FaCreditCard],
    ["Overdue", summary.overdue, FaCreditCard],
    ["Paid This Month", formatCurrency(summary.paidThisMonth), FaWallet],
    ["Outstanding Amount", formatCurrency(summary.outstandingAmount), FaFileInvoiceDollar],
  ];

  return (
    <div className="cards billing-summary-cards">
      {cards.map(([label, value, Icon]) => (
        <article className="card" key={label}>
          <div className="card-top">
            <div>
              <p className="card-label">{label}</p>
              <p className="card-value">{value}</p>
            </div>
            <span className="icon teal">
              {React.createElement(Icon)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function BillingTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="billing-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={activeTab === tab ? "active" : ""}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function DataTable({ columns, children, minWidth = 1200 }) {
  return (
    <div className="emp-table-container">
      <table className="emp-table billing-table" style={{ minWidth }}>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function ClientsTable({ clients, invoices, onManage }) {
  return (
    <DataTable
      minWidth={1500}
      columns={[
        "Client",
        "Admin",
        "Subscription",
        "EMS Start Date",
        "Current Users",
        "Price/User",
        "Monthly Amount",
        "Billing Status",
        "Invoice Status",
        "Amount Due",
        "Due Date",
        "Actions",
      ]}
    >
      {clients.map((client) => {
        const latestInvoice = invoices.find((invoice) => invoice.clientId === client.id);
        const monthlySnapshot = calculateInvoiceSnapshot(client, "2026-08-01", "2026-08-31");

        return (
          <tr className="emp-row-click" key={client.id}>
            <td>{client.clientName}</td>
            <td>{client.adminEmail}</td>
            <td>{client.subscriptionStatus}</td>
            <td>{formatDateDisplay(client.startDate)}</td>
            <td>{client.currentUsers}</td>
            <td>{formatCurrency(client.pricePerUser)}</td>
            <td>{formatCurrency(monthlySnapshot.subtotal)}</td>
            <td><StatusBadge status={client.billingStatus} /></td>
            <td><StatusBadge status={latestInvoice?.status || "Not Generated"} /></td>
            <td>{formatCurrency(latestInvoice?.balanceDue ?? monthlySnapshot.total)}</td>
            <td>{latestInvoice ? formatDateDisplay(latestInvoice.dueDate) : "-"}</td>
            <td className="emp-action-col">
              <button className="emp-action-btn emp-action-btn--edit" type="button" onClick={() => onManage(client)}>
                Manage
              </button>
            </td>
          </tr>
        );
      })}
    </DataTable>
  );
}

function InvoicesTable({ invoices, payments, onView, onPaymentDetails, adminMode = false, onPay }) {
  const columns = adminMode
    ? ["Invoice Number", "Billing Period", "Invoice Date", "Due Date", "Amount", "Status", "Action"]
    : [
        "Invoice Number",
        "Client",
        "Admin",
        "Billing Period",
        "Users",
        "Price/User",
        "Subtotal",
        "GST",
        "Total",
        "Invoice Date",
        "Due Date",
        "Status",
        "Actions",
      ];

  if (invoices.length === 0) {
    return <EmptyState>No invoices available yet.</EmptyState>;
  }

  return (
    <DataTable minWidth={adminMode ? 980 : 1650} columns={columns}>
      {invoices.map((invoice) => {
        const payment = payments.find((item) => item.invoiceId === invoice.id);

        return (
          <tr className="emp-row-click" key={invoice.id}>
            <td>{invoice.invoiceNumber}</td>
            {adminMode ? (
              <>
                <td>{formatBillingPeriod(invoice)}</td>
                <td>{formatDateDisplay(invoice.invoiceDate)}</td>
                <td>{formatDateDisplay(invoice.dueDate)}</td>
                <td>{formatCurrency(invoice.total)}</td>
                <td><StatusBadge status={invoice.status} /></td>
                <td className="emp-action-col billing-action-wide">
                  <div className="emp-action-buttons">
                    <button className="emp-action-btn emp-action-btn--edit" type="button" onClick={() => onView(invoice)}>
                      View
                    </button>
                    {invoice.status !== "PAID" && (
                      <button className="emp-action-btn emp-action-btn--edit" type="button" onClick={() => onPay(invoice)}>
                        Pay Now
                      </button>
                    )}
                  </div>
                </td>
              </>
            ) : (
              <>
                <td>{invoice.clientName}</td>
                <td>{invoice.adminEmail}</td>
                <td>{formatBillingPeriod(invoice)}</td>
                <td>{invoice.userCount}</td>
                <td>{formatCurrency(invoice.pricePerUser)}</td>
                <td>{formatCurrency(invoice.subtotal)}</td>
                <td>{formatCurrency(invoice.gst)}</td>
                <td>{formatCurrency(invoice.total)}</td>
                <td>{formatDateDisplay(invoice.invoiceDate)}</td>
                <td>{formatDateDisplay(invoice.dueDate)}</td>
                <td><StatusBadge status={invoice.status} /></td>
                <td className="emp-action-col billing-action-wide">
                  <div className="emp-action-buttons">
                    <button className="emp-action-btn emp-action-btn--edit" type="button" onClick={() => onView(invoice)}>
                      View
                    </button>
                    {invoice.status !== "PAID" ? (
                      <button className="emp-action-btn emp-action-btn--edit" type="button" onClick={() => onPay(invoice)}>
                        Pay Now
                      </button>
                    ) : (
                      <button
                        className="emp-action-btn emp-action-btn--edit"
                        type="button"
                        disabled={!payment}
                        onClick={() => payment && onPaymentDetails(payment)}
                      >
                        Payment
                      </button>
                    )}
                  </div>
                </td>
              </>
            )}
          </tr>
        );
      })}
    </DataTable>
  );
}

function PaymentsTable({ payments, onPaymentDetails }) {
  if (payments.length === 0) {
    return <EmptyState>No payments recorded yet.</EmptyState>;
  }

  return (
    <DataTable
      minWidth={1200}
      columns={["Transaction ID", "Invoice", "Client", "Admin", "Amount", "Payment Method", "Payment Date", "Payment Time", "Status"]}
    >
      {payments.map((payment) => (
        <tr className="emp-row-click" key={payment.id} onClick={() => onPaymentDetails(payment)}>
          <td>{payment.transactionId}</td>
          <td>{payment.invoiceNumber}</td>
          <td>{payment.clientName}</td>
          <td>{payment.adminEmail}</td>
          <td>{formatCurrency(payment.amount)}</td>
          <td>{payment.paymentMethod}</td>
          <td>{formatDateDisplay(payment.paymentDate)}</td>
          <td>{payment.paymentTime}</td>
          <td><StatusBadge status={payment.status} /></td>
        </tr>
      ))}
    </DataTable>
  );
}

function OverdueTable({ invoices, clients, onPay }) {
  const overdueInvoices = invoices.filter((invoice) => invoice.status !== "PAID" && getDaysOverdue(invoice) > 0);

  if (overdueInvoices.length === 0) {
    return <EmptyState>No overdue invoices.</EmptyState>;
  }

  return (
    <DataTable
      minWidth={1200}
      columns={["Client", "Invoice", "Original Amount", "Due Date", "Days Overdue", "Late Fee", "Total Payable", "Status"]}
    >
      {overdueInvoices.map((invoice) => {
        const client = clients.find((item) => item.id === invoice.clientId);
        const lateFee = calculateLateFee(invoice, client);

        return (
          <tr className="emp-row-click" key={invoice.id}>
            <td>{invoice.clientName}</td>
            <td>{invoice.invoiceNumber}</td>
            <td>{formatCurrency(invoice.total)}</td>
            <td>{formatDateDisplay(invoice.dueDate)}</td>
            <td>{getDaysOverdue(invoice)}</td>
            <td>{formatCurrency(lateFee)}</td>
            <td>{formatCurrency(Number(invoice.balanceDue || 0) + lateFee)}</td>
            <td>
              <button className="emp-action-btn emp-action-btn--edit" type="button" onClick={() => onPay(invoice)}>
                Pay Now
              </button>
            </td>
          </tr>
        );
      })}
    </DataTable>
  );
}

function HistoryTable({ history }) {
  if (history.length === 0) {
    return <EmptyState>No billing history yet.</EmptyState>;
  }

  return (
    <DataTable minWidth={1100} columns={["Date", "Time", "Client", "Action", "Invoice", "Details"]}>
      {history.map((item) => (
        <tr className="emp-row-click" key={item.id}>
          <td>{formatDateDisplay(item.date)}</td>
          <td>{item.time}</td>
          <td>{item.clientName}</td>
          <td>{item.action}</td>
          <td>{item.invoice}</td>
          <td>{item.details}</td>
        </tr>
      ))}
    </DataTable>
  );
}

function ManageClientModal({ client, onClose, onSaved }) {
  const [form, setForm] = useState({ ...client });
  const [error, setError] = useState("");

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    try {
      const nextState = updateClientBilling(client.id, form);
      onSaved(nextState, "Billing configuration saved.");
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal title="Manage Client Billing" onClose={onClose} wide>
      <form className="super-admin-form billing-form" onSubmit={handleSubmit}>
        {error && <div className="super-admin-error">{error}</div>}
        <div className="billing-section-title">Client</div>
        <div className="super-admin-detail-grid">
          <div className="super-admin-readonly-field"><span>Client Name</span><strong>{client.clientName}</strong></div>
          <div className="super-admin-readonly-field"><span>Client Admin</span><strong>{client.adminEmail}</strong></div>
          <div className="super-admin-readonly-field"><span>Subscription Status</span><strong>{client.subscriptionStatus}</strong></div>
          <div className="super-admin-readonly-field"><span>EMS Start Date</span><strong>{formatDateDisplay(client.startDate)}</strong></div>
          <div className="super-admin-readonly-field"><span>Maximum Users</span><strong>{client.maximumUsers}</strong></div>
          <div className="super-admin-readonly-field"><span>Current Active Users</span><strong>{client.currentUsers}</strong></div>
          <div className="super-admin-readonly-field"><span>Remaining Users</span><strong>{client.maximumUsers - client.currentUsers}</strong></div>
        </div>

        <div className="billing-section-title">Billing Configuration</div>
        <div className="emp-modal-form-grid">
          <label>Price Per User
            <input type="number" value={form.pricePerUser} onChange={(event) => update("pricePerUser", event.target.value)} min="0" />
          </label>
          <label>Billing Cycle
            <select value={form.billingCycle} onChange={(event) => update("billingCycle", event.target.value)}>
              <option>Monthly</option>
            </select>
          </label>
          <label>Invoice Generation Day
            <input type="number" value={form.invoiceGenerationDay} onChange={(event) => update("invoiceGenerationDay", event.target.value)} min="1" max="28" />
          </label>
          <label>Payment Due Days
            <select value={form.paymentDueDays} onChange={(event) => update("paymentDueDays", event.target.value)}>
              {[1, 2, 3, 4].map((day) => <option key={day} value={day}>{day}</option>)}
            </select>
          </label>
          <label>GST
            <input type="number" value={form.gstPercentage} onChange={(event) => update("gstPercentage", event.target.value)} min="0" />
          </label>
          <label>Late Fee Type
            <select value={form.lateFeeType} onChange={(event) => update("lateFeeType", event.target.value)}>
              <option value="fixed_amount">Fixed Amount</option>
              <option value="percentage">Percentage</option>
              <option value="fixed_per_day">Fixed Per Day</option>
              <option value="percentage_per_day">Percentage Per Day</option>
            </select>
          </label>
          <label>Late Fee Value
            <input type="number" value={form.lateFeeValue} onChange={(event) => update("lateFeeValue", event.target.value)} min="0" />
          </label>
          <label>Maximum Late Fee
            <input type="number" value={form.maximumLateFee} onChange={(event) => update("maximumLateFee", event.target.value)} min="0" />
          </label>
          <label>Proration
            <select value={form.prorationEnabled ? "Enabled" : "Disabled"} onChange={(event) => update("prorationEnabled", event.target.value === "Enabled")}>
              <option>Enabled</option>
              <option>Disabled</option>
            </select>
          </label>
          <label>Billing Status
            <select value={form.billingStatus} onChange={(event) => update("billingStatus", event.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>
        </div>
        <div className="emp-modal-btns">
          <button className="emp-close-btn" type="button" onClick={onClose}>Cancel</button>
          <button className="emp-save-btn" type="submit">Save Changes</button>
        </div>
      </form>
    </Modal>
  );
}

function InvoiceDetailsModal({ invoice, payment, onClose }) {
  const details = [
    ["Invoice Number", invoice.invoiceNumber],
    ["Client", invoice.clientName],
    ["Admin", invoice.adminEmail],
    ["Billing Period", formatBillingPeriod(invoice)],
    ["Invoice Date", formatDateDisplay(invoice.invoiceDate)],
    ["Due Date", formatDateDisplay(invoice.dueDate)],
    ["Users", invoice.userCount],
    ["Price/User", formatCurrency(invoice.pricePerUser)],
    ["Subtotal", formatCurrency(invoice.subtotal)],
    ["GST", formatCurrency(invoice.gst)],
    ["Late Fee", formatCurrency(invoice.lateFee)],
    ["Total", formatCurrency(invoice.total)],
    ["Amount Paid", formatCurrency(invoice.amountPaid)],
    ["Balance Due", formatCurrency(invoice.balanceDue)],
    ["Status", invoice.status],
  ];

  if (payment) {
    details.push(
      ["Payment Method", payment.paymentMethod],
      ["Transaction ID", payment.transactionId],
      ["Payment Date", formatDateDisplay(payment.paymentDate)],
      ["Payment Time", payment.paymentTime],
      ["Paid By", payment.paidBy]
    );
  }

  return (
    <Modal title="Invoice" onClose={onClose} wide>
      <div className="super-admin-detail-grid">
        {details.map(([label, value]) => (
          <div className="super-admin-readonly-field" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="emp-modal-btns">
        <button className="emp-close-btn" type="button" onClick={() => window.print()}>Print Invoice</button>
        <button className="emp-save-btn" type="button" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

function PaymentDetailsModal({ payment, onClose }) {
  return (
    <Modal title="Payment Details" onClose={onClose}>
      <div className="super-admin-detail-grid billing-payment-grid">
        {[
          ["Invoice", payment.invoiceNumber],
          ["Client", payment.clientName],
          ["Admin", payment.adminEmail],
          ["Amount", formatCurrency(payment.amount)],
          ["Status", payment.status],
          ["Payment Method", payment.paymentMethod],
          ["Transaction ID", payment.transactionId],
          ["Payment Date", formatDateDisplay(payment.paymentDate)],
          ["Payment Time", payment.paymentTime],
          ["Paid By", payment.paidBy],
          ["Gateway Reference", payment.gatewayReference],
        ].map(([label, value]) => (
          <div className="super-admin-readonly-field" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="emp-modal-btns">
        <button className="emp-save-btn" type="button" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

function InvoiceGeneratedModal({ invoice, onClose, onView, onPay }) {
  return (
    <Modal title="Invoice Generated Successfully" onClose={onClose}>
      <div className="super-admin-detail-grid billing-payment-grid">
        <div className="super-admin-readonly-field"><span>Invoice</span><strong>{invoice.invoiceNumber}</strong></div>
        <div className="super-admin-readonly-field"><span>Amount</span><strong>{formatCurrency(invoice.total)}</strong></div>
        <div className="super-admin-readonly-field"><span>Recipient</span><strong>{invoice.adminEmail}</strong></div>
        <div className="super-admin-readonly-field"><span>Message</span><strong>Invoice notification simulated successfully.</strong></div>
      </div>
      <div className="emp-modal-btns">
        <button className="emp-close-btn" type="button" onClick={() => onView(invoice)}>View Invoice</button>
        <button className="emp-save-btn" type="button" onClick={() => onPay(invoice)}>Pay Now</button>
      </div>
    </Modal>
  );
}

/* =========================================================================
   EXACT RAZORPAY PAYMENT GATEWAY MODAL (APPLIED ONLY ON "PAY NOW")
   ========================================================================= */
function PaymentModal({ invoice, onClose, onPaid, paidBy }) {
  const [method, setMethod] = useState("UPI"); // 'UPI' | 'UPI_QR' | 'Card' | 'NetBanking'
  const [upiId, setUpiId] = useState("admin@okaxis");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [bankSearch, setBankSearch] = useState("");
  const [showAllBanks, setShowAllBanks] = useState(false);
  const [paymentState, setPaymentState] = useState("idle"); // 'idle' | 'processing' | 'success' | 'failed'
  const [txnResult, setTxnResult] = useState(null);

  const amountToPay = invoice.balanceDue || invoice.total;

  const handleStartPayment = () => {
    setPaymentState("processing");

    window.setTimeout(() => {
      const result = simulatePayment({
        invoiceId: invoice.id,
        paymentMethod: method === "NetBanking" ? `${selectedBank} Net Banking` : method === "UPI_QR" ? "UPI QR" : method,
        paidBy
      });

      setTxnResult(result.payment);
      setPaymentState("success");
    }, 1500);
  };

  const handleFinishSuccess = () => {
    if (txnResult) {
      const state = getBillingState();
      onPaid(state, txnResult);
    }
    onClose();
  };

  const filteredPopularBanks = POPULAR_BANKS.filter((b) =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <div className="emp-modal-overlay">
      <div className="pg-main-wrapper">
        
        {/* Left Side / Main Payment Modal */}
        <div className="pg-modal-card">
          
          {/* Header */}
          <div className="pg-header">
            <h3>Make Invoice Payment</h3>
            <button className="pg-close-btn" type="button" onClick={onClose}>×</button>
          </div>

          {/* MAIN PAYMENT FORM */}
          {paymentState === "idle" && (
            <div className="pg-body">
              
              {/* Invoice Summary Box */}
              <div className="pg-invoice-summary">
                <div className="pg-inv-left">
                  <div className="pg-inv-icon">
                    <FaFileInvoiceDollar />
                  </div>
                  <div>
                    <span className="pg-inv-label">Invoice Reference</span>
                    <strong className="pg-inv-number">{invoice.invoiceNumber}</strong>
                    <span className="pg-inv-date">Invoice Date: {formatDateDisplay(invoice.invoiceDate)}</span>
                  </div>
                </div>
                <div className="pg-inv-right">
                  <span className="pg-inv-label">Total Payable</span>
                  <strong className="pg-inv-amount">{formatCurrency(amountToPay)}</strong>
                </div>
              </div>

              {/* Choose Payment Method Tabs */}
              <div className="pg-method-section">
                <label className="pg-section-label">Choose a payment method</label>
                <div className="pg-method-grid">
                  
                  {/* UPI */}
                  <button
                    type="button"
                    className={`pg-method-card ${method === "UPI" || method === "UPI_QR" ? "active" : ""}`}
                    onClick={() => setMethod("UPI")}
                  >
                    <div className="pg-method-icon-box upi-box">
                      <span>UPI</span>
                    </div>
                    <div>
                      <strong>UPI</strong>
                      <small>Pay using any UPI app</small>
                    </div>
                  </button>

                  {/* Card */}
                  <button
                    type="button"
                    className={`pg-method-card ${method === "Card" ? "active" : ""}`}
                    onClick={() => setMethod("Card")}
                  >
                    <div className="pg-method-icon-box card-box">
                      <FaCreditCard />
                    </div>
                    <div>
                      <strong>Card</strong>
                      <small>Visa, Mastercard, Rupay</small>
                    </div>
                  </button>

                  {/* Net Banking */}
                  <button
                    type="button"
                    className={`pg-method-card ${method === "NetBanking" ? "active" : ""}`}
                    onClick={() => setMethod("NetBanking")}
                  >
                    <div className="pg-method-icon-box bank-box">
                      <FaBuilding />
                    </div>
                    <div>
                      <strong>Net Banking</strong>
                      <small>All major banks</small>
                    </div>
                  </button>

                </div>
              </div>

              {/* Dynamic Panel Content */}
              <div className="pg-panel-area">
                
                {/* Method 1: UPI ID */}
                {method === "UPI" && (
                  <div className="pg-upi-panel">
                    <div className="pg-panel-title-row">
                      <strong>Pay using UPI</strong>
                      <button type="button" className="pg-link-btn" onClick={() => setMethod("UPI_QR")}>
                        <FaQrcode /> Switch to QR Code
                      </button>
                    </div>
                    <p className="pg-panel-subtitle">Enter your UPI ID to continue</p>
                    
                    <div className="pg-input-wrapper">
                      <input
                        type="text"
                        placeholder="Enter UPI ID (e.g. name@upi)"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                      />
                      <FaBolt className="pg-input-icon" />
                    </div>

                    <div className="pg-popular-upi">
                      <label>Popular UPI Apps</label>
                      <div className="pg-upi-apps-grid">
                        <button type="button" onClick={() => setUpiId("admin@okaxis")}>Google Pay</button>
                        <button type="button" onClick={() => setUpiId("admin@ybl")}>PhonePe</button>
                        <button type="button" onClick={() => setUpiId("admin@paytm")}>Paytm</button>
                        <button type="button" onClick={() => setUpiId("admin@upi")}>BHIM</button>
                      </div>
                    </div>

                    <div className="pg-security-banner">
                      <FaLock /> Your payment is secured with 256-bit encryption
                    </div>
                  </div>
                )}

                {/* Method 2: UPI QR Code */}
                {method === "UPI_QR" && (
                  <div className="pg-qr-panel">
                    <div className="pg-panel-title-row">
                      <strong>Pay using UPI</strong>
                      <button type="button" className="pg-link-btn" onClick={() => setMethod("UPI")}>
                        Pay via UPI ID
                      </button>
                    </div>
                    <p className="pg-panel-subtitle">Scan QR code with any UPI app</p>

                    <div className="pg-qr-box">
                      <FaQrcode className="pg-qr-image" />
                    </div>

                    <p className="pg-qr-note">Or pay using UPI ID: <strong>merchant@ems</strong> <FaCopy className="pg-copy-icon" /></p>
                    <p className="pg-qr-status">🟠 Waiting for payment...</p>
                  </div>
                )}

                {/* Method 3: Card Details */}
                {method === "Card" && (
                  <div className="pg-card-panel">
                    <div className="pg-panel-title-row">
                      <strong>Pay using Card</strong>
                    </div>
                    <p className="pg-panel-subtitle">Enter your card details</p>

                    <div className="pg-input-group">
                      <label>Card Number</label>
                      <div className="pg-input-wrapper">
                        <input type="text" placeholder="0000 0000 0000 0000" defaultValue="4532 8820 9012 4490" />
                        <FaCreditCard className="pg-input-icon text-muted" />
                      </div>
                    </div>

                    <div className="pg-card-row">
                      <div className="pg-input-group">
                        <label>Expiry Date</label>
                        <input type="text" placeholder="MM / YY" defaultValue="08 / 29" />
                      </div>
                      <div className="pg-input-group">
                        <div className="pg-label-with-icon">
                          <label>CVV</label>
                          <FaQuestionCircle className="pg-info-icon" />
                        </div>
                        <input type="password" placeholder="123" defaultValue="882" maxLength={3} />
                      </div>
                    </div>

                    <label className="pg-checkbox-label">
                      <input type="checkbox" defaultChecked /> Save card for future payments
                    </label>

                    <div className="pg-security-banner">
                      <FaLock /> Your card details are secure and encrypted
                    </div>
                  </div>
                )}

                {/* Method 4: Net Banking */}
                {method === "NetBanking" && (
                  <div className="pg-bank-panel">
                    <div className="pg-panel-title-row">
                      <strong>Pay using Net Banking</strong>
                    </div>
                    <p className="pg-panel-subtitle">Select your bank to continue</p>

                    <div className="pg-search-wrapper">
                      <input
                        type="text"
                        placeholder="Search your bank"
                        value={bankSearch}
                        onChange={(e) => setBankSearch(e.target.value)}
                      />
                      <FaSearch className="pg-search-icon" />
                    </div>

                    <label className="pg-popular-label">Popular Banks</label>
                    <div className="pg-banks-grid">
                      {filteredPopularBanks.map((b) => (
                        <button
                          key={b.name}
                          type="button"
                          className={`pg-bank-btn ${selectedBank === b.name ? "selected" : ""}`}
                          onClick={() => setSelectedBank(b.name)}
                        >
                          <span className="pg-bank-initial" style={{ backgroundColor: b.color }}>{b.initial}</span>
                          <span className="pg-bank-name">{b.name}</span>
                        </button>
                      ))}
                    </div>

                    <div className="pg-view-all-banks">
                      <button type="button" onClick={() => setShowAllBanks(!showAllBanks)}>
                        {showAllBanks ? "Hide other banks ▲" : "View all banks ⌄"}
                      </button>
                    </div>

                    {showAllBanks && (
                      <div className="pg-all-banks-dropdown">
                        {ALL_OTHER_BANKS.map((bankName) => (
                          <div
                            key={bankName}
                            className={`pg-bank-item ${selectedBank === bankName ? "active" : ""}`}
                            onClick={() => {
                              setSelectedBank(bankName);
                              setShowAllBanks(false);
                            }}
                          >
                            {bankName}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="pg-footer">
                <button type="button" className="pg-cancel-btn" onClick={onClose}>
                  Cancel
                </button>
                <button type="button" className="pg-pay-btn" onClick={handleStartPayment}>
                  <span>Pay {formatCurrency(amountToPay)}</span>
                  <FaLock />
                </button>
              </div>

            </div>
          )}

          {/* Processing State */}
          {paymentState === "processing" && (
            <div className="pg-state-screen pg-processing">
              <div className="pg-spinner-circle"></div>
              <h4>Payment Processing</h4>
              <p className="pg-state-subtitle">Your payment is being processed</p>
              <strong className="pg-state-txnid">Transaction ID: TXN428901234567</strong>
              <p className="pg-state-note">We will notify you once the payment is confirmed.</p>
            </div>
          )}

          {/* Success State */}
          {paymentState === "success" && (
            <div className="pg-state-screen pg-success">
              <div className="pg-success-icon">
                <FaCheck />
              </div>
              <h4>Payment Successful!</h4>
              <p className="pg-success-amount">{formatCurrency(amountToPay)} paid successfully</p>
              <strong className="pg-state-txnid">Transaction ID: {txnResult?.transactionId || "TXN428901234567"}</strong>
              <p className="pg-state-date">{formatDateDisplay(new Date())}</p>

              <div className="pg-state-actions">
                <button type="button" className="pg-receipt-btn" onClick={() => window.print()}>
                  View Receipt
                </button>
                <button type="button" className="pg-done-btn" onClick={handleFinishSuccess}>
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Sub-footer trust badges */}
          <div className="pg-trust-badges">
            <span><FaShieldAlt /> PCI DSS Compliant</span>
            <span><FaLock /> Secure Payments</span>
            <span><FaCheckCircle /> 100% Safe & Secure</span>
          </div>

        </div>

        {/* Right-Side Informational Cards */}
        <div className="pg-side-cards">
          
          {/* Card 1: Why pay online? */}
          <div className="pg-side-card">
            <h4>Why pay online?</h4>
            <ul className="pg-side-benefits">
              <li>
                <span className="benefit-icon"><FaRedo /></span>
                <div>
                  <strong>Instant payment confirmation</strong>
                  <p>Get real-time payment status</p>
                </div>
              </li>
              <li>
                <span className="benefit-icon"><FaLock /></span>
                <div>
                  <strong>Secure & encrypted</strong>
                  <p>Your data is protected with bank-level security</p>
                </div>
              </li>
              <li>
                <span className="benefit-icon"><FaCreditCard /></span>
                <div>
                  <strong>Multiple payment options</strong>
                  <p>UPI, Cards, Net Banking and more</p>
                </div>
              </li>
              <li>
                <span className="benefit-icon"><FaFileInvoiceDollar /></span>
                <div>
                  <strong>Automatic receipt</strong>
                  <p>Receipt will be sent to your email</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Card 2: We accept */}
          <div className="pg-side-card">
            <h4>We accept</h4>
            <div className="pg-brands-grid">
              <span className="brand-chip visa">VISA</span>
              <span className="brand-chip mc">●●</span>
              <span className="brand-chip rupay">RuPay❯</span>
              <span className="brand-chip upi">UPI❯</span>
              <span className="brand-chip paytm">paytm</span>
              <span className="brand-chip phonepe">PhonePe</span>
            </div>
            <div className="pg-secured-by">
              Secured by <strong>Razorpay</strong>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

function Billing() {
  const [state, setState] = useState(() => getBillingState());
  const [activeTab, setActiveTab] = useState(isSuperAdmin() ? "Clients" : "My Invoices");
  const [message, setMessage] = useState("");
  const [manageClient, setManageClient] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [viewPayment, setViewPayment] = useState(null);
  const [generatedInvoice, setGeneratedInvoice] = useState(null);
  const superAdminMode = isSuperAdmin();
  const adminMode = !superAdminMode;
  const currentEmail = getCurrentUserEmail();

  const invoices = getInvoicesWithStatus(state);
  const visibleClients = adminMode
    ? state.clients.filter((client) => client.adminEmail.toLowerCase() === currentEmail.toLowerCase())
    : state.clients;
  const visibleInvoices = adminMode
    ? invoices.filter((invoice) => invoice.adminEmail.toLowerCase() === currentEmail.toLowerCase())
    : invoices;
  const visiblePayments = adminMode
    ? state.payments.filter((payment) => payment.adminEmail.toLowerCase() === currentEmail.toLowerCase())
    : state.payments;
  const summary = getBillingSummary(state);
  const selectedPayment = viewInvoice ? state.payments.find((payment) => payment.invoiceId === viewInvoice.id) : null;

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3500);
  };

  const handleGenerateInvoices = () => {
    const result = generateMonthlyInvoices();
    setState(result.state);

    if (result.generated.length > 0) {
      setGeneratedInvoice(result.generated[0]);
      showMessage(`Invoice sent to ${result.generated[0].adminEmail}`);
      return;
    }

    showMessage(result.messages[0] || "No invoice generated.");
  };

  const handleReset = () => {
    resetBillingDemo();
    setState(getBillingState());
    setActiveTab(superAdminMode ? "Clients" : "My Invoices");
    showMessage("Billing demo reset.");
  };

  const renderSuperAdminTab = () => {
    if (activeTab === "Clients") {
      return <ClientsTable clients={visibleClients} invoices={visibleInvoices} onManage={setManageClient} />;
    }

    if (activeTab === "Invoices") {
      return (
        <InvoicesTable
          invoices={visibleInvoices}
          payments={state.payments}
          onView={setViewInvoice}
          onPaymentDetails={setViewPayment}
          onPay={setPaymentInvoice}
        />
      );
    }

    if (activeTab === "Payments") {
      return <PaymentsTable payments={visiblePayments} onPaymentDetails={setViewPayment} />;
    }

    if (activeTab === "Overdue") {
      return <OverdueTable invoices={visibleInvoices} clients={state.clients} onPay={setPaymentInvoice} />;
    }

    return <HistoryTable history={state.history} />;
  };

  const renderAdminTab = () => {
    if (activeTab === "Payment History") {
      return <PaymentsTable payments={visiblePayments} onPaymentDetails={setViewPayment} />;
    }

    const invoiceRows =
      activeTab === "Pending Payment"
        ? visibleInvoices.filter((invoice) => invoice.status !== "PAID")
        : visibleInvoices;

    return (
      <InvoicesTable
        adminMode
        invoices={invoiceRows}
        payments={state.payments}
        onView={setViewInvoice}
        onPay={setPaymentInvoice}
      />
    );
  };

  return (
    <div className="emp-page-unique super-admin-page billing-page">
      <div className="emp-header-unique">
        <div>
          <h2>Billing</h2>
          <p>{superAdminMode ? "Manage client billing, invoices and payments" : "My Invoices"}</p>
        </div>
        <div className="emp-header-actions">
          {superAdminMode && (
            <button className="emp-add-btn" type="button" onClick={handleGenerateInvoices}>
              Generate Monthly Invoices
            </button>
          )}
          <button className="emp-bulk-upload-btn" type="button" onClick={handleReset}>
            <FaRedo /> Reset Billing Demo
          </button>
        </div>
      </div>

      {message && <div className="billing-alert">{message}</div>}
      {superAdminMode && <SummaryCards summary={summary} />}

      {adminMode && visibleClients.map((client) => (
        <section className="billing-admin-client" key={client.id}>
          <div>
            <span>Client</span>
            <strong>{client.clientName}</strong>
          </div>
          <div>
            <span>Admin</span>
            <strong>{client.adminEmail}</strong>
          </div>
          <div>
            <span>Subscription</span>
            <strong>{client.subscriptionStatus}</strong>
          </div>
          <div>
            <span>Current Users</span>
            <strong>{client.currentUsers}</strong>
          </div>
        </section>
      ))}

      <BillingTabs
        tabs={superAdminMode ? SUPER_ADMIN_TABS : ADMIN_TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {superAdminMode ? renderSuperAdminTab() : renderAdminTab()}

      {manageClient && (
        <ManageClientModal
          client={manageClient}
          onClose={() => setManageClient(null)}
          onSaved={(nextState, text) => {
            setState(nextState);
            showMessage(text);
          }}
        />
      )}

      {viewInvoice && (
        <InvoiceDetailsModal
          invoice={viewInvoice}
          payment={selectedPayment}
          onClose={() => setViewInvoice(null)}
        />
      )}

      {viewPayment && <PaymentDetailsModal payment={viewPayment} onClose={() => setViewPayment(null)} />}

      {generatedInvoice && (
        <InvoiceGeneratedModal
          invoice={generatedInvoice}
          onClose={() => setGeneratedInvoice(null)}
          onView={(invoice) => {
            setGeneratedInvoice(null);
            setViewInvoice(invoice);
          }}
          onPay={(invoice) => {
            setGeneratedInvoice(null);
            setPaymentInvoice(invoice);
          }}
        />
      )}

      {paymentInvoice && (
        <PaymentModal
          invoice={paymentInvoice}
          paidBy={currentEmail || ADMIN_EMAIL}
          onClose={() => setPaymentInvoice(null)}
          onPaid={(nextState, payment) => {
            setState(nextState);
            setPaymentInvoice(null);
            setViewPayment(payment);
            showMessage("Payment Confirmation Sent. Super Admin Notification Sent.");
          }}
        />
      )}

      <div className="billing-storage-note">
        Shared demo storage: {Object.values(BILLING_STORAGE_KEYS).join(", ")}
      </div>
    </div>
  );
}

export default Billing;