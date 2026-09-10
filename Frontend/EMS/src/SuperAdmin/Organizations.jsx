
import React, { useEffect, useState } from "react";
import {
  FaBuilding,
  FaEdit,
  // FaEllipsisV,
  FaEnvelope,
  FaGlobe,
  FaHome,
  FaMapMarkerAlt,
  FaPhone,
  FaPlus,
  FaRedo,
  FaSave,
  FaShieldAlt,
  FaTimes,
  FaTrash,
  FaUser,
  FaUsers,
} from "react-icons/fa";
import "./SuperAdmin.css";
import "../Employees/EmployeeList.css";
import AppPagination from "../components/AppPagination";
import { TableSkeleton } from "../components/Skeletons";
import { toastError, toastSuccess } from "../components/common/Toast/toastService";
import {
  createAdmin,
  createOrganization,
  deleteOrganization,
  getAdmins,
  getAdminsPage,
  getApiErrorMessage,
  getOrganizationsPage,
  updateOrganization,
  updateOrganizationStatus,
  updateAdmin,
  deleteAdmin,
} from "../services/superAdminService";

const ROWS_PER_PAGE = 10;
/* --- old: organization form values ---
const initialForm = {
  organizationName: "",
  organizationCode: "",
  contactPerson: "",
  email: "",
  phoneNumber: "",
  address: "",
  city: "",
  state: "",
  country: "",
  status: "Active",
  adminEmail: "",
  adminPassword: "",
};
*/
const initialForm = {
  organizationName: "",
  organizationCode: "",
  contactPerson: "",
  email: "",
  phoneNumber: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  // postalCode: "",
  status: "Active",
  // adminEmail: "",
  // adminPassword: "",
};

const displayValue = (value, fallback = "-") => {
  const normalized = String(value ?? "").trim();
  return !normalized || normalized === "undefined" || normalized === "null" ? fallback : normalized;
};

const statusClass = (status) => String(status ?? "").toLowerCase().replace(/\s+/g, "-");

