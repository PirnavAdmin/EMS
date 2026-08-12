import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaRedo, FaSave, FaTimes } from "react-icons/fa";
import "./SuperAdmin.css";
import "../Employees/EmployeeList.css";
import AppPagination from "../components/AppPagination";
import { TableSkeleton } from "../components/Skeletons";
import { toastError, toastSuccess } from "../components/common/toast/toastService";
import { createAdmin, getAdmins, getApiErrorMessage, updateAdminStatus } from "../services/superAdminService";

const ROWS_PER_PAGE = 10;
const initialForm = {
  email: "",
  password: "",
};

const statusClass = (isActive) =>
  isActive ? "active" : "inactive";
const displayValue = (value, fallback = "-") => {
  const normalized = String(value ?? "").trim();
  return !normalized || normalized === "undefined" || normalized === "null" || normalized === "NaN"
    ? fallback
    : normalized;
};

function SuperAdminClients() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [search, setSearch] = useState("");
  const sortKey = "id";
  const sortDirection = "desc";
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState("");

  const loadAdmins = async () => {
    setLoading(true);
    setError("");

    try {
      setAdmins(await getAdmins());
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Unable to load admins.");
      setError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const visibleAdmins = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = admins.filter((admin) =>
      !query || `${admin.id ?? admin.adminId ?? admin.Id}
 ${admin.email ?? admin.Email}
 ${admin.isActive ?? admin.IsActive}`.toLowerCase().includes(query)
    );

    return [...filtered].sort((left, right) => {
      const leftValue = String(left[sortKey] ?? "").toLowerCase();
      const rightValue = String(right[sortKey] ?? "").toLowerCase();
      const result = leftValue.localeCompare(rightValue, undefined, { numeric: true });
      return sortDirection === "asc" ? result : -result;
    });
  }, [admins, search, sortDirection, sortKey]);

  const pagedAdmins = visibleAdmins.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);

    try {
      const payload = {
        email: form.email.trim(),
        password: form.password,
      };
      const response = await createAdmin(payload);
      const createdAdminId =
        response?.data?.adminId ||
        response?.data?.AdminId ||
        response?.data?.data?.adminId ||
        response?.data?.data?.AdminId;

      toastSuccess("Admin added successfully.");
      setForm(initialForm);
      setShowForm(false);
      await loadAdmins();
      if (createdAdminId) {
        navigate(
          `/super-admin/administration/permissions?adminId=${createdAdminId}&adminEmail=${encodeURIComponent(
            form.email.trim()
          )}`
        );
      }
    } catch (requestError) {
      toastError(getApiErrorMessage(requestError, "Unable to add admin."));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (admin) => {
    const nextStatus = !admin.isActive;
    const confirmed = window.confirm(
      `Change ${displayValue(admin.name || admin.email, "this admin")} to ${
        nextStatus ? "Active" : "Inactive"
      }?`
    );
    if (!confirmed) return;

    setStatusUpdating(String(admin.id ?? admin.adminId));

    try {
       const adminId =
        admin.id ??
        admin.adminId ??
        admin.Id;

      await updateAdminStatus(adminId, nextStatus);
      toastSuccess("Admin status updated.");
      await loadAdmins();
    } catch (requestError) {
      toastError(getApiErrorMessage(requestError, "Unable to update status."));
    } finally {
      setStatusUpdating("");
    }
  };

  return (
    <div className="emp-page-unique super-admin-page">
      <div className="emp-header-unique">
        <div>
          <h2>Admin Management</h2>
          <p>Create and manage client admins</p>
        </div>
        <div className="emp-header-actions">
          <button className="emp-download-btn" type="button" onClick={loadAdmins} disabled={loading}>
            <FaRedo /> Refresh
          </button>
          <button className="emp-add-btn" type="button" onClick={() => setShowForm(true)}>
            <FaPlus /> Add Admin
          </button>
        </div>
      </div>

      <div className="emp-toolbar">
        <input className="emp-search-box" placeholder="Search admins" value={search} onChange={(event) => setSearch(event.target.value)} />
        {error ? <button className="emp-download-btn" type="button" onClick={loadAdmins}>Retry</button> : null}
      </div>

      {loading ? (
        <TableSkeleton rows={10} columns={4} />
      ) : (
        <div className="emp-table-container">
          <table className="emp-table super-admin-table--compact">
            <thead>
              <tr>
                <th>Admin ID</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedAdmins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="super-admin-empty">
                    No Records Found
                  </td>
                </tr>
              ) : (
                pagedAdmins.map((admin) => (
                  <tr key={admin.id ?? admin.adminId ?? admin.Id}>
                    <td>
                      {admin.id ??
                        admin.adminId ??
                        admin.Id ??
                        "-"}
                    </td>

                    <td>{admin.email}</td>

                    <td>
                      <span
                        className={`super-admin-badge ${statusClass(admin.isActive)}`}
                      >
                        {admin.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="emp-action-col">
                      <button
                        className="emp-action-btn emp-action-btn--edit"
                        type="button"
                        disabled={statusUpdating === String(admin.id ?? admin.adminId ?? admin.Id)}
                        onClick={() => handleStatusUpdate(admin)}
                      >
                        {statusUpdating === String(admin.id ?? admin.adminId ?? admin.Id)
                          ? "Updating..."
                          : admin.isActive
                            ? "Set Inactive"
                            : "Set Active"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <AppPagination totalItems={visibleAdmins.length} currentPage={page} pageSize={ROWS_PER_PAGE} onPageChange={setPage} itemLabel="admins" />

      {showForm ? (
        <div className="emp-modal-overlay">
          <form className="emp-modal-box super-admin-form" onSubmit={handleSubmit}>
            <div className="super-admin-modal-title">
              <h3>Add Admin</h3>
              <button className="view-close" type="button" onClick={() => setShowForm(false)}><FaTimes /></button>
            </div>
            <div className="super-admin-form-grid">
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Password
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>
            <div className="emp-modal-btns">
              <button
                className="emp-close-btn"
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="emp-save-btn"
                type="submit"
                disabled={saving}
              >
                <FaSave />
                {saving ? "Creating..." : "Create Admin"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default SuperAdminClients;
