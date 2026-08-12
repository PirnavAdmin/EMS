import React from "react";
import { FaBuilding, FaChartLine, FaCreditCard, FaHeadset, FaUsers } from "react-icons/fa";
import "./SuperAdmin.css";
import "../dashboard/Dashboard.css";
import { clients, demoRequests, payments, supportTickets } from "./superAdminData";

const metrics = [
  ["Total Clients", clients.length, FaBuilding, "blue"],
  ["Active Clients", clients.filter((client) => client.status === "Active").length, FaChartLine, "green"],
  ["Inactive Clients", clients.filter((client) => client.status !== "Active").length, FaBuilding, "orange"],
  ["Total Users", clients.reduce((sum, client) => sum + client.currentEmployees, 0), FaUsers, "blue"],
  ["Monthly Revenue", "₹3.36L", FaCreditCard, "blue"],
  ["Pending Payments", payments.filter((payment) => payment.status !== "Paid").length, FaCreditCard, "orange"],
  ["Open Support Tickets", supportTickets.filter((ticket) => ticket.status !== "Resolved").length, FaHeadset, "blue"],
  ["Demo Requests", demoRequests.length, FaUsers, "green"],
];

const chartData = [
  { title: "Revenue", values: [38, 52, 44, 68, 82, 76] },
  { title: "Client Growth", values: [24, 34, 42, 56, 63, 78] },
  { title: "Subscription Distribution", values: [34, 58, 80, 22] },
  { title: "Support Overview", values: [70, 48, 32, 18] },
];

function MiniTable({ title, rows, columns }) {
  return (
    <section className="super-admin-table-card">
      <h3>{title}</h3>
      <div className="super-admin-list">
        {rows.map((row, index) => (
          <div className="super-admin-list-row" key={`${title}-${index}`}>
            <span>{row[columns[0]]}</span>
            <strong>{row[columns[1]]}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function SuperAdminDashboard() {
  return (
    <div className="dashboard super-admin-dashboard">
      <div className="dashboard-hero">
        <h2 className="title">Super Admin Portal</h2>
        <p className="subtitle">Platform overview across all EMS client companies.</p>
      </div>

      <div className="cards">
        {metrics.map(([label, value, Icon, tone]) => (
          <article className="card" key={label}>
            <div className="card-top">
              <div>
                <p className="card-label">{label}</p>
                <p className="card-value">{value}</p>
              </div>
              <span className={`icon ${tone}`}>
                <Icon />
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="super-admin-chart-grid">
        {chartData.map((chart) => (
          <section className="super-admin-chart-card" key={chart.title}>
            <h3>{chart.title}</h3>
            <div className="super-admin-bars">
              {chart.values.map((value, index) => (
                <span
                  className="super-admin-bar"
                  key={`${chart.title}-${index}`}
                  style={{ height: `${value}%` }}
                  title={`${value}%`}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="super-admin-table-grid">
        <MiniTable title="Latest Clients" rows={clients} columns={["companyName", "plan"]} />
        <MiniTable title="Latest Payments" rows={payments} columns={["invoice", "status"]} />
        <MiniTable title="Latest Support Tickets" rows={supportTickets} columns={["id", "priority"]} />
        <MiniTable title="Latest Demo Requests" rows={demoRequests} columns={["company", "status"]} />
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
