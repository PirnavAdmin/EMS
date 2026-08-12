import React, { useState } from "react";
import "./SuperAdmin.css";
import "../Employees/EmployeeList.css";
import "../dashboard/Dashboard.css";
import { payments } from "./superAdminData";

function Billing() {
  const [invoice, setInvoice] = useState(null);
  const stats = [
    ["Revenue", "₹3.36L"],
    ["Pending", payments.filter((payment) => payment.status === "Pending").length],
    ["Paid", payments.filter((payment) => payment.status === "Paid").length],
    ["Overdue", payments.filter((payment) => payment.status === "Overdue").length],
  ];

  return (
    <div className="emp-page-unique super-admin-page">
      <div className="emp-header-unique"><div><h2>Billing</h2><p>Invoices and payment status</p></div></div>
      <div className="cards">{stats.map(([label, value]) => <article className="card" key={label}><p className="card-label">{label}</p><p className="card-value">{value}</p></article>)}</div>
      <div className="emp-table-container">
        <table className="emp-table super-admin-table--compact">
          <thead><tr>{["Invoice Number", "Company", "Subscription", "Billing Month", "Amount", "Due Date", "Payment Status", "Action"].map((head) => <th key={head}>{head}</th>)}</tr></thead>
          <tbody>{payments.map((payment) => (
            <tr className="emp-row-click" key={payment.invoice}>
              <td>{payment.invoice}</td><td>{payment.company}</td><td>{payment.subscription}</td><td>{payment.month}</td><td>{payment.amount}</td><td>{payment.dueDate}</td>
              <td><span className={`super-admin-badge ${payment.status.toLowerCase()}`}>{payment.status}</span></td>
              <td className="emp-action-col"><button className="emp-action-btn emp-action-btn--edit" type="button" onClick={() => setInvoice(payment)}>View Invoice</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {invoice && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-box">
            <h3>Invoice Preview</h3>
            <div className="super-admin-detail-grid">{Object.entries(invoice).map(([key, value]) => <div className="super-admin-readonly-field" key={key}><span>{key}</span><strong>{value}</strong></div>)}</div>
            <div className="emp-modal-btns"><button className="emp-close-btn" type="button" onClick={() => setInvoice(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Billing;
