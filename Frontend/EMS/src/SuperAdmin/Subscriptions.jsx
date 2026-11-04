import React, { useEffect, useState } from "react";
import { FaPlus, FaRedo, FaSave, FaTimes } from "react-icons/fa";
import "./SuperAdmin.css";
import "../Employees/EmployeeList.css";
import AppPagination from "../components/AppPagination";
import { TableSkeleton } from "../components/Skeletons";
import { toastError, toastSuccess } from "../components/common/Toast/toastService";
import {
  createOrganizationSubscription,
  getOrganizations,
  getOrganizationSubscription,
  getOrganizationSubscriptionUsage,
  getOrganizationSubscriptionsPage,
  getApiErrorMessage,
  updateOrganizationSubscription
} from "../services/superAdminService";
import { formatDate } from "../utils/date";

const ROWS_PER_PAGE = 10;

const initialForm = {
  organizationId: "",
  planName: "",
  billingCycle: "Monthly",
  price: "",
  maxUsers: "",
  startDate: "",
  endDate: "",
  isActive: true,
};

const statusClass = (value) => String(value || "").toLowerCase().replace(/\s+/g, "-");

function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [totalSubscriptions, setTotalSubscriptions] = useState(0);
  const [organizations, setOrganizations] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [usage, setUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState("");

  const getOrganizationId = (subscription) =>
    subscription.organizationId ?? subscription.raw?.organizationId ?? subscription.raw?.OrganizationId ?? "";

  const loadData = async () => {
    setLoading(true);
    try {
      const [subscriptionResult, organizationList] = await Promise.all([
        getOrganizationSubscriptionsPage({ search, pageNumber: page, pageSize: ROWS_PER_PAGE }),
        getOrganizations(),
      ]);
      setSubscriptions(subscriptionResult.items);
      setTotalSubscriptions(subscriptionResult.totalCount);
      setOrganizations(organizationList);
    } catch (error) {
      toastError(getApiErrorMessage(error, "Unable to load subscriptions."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, search]);

  const pagedSubscriptions = subscriptions;

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setShowForm(true);
  };

  const openEdit = async (subscription) => {
    const organizationId = getOrganizationId(subscription);
    if (!organizationId) {
      toastError("This subscription is not linked to an organization.");
      return;
    }

    setUsageLoading(String(organizationId));
    try {
      const currentSubscription = await getOrganizationSubscription(organizationId);
      setEditing(subscription);
      /* --- old: admin-based edit form prefill ---
      setForm({
        adminId: subscription.adminId || "",
        startDate: String(subscription.startDate || "").slice(0, 10),
        endDate: String(subscription.endDate || "").slice(0, 10),
        maximumUsers: subscription.maxUsers || subscription.maximumUsers || "",
        isActive:
        subscription.isActive ??
        subscription.status === "Active"
      });
      */
      setForm({
        organizationId,
        planName: currentSubscription.plan || "",
        billingCycle: currentSubscription.billingCycle || "Monthly",
        price: currentSubscription.price ?? "",
        maxUsers: currentSubscription.maxUsers || currentSubscription.maximumUsers || "",
        startDate: String(currentSubscription.startDate || "").slice(0, 10),
        endDate: String(currentSubscription.endDate || "").slice(0, 10),
        isActive: currentSubscription.isActive,
      });
      setShowForm(true);
    } catch (error) {
      toastError(getApiErrorMessage(error, "Unable to load the organization subscription."));
    } finally {
      setUsageLoading("");
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  /* --- old: admin-based validation ---
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
  */
  const validateForm = () => {
    if (!form.organizationId || !form.planName || !form.billingCycle || !form.price || !form.startDate || !form.endDate || !form.maxUsers) {
      return "Please fill all required fields.";
    }

    if (Number(form.maxUsers) <= 0) {
      return "Maximum Users must be greater than zero.";
    }

    if (Number(form.price) < 0) {
      return "Price cannot be negative.";
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
      organizationId: Number(form.organizationId),
      planName: form.planName.trim(),
      billingCycle: form.billingCycle,
      price: Number(form.price),
      maxUsers: Number(form.maxUsers),
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      isActive: form.isActive
    };

    try {
      if (editing) {
        await updateOrganizationSubscription(form.organizationId, {
          maxUsers: payload.maxUsers,
          startDate: payload.startDate,
          endDate: payload.endDate,
          isActive: payload.isActive,
          planName: payload.planName,
          billingCycle: payload.billingCycle,
          price: payload.price
        });

        toastSuccess("Subscription updated successfully.");
      } else {
        await createOrganizationSubscription(
          form.organizationId,
          payload
        );

        toastSuccess("Subscription created successfully.");
      }

      setShowForm(false);
      setEditing(null);
      setForm(initialForm);
      await loadData();

    } catch (error) {
      toastError(
        getApiErrorMessage(error, "Unable to save subscription.")
      );
    } finally {
      setSaving(false);
    }
  };

  const openUsage = async (subscription) => {
    const organizationId = getOrganizationId(subscription);
    if (!organizationId) {
      toastError("This subscription is not linked to an organization.");
      return;
    }

    setUsageLoading(String(organizationId));
    try {
      setUsage(await getOrganizationSubscriptionUsage(organizationId));
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
          <h2>Organization Subscriptions</h2>
          <p>Manage plans, limits, billing, and usage</p>
        </div>
        <div className="emp-header-actions">
          <button className="emp-download-btn" type="button" onClick={loadData} disabled={loading}><FaRedo /> Refresh</button>
          <button className="emp-add-btn" type="button" onClick={openCreate}><FaPlus /> Create Subscription</button>
        </div>
      </div>

      <div className="emp-toolbar">
        <input className="emp-search-box" placeholder="Search subscriptions" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
      </div>

      {loading ?
        <TableSkeleton rows={10} columns={9} /> :

        <div className="emp-table-container">
          <table className="emp-table super-admin-table--compact">
            <thead>
              <tr>
                {/* --- old: mapped subscription headers without a sticky Actions column ---
                {["Organization", "Maximum Users", "Current Users", "Remaining Users", "Start Date", "End Date", "Status", "Actions"].map((heading) => <th key={heading}>{heading}</th>)}
                */}
                <th>Organization</th>
                <th>Maximum Users</th>
                <th>Current Users</th>
                <th>Remaining Users</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th className="emp-action-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedSubscriptions.map((subscription) => {
                const isActive =
                  subscription.isActive ??
                  subscription.status === "Active";

                return (
                  <tr key={subscription.organizationId || subscription.adminId || subscription.id || subscription.Id}>
                    <td>{subscription.organizationName || subscription.admin || subscription.organizationId || "-"}</td>

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
                    {/* --- old: subscription action cell with the non-scoped action layout class ---
                  <td className="emp-action-col super-admin-actions">
                    <button className="emp-action-btn emp-action-btn--edit" type="button" disabled={usageLoading === String(getOrganizationId(subscription))} onClick={() => openEdit(subscription)}>Edit</button>
                    <button className="emp-action-btn emp-action-btn--edit" type="button" disabled={usageLoading === String(getOrganizationId(subscription))} onClick={() => openUsage(subscription)}>
                      {usageLoading === String(getOrganizationId(subscription)) ? "Loading..." : "Usage"}
                    </button>
                  </td>
                  */}
                    {/* --- old: sibling Edit and Usage buttons without a shared action container ---
                  <td className="emp-action-col">
                    <button className="emp-action-btn emp-action-btn--edit" type="button" disabled={usageLoading === String(getOrganizationId(subscription))} onClick={() => openEdit(subscription)}>Edit</button>
                    <button className="emp-action-btn emp-action-btn--edit" type="button" disabled={usageLoading === String(getOrganizationId(subscription))} onClick={() => openUsage(subscription)}>
                      {usageLoading === String(getOrganizationId(subscription)) ? "Loading..." : "Usage"}
                    </button>
                  </td>
                  */}
                    <td className="emp-action-col">
                      <div className="action-cell">
                        <button className="emp-action-btn emp-action-btn--edit" type="button" disabled={usageLoading === String(getOrganizationId(subscription))} onClick={() => openEdit(subscription)}>Edit</button>
                        <button className="emp-action-btn emp-action-btn--edit" type="button" disabled={usageLoading === String(getOrganizationId(subscription))} onClick={() => openUsage(subscription)}>
                          {usageLoading === String(getOrganizationId(subscription)) ? "Loading..." : "Usage"}
                        </button>
                      </div>
                    </td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>
      }

      <AppPagination totalItems={totalSubscriptions} currentPage={page} pageSize={ROWS_PER_PAGE} onPageChange={setPage} itemLabel="subscriptions" />

      {showForm ?
        <div className="emp-modal-overlay">
          <form className="emp-modal-box super-admin-form" onSubmit={handleSubmit}>
            <div className="super-admin-modal-title">
              <h3>{editing ? "Edit Subscription" : "Create Subscription"}</h3>
              <button className="view-close" type="button" onClick={() => setShowForm(false)}><FaTimes /></button>
            </div>
            {/* Note: the table and normalizeSubscription still use admin/adminId; this form-only pass does not change those out-of-scope mappings. */}
            {/* --- old: admin selector and flat subscription fields ---
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
            */}
            <div className="super-admin-form-grid form-grid">
              <label className="field-full">Organization<select name="organizationId" value={form.organizationId} onChange={handleChange} required>
                <option value="">Select Organization</option>
                {organizations.map((organization) => <option key={organization.organizationId || organization.organizationCode} value={organization.organizationId}>{`${organization.organizationName} (${organization.organizationCode})`}</option>)}
              </select></label>
              <label>Plan Name<input name="planName" value={form.planName} onChange={handleChange} required /></label>
              <label>Billing Cycle<select name="billingCycle" value={form.billingCycle} onChange={handleChange} required><option>Monthly</option><option>Yearly</option></select></label>
              <label>Price<div className="price-input-wrap"><input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} required /></div></label>
              <label>Maximum Users<input name="maxUsers" type="number" min="1" value={form.maxUsers} onChange={handleChange} required /></label>
              <label>Start Date<input name="startDate" type="date" value={form.startDate} onChange={handleChange} required /></label>
              <label>End Date<input name="endDate" type="date" value={form.endDate} onChange={handleChange} required /></label>
              <label>
                Status
                <select
                  name="isActive"
                  value={form.isActive ? "true" : "false"}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.value === "true" }))}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
            </div>
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
