// import { createElement, useCallback, useEffect, useMemo, useState } from "react";
// import {
//   FaCalendarAlt,
//   FaCheckCircle,
//   FaClock,
//   FaEnvelope,
//   FaSearch,
//   FaTimesCircle,
//   FaUsers,
// } from "react-icons/fa";
// import {
//   deleteDemoRequest,
//   getDemoRequestById,
//   getDemoRequests,
//   replyToDemoRequest,
// } from "../services/demoRequestService";
// import { getAdminReplyTemplate } from "../services/demoRequestEmailTemplates";
// import "./DemoRequests.css";

// const PAGE_SIZE = 8;

// const formatDate = (value) => {
//   const date = new Date(value);
//   return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
// };

// function DemoRequests() {
//   const [requests, setRequests] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [pageError, setPageError] = useState("");
//   const [notice, setNotice] = useState("");
//   const [search, setSearch] = useState("");
//   const [statusFilter, setStatusFilter] = useState("All");
//   const [sortNewest, setSortNewest] = useState(true);
//   const [page, setPage] = useState(1);
//   const [selectedRequest, setSelectedRequest] = useState(null);
//   const [replyMessage, setReplyMessage] = useState("");
//   const [replyError, setReplyError] = useState("");
//   const [sending, setSending] = useState(false);
//   const [loadingRequestId, setLoadingRequestId] = useState("");
//   const [replyLoadingId, setReplyLoadingId] = useState("");
//   const [deleting, setDeleting] = useState(false);
//   const [deletingId, setDeletingId] = useState("");

//   const loadRequests = useCallback(async () => {
//     setLoading(true);
//     setPageError("");
//     try {
//       setRequests(await getDemoRequests());
//     } catch (error) {
//       setPageError(error?.message || "Demo requests could not be loaded.");
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     loadRequests();
//   }, [loadRequests]);

//   const counts = useMemo(() => ({
//     total: requests.length,
//     pending: requests.filter((request) => String(request.status).toLowerCase() === "pending").length,
//     replied: requests.filter((request) => String(request.status).toLowerCase() === "replied").length,
//     closed: requests.filter((request) => String(request.status).toLowerCase() === "closed").length,
//   }), [requests]);

//   const filteredRequests = useMemo(() => {
//     const needle = search.trim().toLowerCase();
//     return requests
//       .filter((request) => statusFilter === "All" || request.status === statusFilter)
//       .filter((request) => !needle || [
//         request.fullName,
//         request.workEmail,
//         request.companyName,
//       ].some((value) => String(value || "").toLowerCase().includes(needle)))
//       .sort((left, right) => (new Date(left.submittedAt) - new Date(right.submittedAt)) * (sortNewest ? -1 : 1));
//   }, [requests, search, statusFilter, sortNewest]);

//   const pageCount = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
//   const visibleRequests = filteredRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

//   const openDetails = async (id) => {
//     setPageError("");
//     setLoadingRequestId(id);
//     try {
//       const request = await getDemoRequestById(id);
//       if (!request) throw new Error("This demo request is no longer available.");
//       setSelectedRequest({ mode: "view", request });
//     } catch (error) {
//       setPageError(error?.message || "The request details could not be loaded.");
//     } finally {
//       setLoadingRequestId("");
//     }
//   };

//   const openReply = async (request) => {
//     setPageError("");
//     setReplyLoadingId(request.id);
//     try {
//       const currentRequest = await getDemoRequestById(request.id);
//       if (!currentRequest) throw new Error("This demo request is no longer available.");
//       const template = getAdminReplyTemplate(currentRequest);
//       setReplyMessage(template.message);
//       setSelectedRequest({ mode: "reply", request: currentRequest });
//     } catch (error) {
//       setPageError(error?.message || "The request details could not be loaded.");
//     } finally {
//       setReplyLoadingId("");
//     }
//     setReplyError("");
//   };

//   const submitReply = async (event) => {
//     event.preventDefault();
//     if (!replyMessage.trim()) {
//       setReplyError("Message is required.");
//       return;
//     }
//     if (sending) return;