function Organizations() {
  const [organizations, setOrganizations] = useState([]);
  const [totalOrganizations, setTotalOrganizations] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  // --- old: one-admin form visibility state ---
  // const [showAdminFields, setShowAdminFields] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [removedAdminIds, setRemovedAdminIds] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [editingOrganizationId, setEditingOrganizationId] = useState(null);
  const [deletingOrganizationId, setDeletingOrganizationId] = useState("");
  const [statusUpdating, setStatusUpdating] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [organizationAdmins, setOrganizationAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsError, setAdminsError] = useState("");
  // --- old: kebab action-menu state ---
  // const [openActionMenuId, setOpenActionMenuId] = useState("");

  /* --- old: unpaginated organization loading ---
  const loadOrganizations = async () => {
    setLoading(true);
    setError("");

    try {
      setOrganizations(await getOrganizations());
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Unable to load organizations.");
      setError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  };
  */
  const loadOrganizations = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getOrganizationsPage({ search, page, pageSize: ROWS_PER_PAGE });
      setOrganizations(result.items);
      setTotalOrganizations(result.totalCount);
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Unable to load organizations.");
      setError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  /* --- old: load only once and filter the full organization collection in the browser ---
  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);
  */
  useEffect(() => {
    loadOrganizations();
  }, [page, search]);

  /* --- old: client-side filtering and pagination ---
  const visibleOrganizations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return organizations.filter((organization) =>
      !query || [
        organization.organizationId,
        organization.organizationName,
        organization.organizationCode,
        organization.contactPerson,
        organization.email,
        organization.city,
        organization.country,
        organization.status,
      ].join(" ").toLowerCase().includes(query)
    );
  }, [organizations, search]);

  const pagedOrganizations = visibleOrganizations.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
  */
  const pagedOrganizations = organizations;

  const closeForm = (force = false) => {
    if (saving && !force) return;
    setShowForm(false);
    // setShowAdminFields(false);
    setAdmins([]);
    setRemovedAdminIds([]);
    setEditingOrganizationId(null);
    setForm(initialForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const isEditing = editingOrganizationId !== null;

    // Validate administrators
    const populatedAdmins = admins.filter(
      (admin) =>
        admin.fullName.trim() ||
        admin.phoneNumber.trim() ||
        admin.email.trim() ||
        admin.password
    );

    const adminsToCreate = populatedAdmins.filter(
      (admin) => !admin.adminId
    );

    const hasAdminCredentials = adminsToCreate.length > 0;

    const hasIncompleteAdmin = adminsToCreate.some(
      (admin) =>
        !admin.fullName.trim() ||
        !admin.phoneNumber.trim() ||
        !admin.email.trim() ||
        !admin.password
    );

    if (hasIncompleteAdmin) {
      toastError(
        "Enter Full Name, Phone Number, Admin Email and Admin Password for every administrator."
      );
      return;
    }

    setSaving(true);

    try {
      // =========================================
      // 1. ORGANIZATION PAYLOAD
      // =========================================

      const organizationPayload = {
        OrganizationName: form.organizationName.trim(),
        OrganizationCode: form.organizationCode.trim(),
        ContactPerson: form.contactPerson.trim(),
        Email: form.email.trim(),
        PhoneNumber: form.phoneNumber.trim(),
        Address: form.address.trim(),
        City: form.city.trim(),
        State: form.state.trim(),
        Country: form.country.trim(),
        Status: form.status,
      };

      console.log(
        "Organization payload:",
        organizationPayload
      );

      // =========================================
      // 2. CREATE / UPDATE ORGANIZATION
      // =========================================

      let createdOrganization;

      if (isEditing) {
        await updateOrganization(
          editingOrganizationId,
          organizationPayload
        );
      } else {
        createdOrganization =
          await createOrganization(organizationPayload);

        console.log(
          "Organization API response:",
          createdOrganization
        );
      }

      // =========================================
      // 3. RESOLVE ORGANIZATION ID
      // =========================================

      let organizationId;

      if (isEditing) {
        organizationId = Number(editingOrganizationId);
      } else {
        organizationId =
          createdOrganization?.data?.organizationId ??
          createdOrganization?.data?.id ??
          createdOrganization?.organizationId ??
          createdOrganization?.id;
      }

      console.log(
        "Resolved organizationId:",
        organizationId
      );

      if (!organizationId) {
        throw new Error(
          "Organization was created, but organizationId was not returned by the API."
        );
      }

      // =========================================
      // 4. DELETE REMOVED ADMINISTRATORS
      // =========================================

      for (const adminId of removedAdminIds) {
        await deleteAdmin(adminId);
      }

      // =========================================
      // 5. CREATE / UPDATE ADMINISTRATORS
      // =========================================

      for (const admin of admins) {
        const hasAdminData =
          admin.fullName.trim() ||
          admin.phoneNumber.trim() ||
          admin.email.trim() ||
          admin.password;

        if (!hasAdminData) continue;

        const adminPayload = {
          email: admin.email.trim(),
          fullName: admin.fullName.trim(),
          phoneNumber: admin.phoneNumber.trim(),
          organizationId,
          isActive: form.status === "Active",
        };

        if (admin.adminId) {
          await updateAdmin(admin.adminId, {
            ...adminPayload,
            ...(admin.password ? { password: admin.password } : {}),
          });
        } else {
          await createAdmin({
            ...adminPayload,
            password: admin.password,
          });
        }
      }

      // =========================================
      //  SUCCESS
      // =========================================

      toastSuccess(
        isEditing
          ? hasAdminCredentials
            ? "Organization updated and new admin added successfully."
            : "Organization updated successfully."
          : hasAdminCredentials
            ? "Organization and admin(s) added successfully."
            : "Organization added successfully."
      );

      closeForm(true);

      await loadOrganizations();

    } catch (requestError) {

      console.error(
        "Organization/Admin API error:",
        requestError?.response?.data || requestError
      );

      toastError(
        getApiErrorMessage(
          requestError,
          isEditing
            ? "Unable to update organization."
            : "Unable to create organization and admin."
        )
      );

    } finally {
      setSaving(false);
    }
  };

  /* --- old: open the edit form without loading existing administrators ---
  const handleEdit = (organization) => {
    const organizationId = organization.organizationId;
    if (!organizationId) {
      toastError("Unable to edit organization.");
      return;
    }

    setEditingOrganizationId(organizationId);
    // setShowAdminFields(false);
    setAdmins([]);
    setForm({
      ...initialForm,
      organizationName: organization.organizationName || "",
      organizationCode: organization.organizationCode || "",
      contactPerson: organization.contactPerson || "",
      email: organization.email || "",
      phoneNumber: organization.phoneNumber || "",
      address: organization.address || "",
      city: organization.city || "",
      state: organization.state || "",
      country: organization.country || initialForm.country,
      status: organization.status || initialForm.status,
    });
    setShowForm(true);
  };
  */
  const handleEdit = async (organization) => {
    const organizationId = organization.organizationId;
    if (!organizationId) {
      toastError("Unable to edit organization.");
      return;
    }

    setEditingOrganizationId(organizationId);
    setRemovedAdminIds([]);
    setForm({
      ...initialForm,
      organizationName: organization.organizationName || "",
      organizationCode: organization.organizationCode || "",
      contactPerson: organization.contactPerson || "",
      email: organization.email || "",
      phoneNumber: organization.phoneNumber || "",
      address: organization.address || "",
      city: organization.city || "",
      state: organization.state || "",
      country: organization.country || initialForm.country,
      status: organization.status || initialForm.status,
    });

    try {
      const allAdmins = await getAdmins();
      setAdmins(
        allAdmins
          .filter((admin) => String(admin.organizationId) === String(organizationId))
          .map((admin) => ({
            adminId: admin.id ?? admin.adminId ?? admin.Id,
            fullName: admin.fullName || admin.name || "",
            phoneNumber: admin.phoneNumber || admin.phone || "",
            email: admin.email || "",
            password: "",
          }))
      );
    } catch (requestError) {
      setAdmins([]);
      toastError(getApiErrorMessage(requestError, "Unable to load organization administrators."));
    }

    setShowForm(true);
  };

  const handleDelete = async (organization) => {
    const organizationId = organization.organizationId;
    if (!organizationId) {
      toastError("Unable to delete organization.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${displayValue(organization.organizationName, "this organization")}? This organization will be soft-deleted.`
    );
    if (!confirmed) return;

    setDeletingOrganizationId(String(organizationId));
    try {
      await deleteOrganization(organizationId);
      toastSuccess("Organization deleted successfully.");
      await loadOrganizations();
    } catch (requestError) {
      toastError(getApiErrorMessage(requestError, "Unable to delete organization."));
    } finally {
      setDeletingOrganizationId("");
    }
  };

  const handleStatusUpdate = async (organization) => {
    const nextStatus = organization.status !== "Active";
    const organizationId = organization.organizationId;
    const confirmed = window.confirm(
      `Change ${displayValue(organization.organizationName, "this organization")} to ${nextStatus ? "Active" : "Inactive"}?`
    );
    if (!confirmed) return;

    setStatusUpdating(String(organizationId));
    try {
      await updateOrganizationStatus(
        organizationId,
        nextStatus,
        `Status changed to ${nextStatus ? "Active" : "Inactive"} by Super Admin.`
      );
      toastSuccess("Organization status updated.");
      await loadOrganizations();
    } catch (requestError) {
      toastError(getApiErrorMessage(requestError, "Unable to update organization status."));
    } finally {
      setStatusUpdating("");
    }
  };

  const loadOrganizationAdmins = async (organization) => {
    const organizationId = organization.organizationId;
    if (!organizationId) return;

    setAdminsLoading(true);
    setAdminsError("");
    try {
      const result = await getAdminsPage({ organizationId, page: 1, pageSize: 100 });
      setOrganizationAdmins(result.items || []);
    } catch (requestError) {
      setOrganizationAdmins([]);
      setAdminsError(getApiErrorMessage(requestError, "Unable to load administrator details."));
    } finally {
      setAdminsLoading(false);
    }
  };

  const openOrganizationDetails = (organization) => {
    setSelectedOrganization(organization);
    setOrganizationAdmins([]);
    loadOrganizationAdmins(organization);
  };

  const closeOrganizationDetails = () => {
    setSelectedOrganization(null);
    setOrganizationAdmins([]);
    setAdminsError("");
  };

  return (
    <div className="emp-page-unique super-admin-page">
      <div className="emp-header-unique">
        <div>
          <h2>Organizations</h2>
          <p>Create and manage organizations</p>
        </div>
        <div className="emp-header-actions">
          <button className="emp-download-btn" type="button" onClick={loadOrganizations} disabled={loading}>
            <FaRedo /> Refresh
          </button>
          {/* --- old: Add Organization reset for one fixed administrator form ---
          <button className="emp-add-btn" type="button" onClick={() => { setEditingOrganizationId(null); setForm(initialForm); setShowAdminFields(false); setShowForm(true); }}>
            <FaPlus /> Add Organization
          </button>
          */}
          <button className="emp-add-btn" type="button" onClick={() => { setEditingOrganizationId(null); setForm(initialForm); setAdmins([]); setShowForm(true); }}>
            <FaPlus /> Add Organization
          </button>
        </div>
      </div>

      <div className="emp-toolbar">
        {/* --- old: browser-only search handler ---
        <input className="emp-search-box" placeholder="Search organizations" value={search} onChange={(event) => setSearch(event.target.value)} />
        */}
        <input className="emp-search-box" placeholder="Search organizations" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        {error ? <button className="emp-download-btn" type="button" onClick={loadOrganizations}>Retry</button> : null}
      </div>

      {/* --- old: organization table skeleton column count ---
      {loading ? <TableSkeleton rows={10} columns={8} /> : (
      */}
      {loading ? <TableSkeleton rows={10} columns={9} /> : (
        <div className="emp-table-container">
          <table className="emp-table super-admin-table--compact">
            {/* --- old: organization table header without a scoped actions column ---
            <thead><tr><th>Org ID</th><th>Organization Name</th><th>Code</th><th>Contact Person</th><th>Email</th><th>City/Country</th><th>Status</th><th>Actions</th></tr></thead>
            */}
            {/* --- old: organization table columns ---
            <thead><tr><th>Org ID</th><th>Organization Name</th><th>Code</th><th>Contact Person</th><th>Email</th><th>City/Country</th><th>Status</th><th className="emp-action-col">Actions</th></tr></thead>
            */}
            <thead><tr><th>Organization</th><th>Code</th><th>Contact Person</th><th>Email</th><th>Location</th><th>Admins</th><th>Employees</th><th>Status</th><th className="emp-action-col">Actions</th></tr></thead>
            <tbody>
              {pagedOrganizations.length === 0 ? (
                <tr><td colSpan={9} className="super-admin-empty">No Records Found</td></tr>
              ) : pagedOrganizations.map((organization) => (
                <tr className="organization-table-row" key={organization.organizationId || organization.organizationCode} onClick={() => openOrganizationDetails(organization)}>
                  <td><span className="organization-name-cell"><FaBuilding />{displayValue(organization.organizationName)}</span></td>
                  <td>{displayValue(organization.organizationCode)}</td>
                  <td>{displayValue(organization.contactPerson)}</td>
                  <td>{displayValue(organization.email)}</td>
                  <td>{[organization.city, organization.state].filter(Boolean).join(", ") || "-"}</td>
                  <td>{displayValue(organization.adminCount, "0")}</td>
                  <td>{displayValue(organization.employeeCount, "0")}</td>
                  <td><span className={`super-admin-badge ${statusClass(organization.status)}`}>{organization.status}</span></td>
                  {/* --- old: empty organization action cell ---
                  <td className="emp-action-col">-</td>
                  */}
                  {/* --- old: organization actions cell with shared button styles and icons ---
                  <td className="emp-action-col">
                    <button
                      className="emp-action-btn emp-action-btn--edit"
                      type="button"
                      disabled={statusUpdating === String(organization.organizationId) || deletingOrganizationId === String(organization.organizationId)}
                      onClick={() => handleStatusUpdate(organization)}
                    >
                      {statusUpdating === String(organization.organizationId)
                        ? "Updating..."
                        : organization.status === "Active"
                          ? "Set Inactive"
                          : "Set Active"}
                    </button>
                    <button
                      className="emp-action-btn emp-action-btn--edit"
                      type="button"
                      disabled={deletingOrganizationId === String(organization.organizationId)}
                      onClick={() => handleEdit(organization)}
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      className="emp-action-btn emp-action-btn--delete"
                      type="button"
                      disabled={deletingOrganizationId === String(organization.organizationId)}
                      onClick={() => handleDelete(organization)}
                    >
                      <FaTrash /> {deletingOrganizationId === String(organization.organizationId) ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                  */}
                  {/* --- old: kebab button and dropdown action menu ---
                  <td className="emp-action-col" onClick={(event) => event.stopPropagation()}>
                    <div className="org-action-cell">
                      <button className="org-actions-trigger" type="button" aria-label={`Actions for ${organization.organizationName}`} onClick={() => setOpenActionMenuId((current) => current === String(organization.organizationId) ? "" : String(organization.organizationId))}><FaEllipsisV /></button>
                      {openActionMenuId === String(organization.organizationId) && <div className="org-actions-menu">
                        <button type="button" onClick={() => { setOpenActionMenuId(""); handleStatusUpdate(organization); }}>{organization.status === "Active" ? "Set Inactive" : "Set Active"}</button>
                        <button type="button" onClick={() => { setOpenActionMenuId(""); handleEdit(organization); }}>Edit</button>
                        <button className="danger" type="button" onClick={() => { setOpenActionMenuId(""); handleDelete(organization); }}>Delete</button>
                      </div>}
                    </div>
                  </td>
                  */}
                  <td className="emp-action-col" onClick={(event) => event.stopPropagation()}>
                    <div className="org-action-cell">
                      <button
                        className={`status-btn ${organization.status === "Active" ? "active" : "inactive"}`}
                        type="button"
                        disabled={statusUpdating === String(organization.organizationId) || deletingOrganizationId === String(organization.organizationId)}
                        onClick={() => handleStatusUpdate(organization)}
                      >
                        {statusUpdating === String(organization.organizationId)
                          ? "Updating..."
                          : organization.status === "Active"
                            ? "Set Inactive"
                            : "Set Active"}
                      </button>
                      <button
                        className="edit-btn"
                        type="button"
                        disabled={deletingOrganizationId === String(organization.organizationId)}
                        onClick={() => handleEdit(organization)}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-btn"
                        type="button"
                        disabled={deletingOrganizationId === String(organization.organizationId)}
                        onClick={() => handleDelete(organization)}
                      >
                        {deletingOrganizationId === String(organization.organizationId) ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- old: pagination based on client-side filtered records ---
      <AppPagination totalItems={visibleOrganizations.length} currentPage={page} pageSize={ROWS_PER_PAGE} onPageChange={setPage} itemLabel="organizations" />
      */}
      <AppPagination totalItems={totalOrganizations} currentPage={page} pageSize={ROWS_PER_PAGE} onPageChange={setPage} itemLabel="organizations" />

      {selectedOrganization && <div className="emp-modal-overlay organization-details-overlay" onMouseDown={closeOrganizationDetails}>
        <aside className="organization-details-drawer" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Organization details">
          <header className="organization-details-header">
            <div><p>Organization Details</p><h3>{displayValue(selectedOrganization.organizationName)}</h3><span>{displayValue(selectedOrganization.organizationCode)}</span></div>
            <button className="view-close" type="button" onClick={closeOrganizationDetails} aria-label="Close organization details"><FaTimes /></button>
          </header>
          <section className="organization-details-summary">
            <h4>Organization information</h4>
            <div className="organization-details-grid">
              {[["Organization Name", selectedOrganization.organizationName], ["Organization Code", selectedOrganization.organizationCode], ["Contact Person", selectedOrganization.contactPerson], ["Email", selectedOrganization.email], ["Phone", selectedOrganization.phoneNumber], ["Address", selectedOrganization.address], ["City", selectedOrganization.city], ["State", selectedOrganization.state], ["Country", selectedOrganization.country], ["Status", selectedOrganization.status], ["Created Date", selectedOrganization.createdDate ? new Date(selectedOrganization.createdDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{displayValue(value)}</strong></div>)}
            </div>
          </section>
          <section className="organization-administrators">
            {/* --- old: empty administrators heading with an add-admin action that could create a duplicate organization ---
            <div className="organization-administrators-heading"><h4>Administrators ({adminsLoading ? displayValue(selectedOrganization.adminCount, "0") : organizationAdmins.length})</h4>{!adminsLoading && !adminsError && organizationAdmins.length === 0 && <button className="emp-add-btn" type="button" onClick={() => { closeOrganizationDetails(); setEditingOrganizationId(null); setForm(initialForm); setShowAdminFields(true); setShowForm(true); }}>Add Admin</button>}</div>
            */}
            <div className="organization-administrators-heading"><h4>Administrators ({adminsLoading ? displayValue(selectedOrganization.adminCount, "0") : organizationAdmins.length})</h4></div>
            {adminsLoading ? <div className="organization-admin-skeletons"><div /><div /></div> : adminsError ? <div className="organization-admin-error"><p>Unable to load administrator details.</p><button className="emp-download-btn" type="button" onClick={() => loadOrganizationAdmins(selectedOrganization)}>Try Again</button></div> : organizationAdmins.length === 0 ? <p className="organization-admin-empty">No administrators added yet.</p> : <div className="organization-admin-list">{organizationAdmins.map((admin) => <article key={admin.id || admin.adminId || admin.email} className="organization-admin-card"><div><span className="organization-admin-avatar"><FaUser /></span><strong>{displayValue(admin.fullName || admin.name || admin.email)}</strong><small>{displayValue(admin.email)}</small></div><span className={`super-admin-badge ${admin.isActive ? "active" : "inactive"}`}>{admin.isActive ? "Active" : "Inactive"}</span><p>Phone: {displayValue(admin.phoneNumber || admin.phone)}</p><p>Role: {displayValue(admin.roleName || admin.role || "Organization Admin")}</p><p>Created: {admin.createdDate ? new Date(admin.createdDate).toLocaleDateString() : "-"}</p>{admin.lastLogin && <p>Last login: {new Date(admin.lastLogin).toLocaleString()}</p>}</article>)}</div>}
          </section>
        </aside>
      </div>}

      {showForm && (
        <div className="emp-modal-overlay">
          {/* --- old: organization form wrapper without layout class ---
          <form className="emp-modal-box super-admin-form" onSubmit={handleSubmit}>
          */}
          <form className="emp-modal-box super-admin-form organization-form" onSubmit={handleSubmit}>
            {/* --- old: plain modal header and flat organization field grid ---
            <div className="super-admin-modal-title"><h3>Add Organization</h3><button className="view-close" type="button" onClick={closeForm}><FaTimes /></button></div>
            <div className="super-admin-form-grid super-admin-organization-form-grid">
              <label>Organization Name<input name="organizationName" value={form.organizationName} onChange={handleChange} required /></label>
              <label>Organization Code<input name="organizationCode" value={form.organizationCode} onChange={handleChange} required /></label>
              <label>Contact Person<input name="contactPerson" value={form.contactPerson} onChange={handleChange} required /></label>
              <label>Email<input name="email" type="email" value={form.email} onChange={handleChange} required /></label>
              <label>Phone Number<input name="phoneNumber" type="tel" value={form.phoneNumber} onChange={handleChange} /></label>
              <label>Status<select name="status" value={form.status} onChange={handleChange}><option>Active</option><option>Inactive</option></select></label>
              <label className="field-full">Address<input name="address" value={form.address} onChange={handleChange} /></label>
              <label>City<input name="city" value={form.city} onChange={handleChange} /></label>
              <label>State<input name="state" value={form.state} onChange={handleChange} /></label>
              <label>Country<input name="country" value={form.country} onChange={handleChange} /></label>
              <div className="admin-toggle-row"><button className="emp-action-btn emp-action-btn--edit" type="button" onClick={() => setShowAdminFields((visible) => !visible)}>+ Add Admin</button></div>
              {showAdminFields && <div className="admin-fields-grid">
                <label>Admin Email<input name="adminEmail" type="email" value={form.adminEmail} onChange={handleChange} required /></label>
                <label>Admin Password<input name="adminPassword" type="password" value={form.adminPassword} onChange={handleChange} required /></label>
              </div>}
            </div>
            */}
            <div className="org-modal-header">
              <span className="org-modal-header__icon"><FaBuilding /></span>
              <div><h3>{editingOrganizationId !== null ? "Edit Organization" : "Create Organization"}</h3><p>{editingOrganizationId !== null ? "Update organization contact and address information" : "Add organization contact and address information"}</p></div>
              <button className="view-close" type="button" onClick={closeForm} aria-label="Close"><FaTimes /></button>
            </div>
            {/* --- old: Postal Code backend schema confirmation ---
            Confirm with the backend whether postalCode should be added to POST /SuperAdmin/organizations, or dropped if the API does not accept it.
            */}
            {/* Postal Code is intentionally omitted because it is not in the backend schema. */}
            <div className="org-section">
              <div className="org-section-header"><FaUsers /><strong>Contact Details</strong></div>
              <div className="super-admin-form-grid">
                {/* --- old: contact fields without entry hints ---
                <label>Organization Name<div className="org-input-wrap"><FaBuilding className="org-field-icon" /><input name="organizationName" value={form.organizationName} onChange={handleChange} required /></div></label>
                <label>Organization Code<div className="org-input-wrap"><FaBuilding className="org-field-icon" /><input name="organizationCode" value={form.organizationCode} onChange={handleChange} required /></div></label>
                <label>Contact Person<div className="org-input-wrap"><FaUser className="org-field-icon" /><input name="contactPerson" value={form.contactPerson} onChange={handleChange} required /></div></label>
                <label>Email<div className="org-input-wrap"><FaEnvelope className="org-field-icon" /><input name="email" type="email" value={form.email} onChange={handleChange} required /></div></label>
                <label>Phone Number<div className="org-input-wrap"><FaPhone className="org-field-icon" /><input name="phoneNumber" type="tel" value={form.phoneNumber} onChange={handleChange} /></div></label>
                */}
                <label>Organization Name<div className="org-input-wrap"><FaBuilding className="org-field-icon" /><input name="organizationName" placeholder="Enter organization name" value={form.organizationName} onChange={handleChange} required /></div></label>
                <label>Organization Code<div className="org-input-wrap"><FaBuilding className="org-field-icon" /><input name="organizationCode" placeholder="Enter organization code" value={form.organizationCode} onChange={handleChange} required /></div></label>
                <label>Contact Person<div className="org-input-wrap"><FaUser className="org-field-icon" /><input name="contactPerson" placeholder="Enter contact person" value={form.contactPerson} onChange={handleChange} required /></div></label>
                <label>Email<div className="org-input-wrap"><FaEnvelope className="org-field-icon" /><input name="email" type="email" placeholder="name@company.com" value={form.email} onChange={handleChange} required /></div></label>
                <label>Phone Number<div className="org-input-wrap"><FaPhone className="org-field-icon" /><input name="phoneNumber" type="tel" placeholder="Enter phone number" value={form.phoneNumber} onChange={handleChange} /></div></label>
                <label>Status<div className="org-input-wrap"><span className={`org-status-dot ${form.status === "Active" ? "active" : "inactive"}`} /><select name="status" value={form.status} onChange={handleChange}><option>Active</option><option>Inactive</option></select></div></label>
              </div>
            </div>
            <div className="org-section">
              <div className="org-section-header"><FaMapMarkerAlt /><strong>Address Details</strong></div>
              <div className="super-admin-form-grid">
                {/* --- old: address fields without entry hints ---
                <label className="field-full">Address<div className="org-input-wrap"><FaHome className="org-field-icon" /><input name="address" value={form.address} onChange={handleChange} /></div></label>
                <label>City<div className="org-input-wrap"><FaMapMarkerAlt className="org-field-icon" /><input name="city" value={form.city} onChange={handleChange} /></div></label>
                <label>Postal Code<div className="org-input-wrap"><FaMapMarkerAlt className="org-field-icon" /><input name="postalCode" value={form.postalCode} onChange={handleChange} inputMode="numeric" /></div></label>
                */}
                <label className="field-full">Address<div className="org-input-wrap"><FaHome className="org-field-icon" /><input name="address" placeholder="Enter full address" value={form.address} onChange={handleChange} /></div></label>
                <label>City<div className="org-input-wrap"><FaMapMarkerAlt className="org-field-icon" /><input name="city" placeholder="Enter city" value={form.city} onChange={handleChange} /></div></label>
                <label>State<div className="org-input-wrap"><FaMapMarkerAlt className="org-field-icon" /><select name="state" value={form.state} onChange={handleChange}><option value="">Select State</option><option>Andhra Pradesh</option><option>Delhi</option><option>Karnataka</option><option>Maharashtra</option><option>Tamil Nadu</option><option>Telangana</option></select></div></label>
                <label>Country<div className="org-input-wrap"><FaGlobe className="org-field-icon" /><select name="country" value={form.country} onChange={handleChange}><option>India</option><option>United States</option><option>United Kingdom</option></select></div></label>
                {/* --- old: postal code is not part of the organization backend schema ---
                <label>Postal Code<div className="org-input-wrap"><FaMapMarkerAlt className="org-field-icon" /><input name="postalCode" placeholder="Enter postal code" value={form.postalCode} onChange={handleChange} inputMode="numeric" /></div></label>
                */}
              </div>
            </div>
            {/* --- old: administrators section rendered only for new organizations ---
            {editingOrganizationId === null && <div className="org-section">
            */}
            {/* Existing saved admins are local-only in edit mode: update/delete endpoints are not confirmed, so edits or Remove do not persist and existing rows are not sent to createAdmin. Confirm the backend API before wiring those actions. */}
            <div className="org-section">
              {/* --- old: administrators section header without its Add Admin action ---
              <div className="org-section-header"><FaShieldAlt /><strong>Administrators</strong></div>
              */}
              <div className="org-section-header">
                <div className="org-section-header-title"><FaShieldAlt /><strong>Administrators</strong></div>
                <button className="org-add-admin-btn" type="button" onClick={() => setAdmins((current) => [...current, { fullName: "", phoneNumber: "", email: "", password: "" }])}><FaPlus /> Add Admin</button>
              </div>


              {admins.length === 0 && <div className="org-admins-empty"><FaUser /><span>No administrators added yet.</span></div>}

              {admins.map((admin, index) => (
                <div className="admin-block" key={`admin-${index}`}>
                  <div className="admin-fields-grid">
                    <label>Full Name<div className="org-input-wrap"><FaUser className="org-field-icon" /><input type="text" placeholder="Enter full name" value={admin.fullName} onChange={(event) => setAdmins((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, fullName: event.target.value } : entry))} /></div></label>
                    <label>Phone Number<div className="org-input-wrap"><FaPhone className="org-field-icon" /><input type="tel" placeholder="Enter phone number" value={admin.phoneNumber} onChange={(event) => setAdmins((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, phoneNumber: event.target.value } : entry))} /></div></label>
                    <label>Admin Email<div className="org-input-wrap"><FaEnvelope className="org-field-icon" /><input type="email" placeholder="admin@company.com" value={admin.email} onChange={(event) => setAdmins((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, email: event.target.value } : entry))} /></div></label>
                    <label>Admin Password<div className="org-input-wrap"><FaShieldAlt className="org-field-icon" /><input type="password" placeholder="Enter admin password" value={admin.password} onChange={(event) => setAdmins((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, password: event.target.value } : entry))} /></div></label>
                  </div>

                  <div className="admin-block-footer">
                    <button
                      className="remove-btn"
                      type="button"
                      onClick={() => {
                        const adminId = admin.adminId;

                        if (adminId) {
                          setRemovedAdminIds((current) => [
                            ...current,
                            adminId,
                          ]);
                        }

                        setAdmins((current) =>
                          current.filter((_, entryIndex) => entryIndex !== index)
                        );
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="emp-modal-btns">
              <button className="emp-close-btn" type="button" onClick={closeForm} disabled={saving}>Cancel</button>
              <button className="emp-save-btn" type="submit" disabled={saving}><FaSave />{saving ? (editingOrganizationId !== null ? "Updating..." : "Creating...") : (editingOrganizationId !== null ? "Update Organization" : "Create Organization")}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Organizations;
