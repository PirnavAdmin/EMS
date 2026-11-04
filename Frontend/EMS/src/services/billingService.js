export const BILLING_STORAGE_KEYS = {
  clients: "ems_billing_clients",
  configurations: "ems_billing_configurations",
  invoices: "ems_billing_invoices",
  payments: "ems_billing_payments",
  history: "ems_billing_history",
};

const DEMO_CLIENT = {
  id: "client-ems",
  clientName: "EMS",
  adminEmail: "admin@ems.com",
  subscriptionStatus: "Active",
  billingStatus: "Active",
  startDate: "2026-08-01",
  maximumUsers: 300,
  currentUsers: 77,
  pricePerUser: 100,
  billingCycle: "Monthly",
  invoiceGenerationDay: 1,
  paymentDueDays: 3,
  gstPercentage: 18,
  lateFeeType: "percentage_per_day",
  lateFeeValue: 2,
  maximumLateFee: 5000,
  prorationEnabled: true,
};

const DEMO_INVOICE_DATE = "2026-09-01";
const STATUS_PAID = "PAID";

const safeParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const readStorage = (key, fallback = []) => {
  if (typeof window === "undefined") {
    return fallback;
  }

  return safeParse(window.localStorage.getItem(key), fallback);
};

const writeStorage = (key, value) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
};

const pad = (value) => String(value).padStart(2, "0");

const parseDate = (value) => {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const addDays = (value, days) => {
  const date = parseDate(value);
  date.setDate(date.getDate() + Number(days || 0));
  return toDateKey(date);
};

const getDaysInclusive = (startDate, endDate) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((end - start) / dayMs) + 1);
};

const monthName = (date) =>
  new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);

export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2,
  }).format(Number(value || 0));

export const formatDateDisplay = (value) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(parseDate(value))
    .replace(/ /g, "-");
};

export const formatBillingPeriod = (invoice) => {
  const date = parseDate(invoice.billingPeriodStart);
  return `${monthName(date)} ${date.getFullYear()}`;
};

const nowParts = (dateKey = DEMO_INVOICE_DATE) => {
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());

  return {
    date: dateKey,
    time,
    displayDate: formatDateDisplay(dateKey),
  };
};

const getBillingPeriodForGeneration = (invoiceDateKey = DEMO_INVOICE_DATE) => {
  const invoiceDate = parseDate(invoiceDateKey);
  const periodStart = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth() - 1, 1);
  const periodEnd = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth(), 0);

  return {
    invoiceDate: invoiceDateKey,
    billingPeriodStart: toDateKey(periodStart),
    billingPeriodEnd: toDateKey(periodEnd),
    label: `${monthName(periodStart)} ${periodStart.getFullYear()}`,
  };
};