//     setSending(true);
//     setReplyError("");
//     try {
//       const requestId = selectedRequest.request.id;
//       const result = await replyToDemoRequest(requestId, {
//         message: replyMessage.trim(),
//       });
//       setNotice("Reply submitted successfully.");
//       try {
//         const [updatedRequests, updatedRequest] = await Promise.all([
//           getDemoRequests(),
//           getDemoRequestById(requestId),
//         ]);
//         setRequests(updatedRequests);
//         setSelectedRequest(updatedRequest ? { mode: "view", request: updatedRequest } : null);
//       } catch (refreshError) {
//         if (result.request) {
//           setSelectedRequest({ mode: "view", request: result.request });
//         }
//         setPageError(`Reply was accepted, but refreshed request data could not be loaded: ${refreshError?.message || "Please refresh the list."}`);
//       }
//     } catch (error) {
//       setReplyError(error?.message || "The reply could not be saved. Please try again.");
//     } finally {
//       setSending(false);
//     }
//   };

//   const confirmDelete = async () => {
//     if (!deletingId || deleting) return;
//     setDeleting(true);
//     try {
//       await deleteDemoRequest(deletingId);
//       setRequests((current) => current.filter((request) => request.id !== deletingId));
//       setSelectedRequest(null);
//       setDeletingId("");
//       setPage((current) => Math.min(current, Math.max(1, Math.ceil((filteredRequests.length - 1) / PAGE_SIZE))));
//       setNotice("Demo request deleted.");
//       await loadRequests();
//     } catch (error) {
//       setPageError(error?.message || "The demo request could not be deleted.");
//     } finally {
//       setDeleting(false);
//     }
//   };

//   useEffect(() => {
//     if (!notice) return undefined;
//     const timer = window.setTimeout(() => setNotice(""), 4500);
//     return () => window.clearTimeout(timer);
//   }, [notice]);

//   return (
//     <main className="demo-admin-page">
//       <header className="demo-admin-heading">
//         <div>
//           <span className="demo-admin-eyebrow">SUPER ADMIN</span>
//           <h1>Demo Requests</h1>
//           <p>Review and manage requests from prospective clients.</p>
//         </div>
//         <button className="demo-admin-refresh" type="button" onClick={loadRequests} disabled={loading}>
//           Refresh
//         </button>
//       </header>

//       {notice && <div className="demo-admin-notice" role="status">{notice}</div>}
//       {pageError && <div className="demo-admin-error" role="alert">{pageError}</div>}

//       <section className="demo-admin-metrics" aria-label="Request summary">
//         {[
//           ["Total Requests", counts.total, FaUsers, "blue"],
//           ["Pending Requests", counts.pending, FaClock, "amber"],
//           ["Replied Requests", counts.replied, FaCheckCircle, "green"],
//           ["Closed Requests", counts.closed, FaTimesCircle, "gray"],
//         ].map(([label, count, Icon, tone]) => (
//           <article className="demo-admin-metric" key={label}>
//             <span className={`demo-admin-metric-icon ${tone}`}>{createElement(Icon, { "aria-hidden": true })}</span>
//             <div><span>{label}</span><strong>{loading ? "—" : count}</strong></div>
//           </article>
//         ))}
//       </section>

//       <section className="demo-admin-list-card">
//         <div className="demo-admin-toolbar">
//           <label className="demo-admin-search">
//             <FaSearch aria-hidden="true" />
//             <input
//               type="search"
//               value={search}
//               placeholder="Search name, email or company"
//               onChange={(event) => { setSearch(event.target.value); setPage(1); }}
//             />
//           </label>
//           <div className="demo-admin-filters">
//             <label>
//               <span className="sr-only">Filter by status</span>
//               <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
//                 {["All", "Pending", "Replied", "Closed"].map((status) => <option key={status}>{status}</option>)}
//               </select>
//             </label>
//             <button type="button" className="demo-admin-sort" onClick={() => setSortNewest((current) => !current)}>
//               <FaCalendarAlt aria-hidden="true" /> Date {sortNewest ? "newest first" : "oldest first"}
//             </button>
//           </div>
//         </div>

