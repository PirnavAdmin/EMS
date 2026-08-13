import React, { useEffect, useMemo, useState } from "react";
import { FaPlus, FaRedo, FaSave, FaTimes } from "react-icons/fa";
import "./SuperAdmin.css";
import "../Employees/EmployeeList.css";
import AppPagination from "../components/AppPagination";
import { TableSkeleton } from "../components/Skeletons";
import { toastError, toastSuccess } from "../components/common/toast/toastService";
import {
  createAdminSubscription,
  getAdminSubscriptionUsage,
  getAdminSubscriptions,
  getAdmins,
  getApiErrorMessage,
  updateAdminSubscription } from
"../services/superAdminService";
import { formatDate } from "../utils/date";

const ROWS_PER_PAGE = 10;
const initialForm = {
  adminId: "",
  startDate: "",
  endDate: "",
  maximumUsers: "",
  isActive: true
};

const statusClass = (value) => String(value || "").toLowerCase().replace(/\s+/g, "-");

function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [usage, setUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [subscriptionList, adminList] = await Promise.all([
      getAdminSubscriptions(),
      getAdmins()]
      );
      setSubscriptions(subscriptionList);
      setAdmins(adminList);
    } catch (error) {
      toastError(getApiErrorMessage(error, "Unable to load subscriptions."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const visibleSubscriptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return subscriptions.filter((item) =>
    !query || `${item.admin} ${item.adminId} ${item.plan} ${item.status} ${item.billingCycle}`.toLowerCase().includes(query)
    );
  }, [search, subscriptions]);

  const pagedSubscriptions = visibleSubscriptions.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setShowForm(true);
  };

  const openEdit = (subscription) => {
    setEditing(subscription);
    setForm({
      adminId: subscription.adminId || "",
      startDate: String(subscription.startDate || "").slice(0, 10),
      endDate: String(subscription.endDate || "").slice(0, 10),
      maximumUsers: subscription.maxUsers || subscription.maximumUsers || "",
      isActive:
      subscription.isActive ??
      subscription.status === "Active"
    });
    setShowForm(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const validateForm = () => {
    if (
    !form.adminId ||
    !form.startDate ||
    !form.endDate ||
    !form.maximumUsers)
    {
      return "Please fill all required fields.";
    }

    if (Number(form.maximumUsers) <= 0) {
      return "Maximum Users must be greater than zero.";
    }

    if (new Date(form.startDate) > new Date(form.endDate)) {
      return "Start Date cannot be after End Date.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationMessage = validateForm();

    if (validationMessage) {
      toastError(validationMessage);
      return;
    }

    setSaving(true);
    const payload = {
      adminId: Number(form.adminId),
      maxUsers: Number(form.maximumUsers),
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      isActive: form.isActive,
      status: form.isActive ? "Active" : "Inactive"
    };

    try {
      if (editing) {
        await updateAdminSubscription(form.adminId, {
          adminId: Number(form.adminId),
          maxUsers: Number(form.maximumUsers),
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          isActive: form.isActive,
          status: form.isActive ? "Active" : "Inactive"
        });
        toastSuccess("Subscription updated successfully.");
      } else {
        await createAdminSubscription(payload);
        toastSuccess("Subscription created successfully.");
      }

      setShowForm(false);
      setEditing(null);
      setForm(initialForm);
      await loadData();
    } catch (error) {
      toastError(getApiErrorMessage(error, "Unable to save subscription."));
    } finally {
      setSaving(false);
    }
  };

  const openUsage = async (subscription) => {
    setUsageLoading(String(subscription.adminId));
    try {
      setUsage(await getAdminSubscriptionUsage(subscription.adminId));
    } catch (error) {
      toastError(getApiErrorMessage(error, "Unable to load usage."));
    } finally {
      setUsageLoading("");
    }
  };

  const allowedUsers = usage?.allowedUsers ?? usage?.AllowedUsers ?? usage?.maximumUsers ?? 0;
  const currentUsers = usage?.currentUsers ?? usage?.CurrentUsers ?? 0;
  const remainingUsers = usage?.remainingUsers ?? usage?.RemainingUsers ?? Math.max(Number(allowedUsers) - Number(currentUsers), 0);
  const usagePercentage = usage?.usagePercentage ?? usage?.UsagePercentage ?? (allowedUsers ? Math.round(Number(currentUsers) / Number(allowedUsers) * 100) : 0);

  return (
    <div className="emp-page-unique super-admin-page">
      <div className="emp-header-unique">
        <div>
          <h2>Admin Subscriptions</h2>
          <p>Manage plans, limits, billing, and usage</p>
        </div>
        <div className="emp-header-actions">
          <button className="emp-download-btn" type="button" onClick={loadData} disabled={loading}><FaRedo /> Refresh</button>
          <button className="emp-add-btn" type="button" onClick={openCreate}><FaPlus /> Create Subscription</button>
        </div>
      </div>

      <div className="emp-toolbar">
        <input className="emp-search-box" placeholder="Search subscriptions" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      {loading ?
      <TableSkeleton rows={10} columns={9} /> :

      <div className="emp-table-container">
          <table className="emp-table super-admin-table--compact">
            <thead>
              <tr>
                {["Admin", "Maximum Users", "Current Users", "Remaining Users", "Start Date", "End Date", "Status", "Actions"].map((heading) => <th key={heading}>{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {pagedSubscriptions.map((subscription) => {
              const isActive =
              subscription.isActive ??
              subscription.status === "Active";

              return (
                <tr key={subscription.adminId || subscription.id || subscription.Id}>
                  <td>{subscription.admin || subscription.adminId || "-"}</td>

                  <td>{subscription.maxUsers ?? subscription.maximumUsers}</td>
                  <td>{subscription.currentUsers}</td>
                  <td>{subscription.remainingUsers}</td>
                  <td>{formatDate(subscription.startDate)}</td>
                  <td>{formatDate(subscription.endDate)}</td>
                  <td>
                    <span
                      className={`super-admin-badge ${statusClass(isActive ? "Active" : "Inactive")}`
                      }>
                      
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="emp-action-col super-admin-actions">
                    <button className="emp-action-btn emp-action-btn--edit" type="button" onClick={() => openEdit(subscription)}>Edit</button>
                    <button className="emp-action-btn emp-action-btn--edit" type="button" disabled={usageLoading === String(subscription.adminId)} onClick={() => openUsage(subscription)}>
                      {usageLoading === String(subscription.adminId) ? "Loading..." : "Usage"}
                    </button>
                  </td>
                </tr>);

            })}
            </tbody>
          </table>
        </div>
      }

      <AppPagination totalItems={visibleSubscriptions.length} currentPage={page} pageSize={ROWS_PER_PAGE} onPageChange={setPage} itemLabel="subscriptions" />

      {showForm ?
      <div className="emp-modal-overlay">
          <form className="emp-modal-box super-admin-form" onSubmit={handleSubmit}>
            <div className="super-admin-modal-title">
              <h3>{editing ? "Edit Subscription" : "Create Subscription"}</h3>
              <button className="view-close" type="button" onClick={() => setShowForm(false)}><FaTimes /></button>
            </div>
            <label>Admin<select name="adminId" value={form.adminId} onChange={handleChange} required>
              <option value="">Select Admin</option>
              {admins.map((admin) => <option key={admin.adminId || admin.email} value={admin.adminId}>{admin.name || admin.email}</option>)}
            </select></label>
            <label>Start Date<input name="startDate" type="date" value={form.startDate} onChange={handleChange} required /></label>
            <label>End Date<input name="endDate" type="date" value={form.endDate} onChange={handleChange} required /></label>
            <label>Maximum Users<input name="maximumUsers" type="number" min="1" value={form.maximumUsers} onChange={handleChange} required /></label>
            <label>
              Status
              <select
              name="isActive"
              value={form.isActive ? "true" : "false"}
              onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                isActive: e.target.value === "true"
              }))
              }>
              
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <div className="emp-modal-btns">
              <button className="emp-close-btn" type="button" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
              <button className="emp-save-btn" type="submit" disabled={saving}><FaSave /> {saving ? "Saving..." : "Save"}</button>
            </div>
          </form>
        </div> :
      null}

      {usage ?
      <div className="emp-modal-overlay">
          <div className="emp-modal-box">
            <div className="super-admin-modal-title">
              <h3>Subscription Usage</h3>
              <button className="view-close" type="button" onClick={() => setUsage(null)}><FaTimes /></button>
            </div>
            <div className="super-admin-detail-grid">
              <div className="super-admin-readonly-field"><span>Allowed Users</span><strong>{allowedUsers}</strong></div>
              <div className="super-admin-readonly-field"><span>Current Users</span><strong>{currentUsers}</strong></div>
              <div className="super-admin-readonly-field"><span>Remaining Users</span><strong>{remainingUsers}</strong></div>
              <div className="super-admin-readonly-field"><span>Usage Percentage</span><strong>{usagePercentage}%</strong></div>
            </div>
            <div className="super-admin-progress"><span style={{ width: `${Math.min(Number(usagePercentage) || 0, 100)}%` }} /></div>
          </div>
        </div> :
      null}
    </div>);

}

export default Subscriptions;