const createHistoryEvent = ({ client, action, invoice = "", details = "" }) => {
  const stamp = nowParts();

  return {
    id: `history-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: stamp.date,
    time: stamp.time,
    clientId: client?.id || "",
    clientName: client?.clientName || "",
    action,
    invoice,
    details,
  };
};

const getNextInvoiceNumber = (invoices, invoiceDate) => {
  const year = parseDate(invoiceDate).getFullYear();
  const nextNumber =
    invoices.filter((invoice) => String(invoice.invoiceNumber || "").startsWith(`INV-${year}-`)).length + 1;

  return `INV-${year}-${String(nextNumber).padStart(4, "0")}`;
};

const getNextTransactionId = (payments, paymentDate) => {
  const compactDate = String(paymentDate).replace(/-/g, "");
  const nextNumber =
    payments.filter((payment) => String(payment.transactionId || "").startsWith(`TXN-${compactDate}-`)).length + 1;

  return `TXN-${compactDate}-${String(nextNumber).padStart(4, "0")}`;
};

export const initializeBillingDemo = () => {
  const clients = readStorage(BILLING_STORAGE_KEYS.clients, null);

  if (!Array.isArray(clients) || clients.length === 0) {
    writeStorage(BILLING_STORAGE_KEYS.clients, [DEMO_CLIENT]);
    writeStorage(BILLING_STORAGE_KEYS.configurations, [{ ...DEMO_CLIENT }]);
  }

  Object.values(BILLING_STORAGE_KEYS)
    .filter((key) => ![BILLING_STORAGE_KEYS.clients, BILLING_STORAGE_KEYS.configurations].includes(key))
    .forEach((key) => {
      const existing = readStorage(key, null);

      if (!Array.isArray(existing)) {
        writeStorage(key, []);
      }
    });
};

export const resetBillingDemo = () => {
  Object.values(BILLING_STORAGE_KEYS).forEach((key) => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key);
    }
  });
  initializeBillingDemo();
};

export const getBillingState = () => {
  initializeBillingDemo();

  return {
    clients: readStorage(BILLING_STORAGE_KEYS.clients, []),
    configurations: readStorage(BILLING_STORAGE_KEYS.configurations, []),
    invoices: readStorage(BILLING_STORAGE_KEYS.invoices, []),
    payments: readStorage(BILLING_STORAGE_KEYS.payments, []),
    history: readStorage(BILLING_STORAGE_KEYS.history, []),
  };
};

export const updateClientBilling = (clientId, updates) => {
  const state = getBillingState();
  const dueDays = Number(updates.paymentDueDays);

  if (dueDays > 4) {
    throw new Error("Payment due days cannot exceed 4 days.");
  }

  const clients = state.clients.map((client) =>
    client.id === clientId
      ? {
          ...client,
          ...updates,
          paymentDueDays: dueDays,
          pricePerUser: Number(updates.pricePerUser),
          gstPercentage: Number(updates.gstPercentage),
          lateFeeValue: Number(updates.lateFeeValue),
          maximumLateFee: Number(updates.maximumLateFee),
          currentUsers: Number(updates.currentUsers),
          maximumUsers: Number(updates.maximumUsers),
          invoiceGenerationDay: Number(updates.invoiceGenerationDay),
          prorationEnabled: Boolean(updates.prorationEnabled),
        }
      : client
  );

  writeStorage(BILLING_STORAGE_KEYS.clients, clients);
  writeStorage(BILLING_STORAGE_KEYS.configurations, clients.map((client) => ({ ...client })));
  return getBillingState();
};

export const calculateInvoiceSnapshot = (client, periodStart, periodEnd) => {
  const periodDays = getDaysInclusive(periodStart, periodEnd);
  const applicableStart =
    client.prorationEnabled && parseDate(client.startDate) > parseDate(periodStart)
      ? client.startDate
      : periodStart;
  const activeDays = getDaysInclusive(applicableStart, periodEnd);
  const monthlyAmount = Number(client.currentUsers) * Number(client.pricePerUser);
  const subtotal = client.prorationEnabled
    ? Math.round((monthlyAmount * activeDays) / periodDays)
    : monthlyAmount;
  const gst = Math.round((subtotal * Number(client.gstPercentage)) / 100);

  return {
    userCount: Number(client.currentUsers),
    pricePerUser: Number(client.pricePerUser),
    activeDays,
    proration: client.prorationEnabled ? "Enabled" : "Disabled",
    subtotal,
    gst,
    lateFee: 0,
    total: subtotal + gst,
  };
};

export const generateMonthlyInvoices = () => {
  const state = getBillingState();
  const period = getBillingPeriodForGeneration();
  const invoices = [...state.invoices];
  const history = [...state.history];
  const generated = [];
  const messages = [];

  state.clients.forEach((client) => {
    if (client.billingStatus !== "Active" || client.subscriptionStatus !== "Active") {
      messages.push("Invoice not generated because subscription is inactive.");
      return;
    }

    const duplicate = invoices.find(
      (invoice) =>
        invoice.clientId === client.id &&
        invoice.billingPeriodStart === period.billingPeriodStart &&
        invoice.billingPeriodEnd === period.billingPeriodEnd
    );

    if (duplicate) {
      messages.push(`${period.label} invoice already exists.`);
      return;
    }

    const snapshot = calculateInvoiceSnapshot(client, period.billingPeriodStart, period.billingPeriodEnd);
    const invoiceNumber = getNextInvoiceNumber(invoices, period.invoiceDate);
    const invoice = {
      id: `invoice-${Date.now()}-${client.id}`,
      invoiceNumber,
      clientId: client.id,
      clientName: client.clientName,
      adminEmail: client.adminEmail,
      billingPeriodStart: period.billingPeriodStart,
      billingPeriodEnd: period.billingPeriodEnd,
      invoiceDate: period.invoiceDate,
      dueDate: addDays(period.invoiceDate, client.paymentDueDays),
      userCount: snapshot.userCount,
      pricePerUser: snapshot.pricePerUser,
      activeDays: snapshot.activeDays,
      proration: snapshot.proration,
      subtotal: snapshot.subtotal,
      gst: snapshot.gst,
      lateFee: snapshot.lateFee,
      total: snapshot.total,
      amountPaid: 0,
      balanceDue: snapshot.total,
      status: "PENDING",
    };

    invoices.push(invoice);
    generated.push(invoice);
    history.push(
      createHistoryEvent({
        client,
        action: "Invoice Generated",
        invoice: invoice.invoiceNumber,
        details: `${formatBillingPeriod(invoice)} invoice for ${formatCurrency(invoice.total)}`,
      }),
      createHistoryEvent({
        client,
        action: "Invoice Notification Simulated",
        invoice: invoice.invoiceNumber,
        details: `Invoice sent to ${client.adminEmail}`,
      })
    );
  });

  writeStorage(BILLING_STORAGE_KEYS.invoices, invoices);
  writeStorage(BILLING_STORAGE_KEYS.history, history);

  return { state: getBillingState(), generated, messages };
};

export const calculateLateFee = (invoice, client, referenceDateKey = toDateKey(new Date())) => {
  if (!invoice || invoice.status === STATUS_PAID || !client) {
    return 0;
  }

  const daysOverdue = getDaysOverdue(invoice, referenceDateKey);

  if (daysOverdue <= 0) {
    return 0;
  }

  const amount = Number(invoice.balanceDue || invoice.total || 0);
  const lateFeeValue = Number(client.lateFeeValue || 0);
  const feeByType = {
    fixed_amount: lateFeeValue,
    percentage: (amount * lateFeeValue) / 100,
    fixed_per_day: lateFeeValue * daysOverdue,
    percentage_per_day: ((amount * lateFeeValue) / 100) * daysOverdue,
  };

  return Math.min(Number(client.maximumLateFee || 0), feeByType[client.lateFeeType] || 0);
};

export const getDaysOverdue = (invoice, referenceDateKey = toDateKey(new Date())) => {
  const dueDate = parseDate(invoice.dueDate);
  const referenceDate = parseDate(referenceDateKey);
  const dayMs = 24 * 60 * 60 * 1000;

  return Math.max(0, Math.floor((referenceDate - dueDate) / dayMs));
};

export const getInvoicesWithStatus = (state = getBillingState()) =>
  state.invoices.map((invoice) => ({
    ...invoice,
    status: invoice.status === STATUS_PAID ? STATUS_PAID : getDaysOverdue(invoice) > 0 ? "OVERDUE" : invoice.status,
  }));

export const getBillingSummary = (state = getBillingState()) => {
  const invoices = getInvoicesWithStatus(state);
  const currentMonth = DEMO_INVOICE_DATE.slice(0, 7);

  return {
    totalClients: state.clients.length,
    activeBilling: state.clients.filter((client) => client.billingStatus === "Active").length,
    pendingPayments: invoices.filter((invoice) => invoice.status === "PENDING").length,
    overdue: invoices.filter((invoice) => invoice.status === "OVERDUE").length,
    paidThisMonth: state.payments
      .filter((payment) => payment.status === "SUCCESS" && String(payment.paymentDate).startsWith(currentMonth))
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    outstandingAmount: invoices
      .filter((invoice) => invoice.status !== STATUS_PAID)
      .reduce((sum, invoice) => sum + Number(invoice.balanceDue || 0), 0),
  };
};

export const simulatePayment = ({ invoiceId, paymentMethod, paidBy }) => {
  const state = getBillingState();
  const invoice = state.invoices.find((item) => item.id === invoiceId);

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  if (invoice.status === STATUS_PAID) {
    throw new Error("Invoice is already paid.");
  }

  const stamp = nowParts();
  const payment = {
    id: `payment-${Date.now()}`,
    transactionId: getNextTransactionId(state.payments, stamp.date),
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    adminEmail: invoice.adminEmail,
    amount: Number(invoice.balanceDue || invoice.total || 0),
    paymentMethod,
    paymentDate: stamp.date,
    paymentTime: stamp.time,
    status: "SUCCESS",
    gatewayReference: `DEMO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    paidBy,
  };
  const invoices = state.invoices.map((item) =>
    item.id === invoiceId
      ? {
          ...item,
          amountPaid: payment.amount,
          balanceDue: 0,
          lateFee: 0,
          status: STATUS_PAID,
          paymentMethod: payment.paymentMethod,
          transactionId: payment.transactionId,
          paymentDate: payment.paymentDate,
          paymentTime: payment.paymentTime,
          paidBy,
        }
      : item
  );
  const client = state.clients.find((item) => item.id === invoice.clientId);
  const history = [
    ...state.history,
    createHistoryEvent({
      client,
      action: "Payment Successful",
      invoice: payment.transactionId,
      details: `${payment.invoiceNumber} paid by ${paidBy}`,
    }),
    createHistoryEvent({
      client,
      action: "Payment Confirmation Sent",
      invoice: payment.invoiceNumber,
      details: `Recipient: ${invoice.adminEmail}`,
    }),
    createHistoryEvent({
      client,
      action: "Super Admin Notification Sent",
      invoice: payment.invoiceNumber,
      details: `${payment.transactionId} recorded`,
    }),
  ];

  writeStorage(BILLING_STORAGE_KEYS.invoices, invoices);
  writeStorage(BILLING_STORAGE_KEYS.payments, [...state.payments, payment]);
  writeStorage(BILLING_STORAGE_KEYS.history, history);

  return { state: getBillingState(), payment };
};