//         <div className="demo-admin-table-wrap">
//           <table className="demo-admin-table">
//             <thead>
//               <tr>
//                 <th>Request ID</th><th>Client Name</th><th>Company Name</th><th>Email</th>
//                 <th>Phone</th><th>Submitted Date</th><th>Status</th><th>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {loading ? (
//                 <tr><td colSpan="8" className="demo-admin-empty">Loading demo requests…</td></tr>
//               ) : visibleRequests.length ? visibleRequests.map((request) => (
//                 <tr key={request.id}>
//                   <td data-label="Request ID"><strong>{request.id}</strong></td>
//                   <td data-label="Client Name">{request.fullName}</td>
//                   <td data-label="Company Name">{request.companyName}</td>
//                   <td data-label="Email">{request.workEmail}</td>
//                   <td data-label="Phone">{request.phoneNumber}</td>
//                   <td data-label="Submitted Date">{formatDate(request.submittedAt)}</td>
//                   <td data-label="Status"><span className={`demo-status ${request.status.toLowerCase()}`}>{request.status}</span></td>
//                   <td data-label="Actions">
//                     <div className="demo-admin-actions">
//                       <button type="button" onClick={() => openDetails(request.id)} disabled={loadingRequestId === request.id}>
//                         {loadingRequestId === request.id ? "Loading…" : "View"}
//                       </button>
//                       <button type="button" onClick={() => openReply(request)} disabled={replyLoadingId === request.id}>
//                         {replyLoadingId === request.id ? "Loading…" : "Reply"}
//                       </button>
//                       <button type="button" className="danger" onClick={() => setDeletingId(request.id)}>Delete</button>
//                     </div>
//                   </td>
//                 </tr>
//               )) : (
//                 <tr><td colSpan="8" className="demo-admin-empty">No demo requests found. Submitted requests will appear here.</td></tr>
//               )}
//             </tbody>
//           </table>
//         </div>

//         <footer className="demo-admin-pagination">
//           <span>{filteredRequests.length ? `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filteredRequests.length)} of ${filteredRequests.length}` : "No requests"}</span>
//           <div>
//             <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
//             <span>Page {page} of {pageCount}</span>
//             <button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</button>
//           </div>
//         </footer>
//       </section>

//       {selectedRequest && (
//         <div className="demo-modal-backdrop" role="presentation" onMouseDown={(event) => {
//           if (event.target === event.currentTarget && !sending) setSelectedRequest(null);
//         }}>
//           {selectedRequest.mode === "view" ? (
//             <section className="demo-modal demo-details-modal" role="dialog" aria-modal="true" aria-labelledby="demo-details-title">
//               <header className="demo-modal-header">
//                 <div><span>REQUEST DETAILS</span><h2 id="demo-details-title">{selectedRequest.request.fullName}</h2></div>
//                 <button type="button" aria-label="Close details" onClick={() => setSelectedRequest(null)}>×</button>
//               </header>
//               <div className="demo-modal-content">
//                 <div className="demo-detail-grid">
//                   {[
//                     ["Request ID", selectedRequest.request.id],
//                     ["Email", selectedRequest.request.workEmail],
//                     ["Phone", selectedRequest.request.phoneNumber],
//                     ["Company", selectedRequest.request.companyName],
//                     ["Designation", selectedRequest.request.designation],
//                     ["Industry", selectedRequest.request.industry],
//                     ["Company size", selectedRequest.request.companySize],
//                     ["Preferred demo", `${selectedRequest.request.preferredDemoDate} at ${selectedRequest.request.preferredTime}`],
//                     ["Submitted", formatDate(selectedRequest.request.submittedAt)],
//                     ["Current status", selectedRequest.request.status],
//                   ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || "—"}</strong></div>)}
//                 </div>
//                 <section className="demo-detail-block">
//                   <h3>Additional requirements</h3>
//                   <p>{selectedRequest.request.message || "No additional message provided."}</p>
//                 </section>
//                 <section className="demo-detail-block">
//                   <h3>Admin reply history</h3>
//                   {(selectedRequest.request.replies || []).length ? selectedRequest.request.replies.map((reply) => (
//                     <article className="demo-reply-history" key={reply.id}>
//                       {reply.subject ? <strong>{reply.subject}</strong> : null}
//                       <time>{formatDate(reply.sentAt)}</time>
//                       <p>{reply.message}</p>
//                       {reply.deliveryStatus ? <small>{reply.deliveryStatus}</small> : null}
//                     </article>
//                   )) : <p>No replies have been recorded.</p>}
//                 </section>
//               </div>
//               <footer className="demo-modal-footer">
//                 <button type="button" className="demo-button secondary" onClick={() => setSelectedRequest(null)}>Close</button>
//                 <button type="button" className="demo-button primary" onClick={() => openReply(selectedRequest.request)}><FaEnvelope /> Reply to Client</button>
//               </footer>
//             </section>
//           ) : (
//             <form className="demo-modal demo-reply-modal" role="dialog" aria-modal="true" aria-labelledby="demo-reply-title" onSubmit={submitReply}>
//               <header className="demo-modal-header">
//                 <div><span>CLIENT COMMUNICATION</span><h2 id="demo-reply-title">Reply to {selectedRequest.request.fullName}</h2></div>
//                 <button type="button" aria-label="Close reply" onClick={() => setSelectedRequest(null)} disabled={sending}>×</button>
//               </header>
//               <div className="demo-modal-content">
//                 <label className="demo-compose-field"><span>To</span><input value={selectedRequest.request.workEmail} readOnly /></label>
//                 <label className="demo-compose-field"><span>Message</span><textarea rows="12" value={replyMessage} onChange={(event) => setReplyMessage(event.target.value)} required /></label>
//                 {replyError && <p className="demo-admin-error" role="alert">{replyError}</p>}
//               </div>
//               <footer className="demo-modal-footer">
//                 <button type="button" className="demo-button secondary" onClick={() => setSelectedRequest(null)} disabled={sending}>Cancel</button>
//                 <button type="submit" className="demo-button primary" disabled={sending}>{sending ? "Sending…" : "Send Reply"}</button>
//               </footer>
//             </form>
//           )}
//         </div>
//       )}

