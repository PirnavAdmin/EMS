import React, { useMemo, useState } from "react";
import "./SuperAdmin.css";
import "../Employees/EmployeeList.css";
import "../dashboard/Dashboard.css";
import { clients, supportTickets } from "./superAdminData";

function Support() {
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [client, setClient] = useState("");
  const [ticket, setTicket] = useState(null);
  const visible = useMemo(() => supportTickets.filter((item) =>
    `${item.id} ${item.company} ${item.subject}`.toLowerCase().includes(search.toLowerCase()) &&
    (!priority || item.priority === priority) &&
    (!status || item.status === status) &&
    (!client || item.company === client)
  ), [search, priority, status, client]);
  const stats = ["Open", "Assigned", "Resolved", "Critical"].map((label) => [label, supportTickets.filter((item) => item.status === label || item.priority === label).length]);

  return (
    <div className="emp-page-unique super-admin-page">
      <div className="emp-header-unique"><div><h2>Support</h2><p>Client support ticket queue</p></div></div>
      <div className="cards">{stats.map(([label, value]) => <article className="card" key={label}><p className="card-label">{label}</p><p className="card-value">{value}</p></article>)}</div>
      <div className="emp-toolbar">
        <input className="emp-search-box" placeholder="Search tickets" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="emp-filter-select" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">Priority</option><option>Critical</option><option>High</option><option>Medium</option></select>
        <select className="emp-filter-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Status</option><option>Open</option><option>Assigned</option><option>Resolved</option></select>
        <select className="emp-filter-select" value={client} onChange={(event) => setClient(event.target.value)}><option value="">Client</option>{clients.map((item) => <option key={item.id}>{item.companyName}</option>)}</select>
      </div>
      <div className="emp-table-container">
        <table className="emp-table super-admin-table--compact">
          <thead><tr>{["Ticket ID", "Company", "Subject", "Priority", "Status", "Assigned To", "Created Date", "Action"].map((head) => <th key={head}>{head}</th>)}</tr></thead>
          <tbody>{visible.map((item) => (
            <tr className="emp-row-click" key={item.id}>
              <td>{item.id}</td><td>{item.company}</td><td>{item.subject}</td><td><span className={`super-admin-badge ${item.priority.toLowerCase()}`}>{item.priority}</span></td><td>{item.status}</td><td>{item.assignedTo}</td><td>{item.created}</td>
              <td className="emp-action-col"><button className="emp-action-btn emp-action-btn--edit" type="button" onClick={() => setTicket(item)}>Open Ticket</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {ticket && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-box">
            <h3>{ticket.id}</h3>
            {["Conversation", "Replies", "Timeline", "Internal Notes", "Attachments", "Status History"].map((section) => <div className="super-admin-readonly-field" key={section}><span>{section}</span><strong>{ticket.subject} - mock {section.toLowerCase()} details</strong></div>)}
            <div className="emp-modal-btns"><button className="emp-close-btn" type="button" onClick={() => setTicket(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Support;