//       {deletingId && (
//         <div className="demo-modal-backdrop" role="presentation">
//           <section className="demo-modal demo-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="demo-delete-title">
//             <header className="demo-modal-header">
//               <div><span>DELETE REQUEST</span><h2 id="demo-delete-title">Delete demo request?</h2></div>
//               <button type="button" aria-label="Close confirmation" onClick={() => setDeletingId("")} disabled={deleting}>×</button>
//             </header>
//             <p>This will remove <strong>{requests.find((request) => request.id === deletingId)?.fullName || "this client"}</strong>’s request from the active list.</p>
//             <footer className="demo-modal-footer">
//               <button type="button" className="demo-button secondary" onClick={() => setDeletingId("")} disabled={deleting}>Cancel</button>
//               <button type="button" className="demo-button delete" onClick={confirmDelete} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</button>
//             </footer>
//           </section>
//         </div>
//       )}
//     </main>
//   );
// }

// export default DemoRequests;
import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaEye,
  FaEnvelope,
  FaReply,
  FaSearch,
  FaSpinner,
  FaTimesCircle,
  FaTrashAlt,
  FaUsers,
} from "react-icons/fa";
import {
  deleteDemoRequest,
  getDemoRequestById,
  getDemoRequests,
  replyToDemoRequest,
} from "../services/demoRequestService";
import { getAdminReplyTemplate } from "../services/demoRequestEmailTemplates";
import "./DemoRequests.css";

const PAGE_SIZE = 8;

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

function DemoRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortNewest, setSortNewest] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyError, setReplyError] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingRequestId, setLoadingRequestId] = useState("");
  const [replyLoadingId, setReplyLoadingId] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setPageError("");
    try {
      setRequests(await getDemoRequests());
    } catch (error) {
      setPageError(error?.message || "Demo requests could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const counts = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((request) => String(request.status).toLowerCase() === "pending").length,
    replied: requests.filter((request) => String(request.status).toLowerCase() === "replied").length,
    closed: requests.filter((request) => String(request.status).toLowerCase() === "closed").length,
  }), [requests]);

  const filteredRequests = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return requests
      .filter((request) => statusFilter === "All" || request.status === statusFilter)
      .filter((request) => !needle || [
        request.fullName,
        request.workEmail,
        request.companyName,
      ].some((value) => String(value || "").toLowerCase().includes(needle)))
      .sort((left, right) => (new Date(left.submittedAt) - new Date(right.submittedAt)) * (sortNewest ? -1 : 1));
  }, [requests, search, statusFilter, sortNewest]);

  const pageCount = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const visibleRequests = filteredRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const syncRequestStatus = (request) => {
    setRequests((current) => current.map((item) =>
      item.id === request.id ? { ...item, status: request.status } : item
    ));
  };

  const openDetails = async (id) => {
    setPageError("");
    setLoadingRequestId(id);
    try {
      const request = await getDemoRequestById(id);
      if (!request) throw new Error("This demo request is no longer available.");
      syncRequestStatus(request);
      setSelectedRequest({ mode: "view", request });
    } catch (error) {
      setPageError(error?.message || "The request details could not be loaded.");
    } finally {
      setLoadingRequestId("");
    }
  };

  const openReply = async (request) => {
    setPageError("");
    setReplyLoadingId(request.id);
    setReplyMessage("");
    try {
      const currentRequest = await getDemoRequestById(request.id);
      if (!currentRequest) throw new Error("This demo request is no longer available.");
      syncRequestStatus(currentRequest);
      setReplyMessage(getAdminReplyTemplate(currentRequest).message);
      setSelectedRequest({ mode: "reply", request: currentRequest });
    } catch (error) {
      setPageError(error?.message || "The request details could not be loaded.");
    } finally {
      setReplyLoadingId("");
    }
    setReplyError("");
  };

  const submitReply = async (event) => {
    event.preventDefault();
    if (!replyMessage.trim()) {
      setReplyError("Message is required.");
      return;
    }
    if (sending) return;

    setSending(true);
    setReplyError("");
    try {
      const requestId = selectedRequest.request.id;
      const result = await replyToDemoRequest(requestId, {
        message: replyMessage.trim(),
      });
      setNotice("Reply submitted successfully.");
      const [listRefresh, detailRefresh] = await Promise.allSettled([
        getDemoRequests(),
        getDemoRequestById(requestId),
      ]);
      const refreshErrors = [];
      if (listRefresh.status === "fulfilled") {
        setRequests(listRefresh.value);
      } else {
        refreshErrors.push(`list: ${listRefresh.reason?.message || "refresh failed"}`);
      }
      if (detailRefresh.status === "fulfilled" && detailRefresh.value) {
        setSelectedRequest({ mode: "view", request: detailRefresh.value });
      } else {
        const refreshedRequest = result.request || selectedRequest.request;
        setSelectedRequest({ mode: "view", request: refreshedRequest });
        if (detailRefresh.status === "rejected") {
          refreshErrors.push(`details: ${detailRefresh.reason?.message || "refresh failed"}`);
        } else {
          refreshErrors.push("details: request was not returned by the API");
        }
      }
      if (refreshErrors.length) {
        setPageError(`Reply was accepted, but ${refreshErrors.join(" and ")}.`);
      }
    } catch (error) {
      setReplyError(error?.message || "The reply could not be saved. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId || deleting) return;
    setDeleting(true);
    try {
      await deleteDemoRequest(deletingId);
      setRequests((current) => current.filter((request) => request.id !== deletingId));
      setSelectedRequest(null);
      setDeletingId("");
      setPage((current) => Math.min(current, Math.max(1, Math.ceil((filteredRequests.length - 1) / PAGE_SIZE))));
      setNotice("Demo request deleted.");
      await loadRequests();
    } catch (error) {
      setPageError(error?.message || "The demo request could not be deleted.");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <main className="demo-admin-page">
      <header className="demo-admin-heading">
        <div>
          <span className="demo-admin-eyebrow">SUPER ADMIN</span>
          <h1>Demo Requests</h1>
          <p>Review and manage requests from prospective clients.</p>
        </div>
        <button className="demo-admin-refresh" type="button" onClick={loadRequests} disabled={loading}>
          Refresh
        </button>
      </header>

      {notice && <div className="demo-admin-notice" role="status">{notice}</div>}
      {pageError && <div className="demo-admin-error" role="alert">{pageError}</div>}

      <section className="demo-admin-metrics" aria-label="Request summary">
        {[
          ["Total Requests", counts.total, FaUsers, "blue"],
          ["Pending Requests", counts.pending, FaClock, "amber"],
          ["Replied Requests", counts.replied, FaCheckCircle, "green"],
          ["Closed Requests", counts.closed, FaTimesCircle, "gray"],
        ].map(([label, count, Icon, tone]) => (
          <article className="demo-admin-metric" key={label}>
            <span className={`demo-admin-metric-icon ${tone}`}>{createElement(Icon, { "aria-hidden": true })}</span>
            <div><span>{label}</span><strong>{loading ? "—" : count}</strong></div>
          </article>
        ))}
      </section>

      <section className="demo-admin-list-card">
        <div className="demo-admin-toolbar">
          <label className="demo-admin-search">
            <FaSearch aria-hidden="true" />
            <input
              type="search"
              value={search}
              placeholder="Search name, email or company"
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
          </label>
          <div className="demo-admin-filters">
            <label>
              <span className="sr-only">Filter by status</span>
              <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
                {["All", "Pending", "Replied", "Closed"].map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <button type="button" className="demo-admin-sort" onClick={() => setSortNewest((current) => !current)}>
              <FaCalendarAlt aria-hidden="true" /> Date {sortNewest ? "newest first" : "oldest first"}
            </button>
          </div>
        </div>

        <div className="demo-admin-table-wrap">
          <table className="demo-admin-table">
            <thead>
              <tr>
                <th>Request ID</th><th>Client Name</th><th>Company Name</th><th>Email</th>
                <th>Phone</th><th>Submitted Date</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="demo-admin-empty">Loading demo requests…</td></tr>
              ) : visibleRequests.length ? visibleRequests.map((request) => (
                <tr key={request.id}>
                  <td data-label="Request ID"><strong>{request.id}</strong></td>
                  <td data-label="Client Name">{request.fullName}</td>
                  <td data-label="Company Name">{request.companyName}</td>
                  <td data-label="Email">{request.workEmail}</td>
                  <td data-label="Phone">{request.phoneNumber}</td>
                  <td data-label="Submitted Date">{formatDate(request.submittedAt)}</td>
                  <td data-label="Status"><span className={`demo-status ${request.status.toLowerCase()}`}>{request.status}</span></td>
                  <td data-label="Actions">
                    <div className="demo-admin-actions">
                      <button
                        type="button"
                        aria-label={loadingRequestId === request.id ? "Loading request details" : "View request details"}
                        title={loadingRequestId === request.id ? "Loading request details" : "View request details"}
                        onClick={() => openDetails(request.id)}
                        disabled={loadingRequestId === request.id}
                      >
                        {loadingRequestId === request.id
                          ? <FaSpinner className="is-spinning" aria-hidden="true" />
                          : <FaEye aria-hidden="true" />}
                      </button>
                      <button
                        type="button"
                        aria-label={replyLoadingId === request.id ? "Loading reply form" : "Reply to request"}
                        title={replyLoadingId === request.id ? "Loading reply form" : "Reply to request"}
                        onClick={() => openReply(request)}
                        disabled={replyLoadingId === request.id}
                      >
                        {replyLoadingId === request.id
                          ? <FaSpinner className="is-spinning" aria-hidden="true" />
                          : <FaReply aria-hidden="true" />}
                      </button>
                      <button
                        type="button"
                        className="danger"
                        aria-label={`Delete ${request.fullName}'s demo request`}
                        title="Delete request"
                        onClick={() => setDeletingId(request.id)}
                      >
                        <FaTrashAlt aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="8" className="demo-admin-empty">No demo requests found. Submitted requests will appear here.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="demo-admin-pagination">
          <span>{filteredRequests.length ? `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filteredRequests.length)} of ${filteredRequests.length}` : "No requests"}</span>
          <div>
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
            <span>Page {page} of {pageCount}</span>
            <button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        </footer>
      </section>

      {selectedRequest && (
        <div className="demo-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !sending) setSelectedRequest(null);
        }}>
          {selectedRequest.mode === "view" ? (
            <section className="demo-modal demo-details-modal" role="dialog" aria-modal="true" aria-labelledby="demo-details-title">
              <header className="demo-modal-header">
                <div><span>REQUEST DETAILS</span><h2 id="demo-details-title">{selectedRequest.request.fullName}</h2></div>
                <button type="button" aria-label="Close details" onClick={() => setSelectedRequest(null)}>×</button>
              </header>
              <div className="demo-modal-content">
                <div className="demo-detail-grid">
                  {[
                    ["Request ID", selectedRequest.request.id],
                    ["Email", selectedRequest.request.workEmail],
                    ["Phone", selectedRequest.request.phoneNumber],
                    ["Company", selectedRequest.request.companyName],
                    ["Designation", selectedRequest.request.designation],
                    ["Industry", selectedRequest.request.industry],
                    ["Company size", selectedRequest.request.companySize],
                    ["Preferred demo", `${selectedRequest.request.preferredDemoDate} at ${selectedRequest.request.preferredTime}`],
                    ["Submitted", formatDate(selectedRequest.request.submittedAt)],
                    ["Current status", selectedRequest.request.status],
                  ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || "—"}</strong></div>)}
                </div>
                <section className="demo-detail-block">
                  <h3>Additional requirements</h3>
                  <p>{selectedRequest.request.message || "No additional message provided."}</p>
                </section>
                <section className="demo-detail-block">
                  <h3>Admin Reply</h3>
                  {selectedRequest.request.adminReply.trim() ? (
                    <article className="demo-reply-history">
                      <p>{selectedRequest.request.adminReply}</p>
                      {selectedRequest.request.repliedAt ? (
                        <small><strong>Replied At:</strong> {formatDate(selectedRequest.request.repliedAt)}</small>
                      ) : null}
                    </article>
                  ) : <p>No admin reply has been recorded.</p>}
                </section>
              </div>
              <footer className="demo-modal-footer">
                <button type="button" className="demo-button secondary" onClick={() => setSelectedRequest(null)}>Close</button>
                <button type="button" className="demo-button primary" onClick={() => openReply(selectedRequest.request)}><FaEnvelope /> Reply to Client</button>
              </footer>
            </section>
          ) : (
            <form className="demo-modal demo-reply-modal" role="dialog" aria-modal="true" aria-labelledby="demo-reply-title" onSubmit={submitReply}>
              <header className="demo-modal-header">
                <div><span>CLIENT COMMUNICATION</span><h2 id="demo-reply-title">Reply to {selectedRequest.request.fullName}</h2></div>
                <button type="button" aria-label="Close reply" onClick={() => setSelectedRequest(null)} disabled={sending}>×</button>
              </header>
              <div className="demo-modal-content">
                <label className="demo-compose-field"><span>To</span><input value={selectedRequest.request.workEmail} readOnly /></label>
                <label className="demo-compose-field"><span>Message</span><textarea rows="12" value={replyMessage} onChange={(event) => setReplyMessage(event.target.value)} required /></label>
                {replyError && <p className="demo-admin-error" role="alert">{replyError}</p>}
              </div>
              <footer className="demo-modal-footer">
                <button type="button" className="demo-button secondary" onClick={() => setSelectedRequest(null)} disabled={sending}>Cancel</button>
                <button type="submit" className="demo-button primary" disabled={sending}>{sending ? "Sending…" : "Send Reply"}</button>
              </footer>
            </form>
          )}
        </div>
      )}

      {deletingId && (
        <div className="demo-modal-backdrop" role="presentation">
          <section className="demo-modal demo-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="demo-delete-title">
            <header className="demo-modal-header">
              <div><span>DELETE REQUEST</span><h2 id="demo-delete-title">Delete demo request?</h2></div>
              <button type="button" aria-label="Close confirmation" onClick={() => setDeletingId("")} disabled={deleting}>×</button>
            </header>
            <p>This will remove <strong>{requests.find((request) => request.id === deletingId)?.fullName || "this client"}</strong>’s request from the active list.</p>
            <footer className="demo-modal-footer">
              <button type="button" className="demo-button secondary" onClick={() => setDeletingId("")} disabled={deleting}>Cancel</button>
              <button type="button" className="demo-button delete" onClick={confirmDelete} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}

export default DemoRequests;
