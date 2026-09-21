
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaBuilding,
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
  getAvailableAdmins,
  getApiErrorMessage,
  getOrganizationById,
  getOrganizationsPage,
  updateAdmin,
  updateOrganization,
  updateOrganizationStatus,
  assignAdminOrganization,
} from "../services/superAdminService";

const ROWS_PER_PAGE = 10;

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
  status: "Active",
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
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [editingOrganizationId, setEditingOrganizationId] = useState(null);
  const [deletingOrganizationId, setDeletingOrganizationId] = useState("");
  const [statusUpdating, setStatusUpdating] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [organizationAdmins, setOrganizationAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsError, setAdminsError] = useState("");
  
  // Assign Admin Popover States
  const [showAssignPopover, setShowAssignPopover] = useState(false);
  const [availableAdmins, setAvailableAdmins] = useState([]);
  const [availableAdminsLoading, setAvailableAdminsLoading] = useState(false);
  const [availableAdminsError, setAvailableAdminsError] = useState("");
  const [assignAdminSearch, setAssignAdminSearch] = useState("");
  const [selectedAdminIds, setSelectedAdminIds] = useState([]);
  const [assigningAdmins, setAssigningAdmins] = useState(false);
  const assignAdminPopoverRef = useRef(null);
  const assignAdminTriggerRef = useRef(null);
  const newlyAssignedAdminIdsRef = useRef(new Set());
  const organizationsRequestRef = useRef(0);
  const availableAdminsRequestRef = useRef(0);
  const openingOrganizationDetailsRef = useRef("");
  const [assignAdminPopoverPosition, setAssignAdminPopoverPosition] = useState({ top: 0, left: 0 });

  const loadOrganizations = async ({ throwOnError = false } = {}) => {
    const requestId = ++organizationsRequestRef.current;
    setLoading(true);
    setError("");

    try {
      const result = await getOrganizationsPage({ search, page, pageSize: ROWS_PER_PAGE });
      // A GET that began before a successful mutation can finish after the
      // mutation's refetch. Only the newest response may update table state.
      if (requestId === organizationsRequestRef.current) {
        setOrganizations(result.items);
        setTotalOrganizations(result.totalCount);
      }
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Unable to load organizations.");
      if (requestId === organizationsRequestRef.current) {
        setError(message);
      }
      if (throwOnError) {
        throw new Error(message, { cause: requestError });
      }
      if (requestId === organizationsRequestRef.current) {
        toastError(message);
      }
    } finally {
      if (requestId === organizationsRequestRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, [page, search]);

  const pagedOrganizations = organizations;

  const closeForm = (force = false) => {
    if (saving && !force) return;
    setShowForm(false);
    setAdmins([]);
    newlyAssignedAdminIdsRef.current.clear();
    setEditingOrganizationId(null);
    setForm(initialForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const getAdminId = (admin) => String(admin?.adminId ?? admin?.id ?? admin?.Id ?? "");
  const isUnassignedAdmin = (admin) => {
    const organizationId = admin?.organizationId ?? admin?.OrganizationId;
    return organizationId === undefined || organizationId === null || String(organizationId).trim() === "";
  };

  
  /* --- old: treated every existing organization assignment identically ---
  const isAdminAssigned = (admin) => {
    const organizationId = admin?.organizationId ?? admin?.OrganizationId;
    return (
      organizationId !== undefined &&
      organizationId !== null &&
      String(organizationId).trim() !== "" &&
      Number(organizationId) !== 0
    );
  };
  */

  /* --- old: loaded the master list but did not explicitly retain assignment
     details for enforcing the one-organization rule in the picker ---
  const loadAvailableAdmins = async () => {
    const allAdmins = await getAdmins();
    const currentAdminIds = new Set(admins.map(getAdminId).filter(Boolean));
    const filtered = (allAdmins || []).filter((admin) => !currentAdminIds.has(getAdminId(admin)));
    setAvailableAdmins(filtered);
  };
  */
  const loadAvailableAdmins = async (organizationId = editingOrganizationId) => {
    const requestId = ++availableAdminsRequestRef.current;
    setAvailableAdminsLoading(true);
    setAvailableAdminsError("");

    try {
      const allAdmins = organizationId
        ? await getAvailableAdmins(organizationId)
        : await getAdmins();
      if (requestId === availableAdminsRequestRef.current) {
        setAvailableAdmins((allAdmins || []).filter(isUnassignedAdmin));
      }
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Unable to load administrators.");
      if (requestId === availableAdminsRequestRef.current) {
        setAvailableAdmins([]);
        setAvailableAdminsError(message);
        toastError(message);
      }
    } finally {
      if (requestId === availableAdminsRequestRef.current) {
        setAvailableAdminsLoading(false);
      }
    }
  };

  const closeAssignPopover = () => {
    if (assigningAdmins) return;
    setShowAssignPopover(false);
    setAssignAdminSearch("");
    setSelectedAdminIds([]);
  };

  /**
   * Popover positioning calculation:
   * Anchors below button, automatically flips above if room below is constrained.
   */
  const updateAssignAdminPopoverPosition = () => {
    const triggerRect = assignAdminTriggerRef.current?.getBoundingClientRect();
    if (!triggerRect) return;

    const popoverWidth = Math.min(370, window.innerWidth - 32);
    const viewportPadding = 12;
    const popoverHeight = assignAdminPopoverRef.current?.offsetHeight || 380;
    
    // Check available vertical space
    const roomBelow = window.innerHeight - triggerRect.bottom;
    let top = triggerRect.bottom + 6;

    if (roomBelow < popoverHeight && triggerRect.top > popoverHeight) {
      // Flip above
      top = triggerRect.top - popoverHeight - 6;
    }

    let left = triggerRect.left;
    if (left + popoverWidth > window.innerWidth - viewportPadding) {
      left = window.innerWidth - popoverWidth - viewportPadding;
    }
    if (left < viewportPadding) left = viewportPadding;

    setAssignAdminPopoverPosition({ top, left });
  };

  const openAssignPopover = () => {
    const currentOrganizationId = editingOrganizationId;
    setShowAssignPopover(true);
    setAssignAdminSearch("");
    setSelectedAdminIds([]);
    loadAvailableAdmins(currentOrganizationId);
    setTimeout(updateAssignAdminPopoverPosition, 10);
  };

  const toggleAssignPopover = () => {
    if (showAssignPopover) closeAssignPopover();
    else openAssignPopover();
  };

  useEffect(() => {
    if (!showAssignPopover) return undefined;

    const handleOutsideClick = (event) => {
      if (
        !assignAdminPopoverRef.current?.contains(event.target) &&
        !assignAdminTriggerRef.current?.contains(event.target)
      ) {
        closeAssignPopover();
      }
    };

    updateAssignAdminPopoverPosition();
    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("resize", updateAssignAdminPopoverPosition);
    window.addEventListener("scroll", updateAssignAdminPopoverPosition, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("resize", updateAssignAdminPopoverPosition);
      window.removeEventListener("scroll", updateAssignAdminPopoverPosition, true);
    };
  }, [showAssignPopover, assigningAdmins]);

  const addAssignedAdmins = (selectedAdmins, assignmentOnly) => {
    setAdmins((current) => [
      ...current,
      ...selectedAdmins
        .filter((admin) => !current.some((existing) => getAdminId(existing) === getAdminId(admin)))
        .map((admin) => ({
        adminId: getAdminId(admin),
        fullName: admin.fullName || admin.name || "",
        phoneNumber: admin.phoneNumber || admin.phone || "",
        email: admin.email || "",
        password: "",
        assignmentOnly,
      })),
    ]);
  };

  const refreshEditedOrganizationAdmins = async () => {
    if (!editingOrganizationId) return;

    try {
      const details = await getOrganizationById(editingOrganizationId);
      if (!details.hasAdministrators) return;

      setAdmins(details.administrators.map((admin) => ({
        adminId: getAdminId(admin),
        fullName: admin.fullName || admin.name || "",
        phoneNumber: admin.phoneNumber || admin.phone || "",
        email: admin.email || "",
        password: "",
      })));
    } catch (requestError) {
      // Keep the optimistic page update when the follow-up detail request fails.
      console.warn("Unable to refresh organization administrators.", requestError);
    }
  };

  const assignSelectedAdmins = async () => {
    const selectedAdmins = availableAdmins.filter(
      (admin) => selectedAdminIds.includes(getAdminId(admin))
    );

    if (!selectedAdmins.length) {
      toastError("Select at least one unassigned administrator.");
      return;
    }

    // CREATE MODE: Stage admins locally with assignmentOnly: true
    if (editingOrganizationId === null) {
      addAssignedAdmins(selectedAdmins, true);
      setAvailableAdmins((current) =>
        current.filter((admin) => !selectedAdmins.some((selected) => getAdminId(selected) === getAdminId(admin)))
      );
      setShowAssignPopover(false);
      setSelectedAdminIds([]);

      toastSuccess(
        `${selectedAdmins.length} administrator${selectedAdmins.length === 1 ? "" : "s"} will be assigned after the organization is created.`
      );
      return;
    }

    // EDIT MODE: Immediately assign via API
    setAssigningAdmins(true);
    const assignedAdmins = [];
    const errors = [];
    for (const admin of selectedAdmins) {
      try {
        await assignAdminOrganization(getAdminId(admin), editingOrganizationId);
        assignedAdmins.push(admin);
      } catch (requestError) {
        errors.push(getApiErrorMessage(requestError, `Unable to assign ${admin.email || "administrator"}.`));
      }
    }
    setAssigningAdmins(false);

    if (assignedAdmins.length) {
      assignedAdmins.forEach((admin) => newlyAssignedAdminIdsRef.current.add(getAdminId(admin)));
      addAssignedAdmins(assignedAdmins, false);
      await refreshEditedOrganizationAdmins();
      await loadAvailableAdmins(editingOrganizationId);
      await loadOrganizations();
      toastSuccess(`${assignedAdmins.length} administrator${assignedAdmins.length === 1 ? "" : "s"} assigned successfully.`);
    }
    if (errors.length) {
      toastError(errors.join(" "));
      return;
    }
    setShowAssignPopover(false);
    setAssignAdminSearch("");
    setSelectedAdminIds([]);
  };

  const handleUnassignAdmin = async (admin, index) => {
    // If it's a staged admin or newly added form row, simply remove locally
    if (admin.assignmentOnly || !editingOrganizationId) {
      setAdmins((current) => current.filter((_, entryIndex) => entryIndex !== index));
      toastSuccess("Administrator removed from organization.");
      return;
    }

    // In Edit Mode, unassign from organization via API (organizationId: 0)
    try {
      await assignAdminOrganization(admin.adminId, 0);
      setAdmins((current) => current.filter((_, entryIndex) => entryIndex !== index));
      toastSuccess("Administrator unassigned successfully.");
    } catch (requestError) {
      toastError(getApiErrorMessage(requestError, "Unable to unassign administrator."));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const isEditing = editingOrganizationId !== null;

    const populatedAdmins = admins.filter(
      (admin) =>
        admin.fullName.trim() ||
        admin.phoneNumber.trim() ||
        admin.email.trim() ||
        admin.password
    );

    const adminsToCreate = populatedAdmins.filter((admin) => !admin.adminId);
    const hasAdminCredentials = adminsToCreate.length > 0;

    const hasIncompleteAdmin = adminsToCreate.some(
      (admin) =>
        !admin.fullName.trim() ||
        !admin.phoneNumber.trim() ||
        !admin.email.trim() ||
        !admin.password
    );

    if (hasIncompleteAdmin) {
      toastError("Enter Full Name, Phone Number, Admin Email and Admin Password for every administrator.");
      return;
    }

    setSaving(true);

    try {
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

      let createdOrganization;

      if (isEditing) {
        await updateOrganization(editingOrganizationId, organizationPayload);
      } else {
        createdOrganization = await createOrganization(organizationPayload);
      }

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

      if (!organizationId) {
        throw new Error("Organization was created, but organizationId was not returned by the API.");
      }

      // Process staged assignments and newly created admins
      for (const admin of admins) {
        if (admin.assignmentOnly && admin.adminId) {
          await assignAdminOrganization(admin.adminId, organizationId);
          continue;
        }

        // Existing administrators are editable in edit mode. The email and
        // organization relationship are retained in the existing update DTO.
        if (isEditing && admin.adminId) {
          // This admin was already assigned through assign-organization in
          // this form session. Do not send that assignment through updateAdmin.
          if (newlyAssignedAdminIdsRef.current.delete(getAdminId(admin))) {
            continue;
          }
          await updateAdmin(admin.adminId, {
            email: admin.email.trim(),
            fullName: admin.fullName.trim(),
            phoneNumber: admin.phoneNumber.trim(),
            organizationId,
            isActive: form.status === "Active",
          });
          continue;
        }

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

        if (!admin.adminId) {
          await createAdmin({
            ...adminPayload,
            password: admin.password,
          });
        }
      }

      // The list response includes derived organization values (such as admin
      // counts), so synchronize it after all organization/admin mutations have
      // succeeded and before dismissing the form.
      await loadOrganizations({ throwOnError: true });

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
    } catch (requestError) {
      toastError(
        getApiErrorMessage(
          requestError,
          isEditing ? "Unable to update organization." : "Unable to create organization and admin."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (organization) => {
    const organizationId = organization.organizationId;
    if (!organizationId) {
      toastError("Unable to edit organization.");
      return;
    }

    try {
      // The organization-detail endpoint is the authoritative source used in
      // view mode and includes its administrators on current API versions.
      const details = await getOrganizationById(organizationId);
      const organizationData = details.organizationId ? details : organization;
      const assignedAdmins = details.hasAdministrators
        ? details.administrators
        : (await getAdmins()).filter(
            (admin) => String(admin.organizationId ?? "") === String(organizationId)
          );

      setForm({
        ...initialForm,
        organizationName: organizationData.organizationName || "",
        organizationCode: organizationData.organizationCode || "",
        contactPerson: organizationData.contactPerson || "",
        email: organizationData.email || "",
        phoneNumber: organizationData.phoneNumber || "",
        address: organizationData.address || "",
        city: organizationData.city || "",
        state: organizationData.state || "",
        country: organizationData.country || initialForm.country,
        status: organizationData.status || initialForm.status,
      });
      setAdmins(assignedAdmins.map((admin) => ({
        adminId: admin.id ?? admin.adminId ?? admin.Id,
        fullName: admin.fullName || admin.name || "",
        phoneNumber: admin.phoneNumber || admin.phone || "",
        email: admin.email || "",
        password: "",
      })));
    } catch (requestError) {
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
      setAdmins([]);
      toastError(getApiErrorMessage(requestError, "Unable to load organization administrators."));
    }

    setEditingOrganizationId(organizationId);
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
      await loadOrganizations();
      toastSuccess("Organization deleted successfully.");
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
      await loadOrganizations();
      toastSuccess("Organization status updated.");
    } catch (requestError) {
      toastError(getApiErrorMessage(requestError, "Unable to update organization status."));
    } finally {
      setStatusUpdating("");
    }
  };

  /* --- old: relied on the locally filtered page helper and could be invoked
     repeatedly before React committed selectedOrganization ---
  const loadOrganizationAdmins = async (organization) => {
    const result = await getAdminsPage({ organizationId: organization.organizationId, page: 1, pageSize: 100 });
    setOrganizationAdmins(result.items || []);
  };
  const openOrganizationDetails = (organization) => {
    setSelectedOrganization(organization);
    setOrganizationAdmins([]);
    loadOrganizationAdmins(organization);
  };
  */
  const loadOrganizationAdmins = async (organization) => {
    const organizationId = String(organization?.organizationId ?? organization?.OrganizationId ?? "").trim();
    if (!organizationId) return;

    setAdminsLoading(true);
    setAdminsError("");
    try {
      const allAdmins = await getAdmins();
      const assignedAdmins = (allAdmins || []).filter((admin) => {
        const adminOrganizationId = String(
          admin.organizationId ?? admin.adminOrganizationId ?? admin.AdminOrganizationId ??
          admin.orgId ?? admin.OrgId ?? admin.raw?.organizationId ?? admin.raw?.OrganizationId ??
          admin.raw?.organization_Id ?? admin.raw?.OrganizationID ??
          admin.raw?.adminOrganizationId ?? admin.raw?.AdminOrganizationId ??
          admin.raw?.orgId ?? admin.raw?.OrgId ?? ""
        ).trim();
        return adminOrganizationId === organizationId;
      });

      if (openingOrganizationDetailsRef.current === organizationId) {
        setOrganizationAdmins(assignedAdmins);
        console.debug("[Organization details] administrator fetch completed", {
          organizationId,
          count: assignedAdmins.length,
        });
      }
    } catch (requestError) {
      if (openingOrganizationDetailsRef.current === organizationId) {
        setOrganizationAdmins([]);
        setAdminsError(getApiErrorMessage(requestError, "Unable to load administrator details."));
      }
    } finally {
      if (openingOrganizationDetailsRef.current === organizationId) {
        setAdminsLoading(false);
      }
    }
  };

  const openOrganizationDetails = async (organization) => {
    const organizationId = String(organization?.organizationId ?? organization?.OrganizationId ?? "").trim();
    if (!organizationId || openingOrganizationDetailsRef.current || selectedOrganization) return;

    openingOrganizationDetailsRef.current = organizationId;
    // Open once using the table row, then replace it with the current database
    // record as soon as its detail request completes.
    setSelectedOrganization(organization);
    setOrganizationAdmins([]);
    const [organizationDetailResult] = await Promise.allSettled([
      getOrganizationById(organizationId),
      loadOrganizationAdmins(organization),
    ]);

    if (
      organizationDetailResult.status === "fulfilled" &&
      openingOrganizationDetailsRef.current === organizationId
    ) {
      const organizationDetails = organizationDetailResult.value;
      setSelectedOrganization(organizationDetails);

      // Prefer administrators returned by the organization-detail endpoint;
      // otherwise retain the exact-ID filtered GET /Admin result above.
      if (organizationDetails.hasAdministrators) {
        setOrganizationAdmins(organizationDetails.administrators);
        console.debug("[Organization details] administrators from detail response", {
          organizationId,
          count: organizationDetails.administrators.length,
        });
      }
    }
  };

  const closeOrganizationDetails = () => {
    openingOrganizationDetailsRef.current = "";
    setSelectedOrganization(null);
    setOrganizationAdmins([]);
    setAdminsError("");
  };

  const filteredAvailableAdmins = availableAdmins.filter((admin) => {
    const query = assignAdminSearch.trim().toLowerCase();
    return (
      !query ||
      [admin.name, admin.fullName, admin.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  });

  const selectedAssignableAdminCount = selectedAdminIds.length;

  // Portal Popover
  const assignAdminPopover =
    showAssignPopover && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={assignAdminPopoverRef}
            className="assign-admin-popover assign-admin-popover--portal"
            role="dialog"
            aria-label="Assign administrators"
            style={{
              position: "fixed",
              top: `${assignAdminPopoverPosition.top}px`,
              left: `${assignAdminPopoverPosition.left}px`,
              zIndex: 99999,
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="assign-admin-popover-header">
              <strong>Assign Administrators</strong>
              <button
                type="button"
                onClick={closeAssignPopover}
                disabled={assigningAdmins}
                aria-label="Close admin picker"
              >
                <FaTimes />
              </button>
            </div>

            <input
              className="assign-admin-search"
              type="search"
              value={assignAdminSearch}
              onChange={(event) => setAssignAdminSearch(event.target.value)}
              placeholder="Filter by name or email..."
              autoFocus
            />

            <div className="assign-admin-options">
              {availableAdminsLoading ? (
                <p className="assign-admin-empty">Loading administrators...</p>
              ) : availableAdminsError ? (
                <p className="assign-admin-empty error">{availableAdminsError}</p>
              ) : filteredAvailableAdmins.length === 0 ? (
                <p className="assign-admin-empty">No administrators found.</p>
              ) : (
                filteredAvailableAdmins.map((admin) => {
                  const adminId = getAdminId(admin);
                  const isChecked = selectedAdminIds.includes(adminId);
                  const initials = (admin.name || admin.fullName || admin.email || "A")
                    .split(/\s+/)
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <label
                      className={`assign-admin-option${isChecked ? " is-selected" : ""}`}
                      key={adminId}
                    >
                      <input
                        type="checkbox"
                        disabled={assigningAdmins}
                        checked={isChecked}
                        onChange={() => {
                          if (assigningAdmins) return;
                          setSelectedAdminIds((current) =>
                            current.includes(adminId)
                              ? current.filter((id) => id !== adminId)
                              : [...current, adminId]
                          );
                        }}
                      />
                      <span className="assign-admin-avatar">{initials}</span>
                      <span className="assign-admin-copy">
                        <strong>{admin.name || admin.fullName || admin.email}</strong>
                        <small>{admin.email}</small>
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="assign-admin-popover-footer">
              <span className="assign-admin-count">{selectedAssignableAdminCount} selected</span>
              <div className="assign-admin-footer-actions">
                <button type="button" className="btn-cancel" onClick={closeAssignPopover} disabled={assigningAdmins}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="assign-admin-confirm"
                  onClick={assignSelectedAdmins}
                  disabled={selectedAssignableAdminCount === 0 || assigningAdmins}
                >
                  {assigningAdmins ? "Assigning..." : "Assign"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

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
          <button
            className="emp-add-btn"
            type="button"
            onClick={() => {
              setEditingOrganizationId(null);
              setForm(initialForm);
              setAdmins([]);
              setShowForm(true);
            }}
          >
            <FaPlus /> Add Organization
          </button>
        </div>
      </div>

      <div className="emp-toolbar">
        <input
          className="emp-search-box"
          placeholder="Search organizations"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        {error ? (
          <button className="emp-download-btn" type="button" onClick={loadOrganizations}>
            Retry
          </button>
        ) : null}
      </div>

      {loading ? (
        <TableSkeleton rows={10} columns={9} />
      ) : (
        <div className="emp-table-container">
          <table className="emp-table super-admin-table--compact">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Code</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Location</th>
                <th>Admins</th>
                <th>Employees</th>
                <th>Status</th>
                <th className="emp-action-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedOrganizations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="super-admin-empty">
                    No Records Found
                  </td>
                </tr>
              ) : (
                pagedOrganizations.map((organization) => (
                  <tr
                    className="organization-table-row"
                    key={organization.organizationId || organization.organizationCode}
                    onClick={() => void openOrganizationDetails(organization)}
                  >
                    <td>
                      <span className="organization-name-cell">
                        <FaBuilding />
                        {displayValue(organization.organizationName)}
                      </span>
                    </td>
                    <td>{displayValue(organization.organizationCode)}</td>
                    <td>{displayValue(organization.contactPerson)}</td>
                    <td>{displayValue(organization.email)}</td>
                    <td>{[organization.city, organization.state].filter(Boolean).join(", ") || "-"}</td>
                    <td>{displayValue(organization.adminCount, "0")}</td>
                    <td>{displayValue(organization.employeeCount, "0")}</td>
                    <td>
                      <span className={`super-admin-badge ${statusClass(organization.status)}`}>
                        {organization.status}
                      </span>
                    </td>
                    <td className="emp-action-col" onClick={(event) => event.stopPropagation()}>
                      <div className="org-action-cell">
                        <button
                          className={`status-btn ${organization.status === "Active" ? "active" : "inactive"}`}
                          type="button"
                          disabled={
                            statusUpdating === String(organization.organizationId) ||
                            deletingOrganizationId === String(organization.organizationId)
                          }
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
                          {deletingOrganizationId === String(organization.organizationId)
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <AppPagination
        totalItems={totalOrganizations}
        currentPage={page}
        pageSize={ROWS_PER_PAGE}
        onPageChange={setPage}
        itemLabel="organizations"
      />

      {/* Organization Details Drawer */}
      {selectedOrganization && (
        <div className="emp-modal-overlay organization-details-overlay" onMouseDown={closeOrganizationDetails}>
          <aside
            className="organization-details-drawer"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Organization details"
          >
            <header className="organization-details-header">
              <div>
                <p>Organization Details</p>
                <h3>{displayValue(selectedOrganization.organizationName)}</h3>
                <span>{displayValue(selectedOrganization.organizationCode)}</span>
              </div>
              <button
                className="view-close"
                type="button"
                onClick={closeOrganizationDetails}
                aria-label="Close organization details"
              >
                <FaTimes />
              </button>
            </header>
            <section className="organization-details-summary">
              <h4>Organization information</h4>
              <div className="organization-details-grid">
                {[
                  ["Organization Name", selectedOrganization.organizationName],
                  ["Organization Code", selectedOrganization.organizationCode],
                  ["Contact Person", selectedOrganization.contactPerson],
                  ["Email", selectedOrganization.email],
                  ["Phone", selectedOrganization.phoneNumber],
                  ["Address", selectedOrganization.address],
                  ["City", selectedOrganization.city],
                  ["State", selectedOrganization.state],
                  ["Country", selectedOrganization.country],
                  ["Status", selectedOrganization.status],
                  [
                    "Created Date",
                    selectedOrganization.createdDate
                      ? new Date(selectedOrganization.createdDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-",
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{displayValue(value)}</strong>
                  </div>
                ))}
              </div>
            </section>
            <section className="organization-administrators">
              <div className="organization-administrators-heading">
                <h4>
                  Administrators (
                  {organizationAdmins.length})
                </h4>
              </div>
              {adminsLoading ? (
                <div className="organization-admin-skeletons">
                  <div />
                  <div />
                </div>
              ) : adminsError ? (
                <div className="organization-admin-error">
                  <p>Unable to load administrator details.</p>
                  <button
                    className="emp-download-btn"
                    type="button"
                    onClick={() => loadOrganizationAdmins(selectedOrganization)}
                  >
                    Try Again
                  </button>
                </div>
              ) : organizationAdmins.length === 0 ? (
                <p className="organization-admin-empty">No administrators added yet.</p>
              ) : (
                <div className="organization-admin-list">
                  {organizationAdmins.map((admin) => (
                    <article key={admin.id || admin.adminId || admin.email} className="organization-admin-card">
                      <div>
                        <span className="organization-admin-avatar">
                          <FaUser />
                        </span>
                        <strong>{displayValue(admin.fullName || admin.name || admin.email)}</strong>
                        <small>{displayValue(admin.email)}</small>
                      </div>
                      <span className={`super-admin-badge ${admin.isActive ? "active" : "inactive"}`}>
                        {admin.isActive ? "Active" : "Inactive"}
                      </span>
                      <p>Phone: {displayValue(admin.phoneNumber || admin.phone)}</p>
                      <p>Role: {displayValue(admin.roleName || admin.role || "Organization Admin")}</p>
                      <p>
                        Created: {admin.createdDate ? new Date(admin.createdDate).toLocaleDateString() : "-"}
                      </p>
                      {admin.lastLogin && <p>Last login: {new Date(admin.lastLogin).toLocaleString()}</p>}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      )}

      {/* Create / Edit Organization Modal */}
      {showForm && (
        <div className="emp-modal-overlay">
          <form className="emp-modal-box super-admin-form organization-form" onSubmit={handleSubmit}>
            <div className="org-modal-header">
              <span className="org-modal-header__icon">
                <FaBuilding />
              </span>
              <div>
                <h3>{editingOrganizationId !== null ? "Edit Organization" : "Create Organization"}</h3>
                <p>
                  {editingOrganizationId !== null
                    ? "Update organization contact and address information"
                    : "Add organization contact and address information"}
                </p>
              </div>
              <button className="view-close" type="button" onClick={closeForm} aria-label="Close">
                <FaTimes />
              </button>
            </div>

            {/* Contact Details */}
            <div className="org-section">
              <div className="org-section-header">
                <FaUsers />
                <strong>Contact Details</strong>
              </div>
              <div className="super-admin-form-grid">
                <label>
                  Organization Name
                  <div className="org-input-wrap">
                    <FaBuilding className="org-field-icon" />
                    <input
                      name="organizationName"
                      placeholder="Enter organization name"
                      value={form.organizationName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </label>
                <label>
                  Organization Code
                  <div className="org-input-wrap">
                    <FaBuilding className="org-field-icon" />
                    <input
                      name="organizationCode"
                      placeholder="Enter organization code"
                      value={form.organizationCode}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </label>
                <label>
                  Contact Person
                  <div className="org-input-wrap">
                    <FaUser className="org-field-icon" />
                    <input
                      name="contactPerson"
                      placeholder="Enter contact person"
                      value={form.contactPerson}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </label>
                <label>
                  Email
                  <div className="org-input-wrap">
                    <FaEnvelope className="org-field-icon" />
                    <input
                      name="email"
                      type="email"
                      placeholder="name@company.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </label>
                <label>
                  Phone Number
                  <div className="org-input-wrap">
                    <FaPhone className="org-field-icon" />
                    <input
                      name="phoneNumber"
                      type="tel"
                      placeholder="Enter phone number"
                      value={form.phoneNumber}
                      onChange={handleChange}
                    />
                  </div>
                </label>
                <label>
                  Status
                  <div className="org-input-wrap">
                    <span className={`org-status-dot ${form.status === "Active" ? "active" : "inactive"}`} />
                    <select name="status" value={form.status} onChange={handleChange}>
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </div>
                </label>
              </div>
            </div>

            {/* Address Details */}
            <div className="org-section">
              <div className="org-section-header">
                <FaMapMarkerAlt />
                <strong>Address Details</strong>
              </div>
              <div className="super-admin-form-grid">
                <label className="field-full">
                  Address
                  <div className="org-input-wrap">
                    <FaHome className="org-field-icon" />
                    <input
                      name="address"
                      placeholder="Enter full address"
                      value={form.address}
                      onChange={handleChange}
                    />
                  </div>
                </label>
                <label>
                  City
                  <div className="org-input-wrap">
                    <FaMapMarkerAlt className="org-field-icon" />
                    <input
                      name="city"
                      placeholder="Enter city"
                      value={form.city}
                      onChange={handleChange}
                    />
                  </div>
                </label>
                <label>
                  State
                  <div className="org-input-wrap">
                    <FaMapMarkerAlt className="org-field-icon" />
                    <select name="state" value={form.state} onChange={handleChange}>
                      <option value="">Select State</option>
                      <option>Andhra Pradesh</option>
                      <option>Delhi</option>
                      <option>Karnataka</option>
                      <option>Maharashtra</option>
                      <option>Tamil Nadu</option>
                      <option>Telangana</option>
                    </select>
                  </div>
                </label>
                <label>
                  Country
                  <div className="org-input-wrap">
                    <FaGlobe className="org-field-icon" />
                    <select name="country" value={form.country} onChange={handleChange}>
                      <option>India</option>
                      <option>United States</option>
                      <option>United Kingdom</option>
                    </select>
                  </div>
                </label>
              </div>
            </div>

            {/* Administrators Section */}
            <div className="org-section">
              <div className="org-section-header org-section-header--administrators">
                <div className="org-section-header-title">
                  <FaShieldAlt />
                  <strong>Administrators</strong>
                </div>
                {/* Dual Buttons: Assign Admin on LEFT, Add Admin on RIGHT */}
                <div className="org-admin-actions">
                  <button
                    ref={assignAdminTriggerRef}
                    className="org-admin-action-btn"
                    type="button"
                    onClick={toggleAssignPopover}
                  >
                    <FaUsers /> Assign admin
                  </button>
                  <button
                    className="org-admin-action-btn"
                    type="button"
                    onClick={() =>
                      setAdmins((current) => [
                        ...current,
                        { fullName: "", phoneNumber: "", email: "", password: "" },
                      ])
                    }
                  >
                    <FaPlus /> Add Admin
                  </button>
                </div>
              </div>

              {admins.length === 0 && (
                <div className="org-admins-empty">
                  <FaUser />
                  <span>No administrators added yet. Use "Assign admin" to select existing users or "Add Admin" to create one.</span>
                </div>
              )}

              {admins.map((admin, index) =>
                admin.adminId && editingOrganizationId !== null ? (
                  <article className="admin-block organization-admin-edit-card" key={`admin-${admin.adminId}`}>
                    <div className="admin-fields-grid">
                      <label>
                        Full Name
                        <div className="org-input-wrap">
                          <FaUser className="org-field-icon" />
                          <input
                            type="text"
                            value={admin.fullName}
                            onChange={(event) => setAdmins((current) => current.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, fullName: event.target.value } : entry
                            ))}
                            required
                          />
                        </div>
                      </label>
                      <label>
                        Phone Number
                        <div className="org-input-wrap">
                          <FaPhone className="org-field-icon" />
                          <input
                            type="tel"
                            value={admin.phoneNumber}
                            onChange={(event) => setAdmins((current) => current.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, phoneNumber: event.target.value } : entry
                            ))}
                          />
                        </div>
                      </label>
                      <label className="field-full">
                        Email
                        <div className="org-input-wrap">
                          <FaEnvelope className="org-field-icon" />
                          <input type="email" value={admin.email} readOnly aria-readonly="true" />
                        </div>
                      </label>
                    </div>
                    <div className="admin-block-footer">
                      <button className="remove-btn" type="button" onClick={() => handleUnassignAdmin(admin, index)}>
                        Remove
                      </button>
                    </div>
                  </article>
                ) : admin.adminId ? (
                  <div className="assigned-admin-chip" key={`admin-${admin.adminId}`}>
                    <span className="assigned-admin-chip-avatar">{(admin.fullName || admin.email || "A").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
                    <div className="assigned-admin-chip-info"><strong>{admin.fullName || admin.email}</strong><small>{admin.email}</small></div>
                    <button type="button" className="assigned-admin-unassign-btn" aria-label={`Remove ${admin.fullName || admin.email}`} onClick={() => handleUnassignAdmin(admin, index)} title="Remove administrator"><FaTimes /></button>
                  </div>
                ) : (
                  <div className="admin-block" key={`admin-${index}`}>
                    <div className="admin-fields-grid">
                      <label>
                        Full Name
                        <div className="org-input-wrap">
                          <FaUser className="org-field-icon" />
                          <input
                            type="text"
                            placeholder="Enter full name"
                            value={admin.fullName}
                            onChange={(event) =>
                              setAdmins((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, fullName: event.target.value } : entry
                                )
                              )
                            }
                          />
                        </div>
                      </label>
                      <label>
                        Phone Number
                        <div className="org-input-wrap">
                          <FaPhone className="org-field-icon" />
                          <input
                            type="tel"
                            placeholder="Enter phone number"
                            value={admin.phoneNumber}
                            onChange={(event) =>
                              setAdmins((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, phoneNumber: event.target.value } : entry
                                )
                              )
                            }
                          />
                        </div>
                      </label>
                      <label>
                        Admin Email
                        <div className="org-input-wrap">
                          <FaEnvelope className="org-field-icon" />
                          <input
                            type="email"
                            placeholder="admin@company.com"
                            value={admin.email}
                            onChange={(event) =>
                              setAdmins((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, email: event.target.value } : entry
                                )
                              )
                            }
                          />
                        </div>
                      </label>
                      <label>
                        Admin Password
                        <div className="org-input-wrap">
                          <FaShieldAlt className="org-field-icon" />
                          <input
                            type="password"
                            placeholder="Enter admin password"
                            value={admin.password}
                            onChange={(event) =>
                              setAdmins((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, password: event.target.value } : entry
                                )
                              )
                            }
                          />
                        </div>
                      </label>
                    </div>

                    <div className="admin-block-footer">
                      <button
                        className="remove-btn"
                        type="button"
                        onClick={() => setAdmins((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="emp-modal-btns">
              <button className="emp-close-btn" type="button" onClick={closeForm} disabled={saving}>
                Cancel
              </button>
              <button className="emp-save-btn" type="submit" disabled={saving}>
                <FaSave />
                {saving
                  ? editingOrganizationId !== null
                    ? "Updating..."
                    : "Creating..."
                  : editingOrganizationId !== null
                  ? "Update Organization"
                  : "Create Organization"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rendered Popover via Portal */}
      {assignAdminPopover}
    </div>
  );
}

export default Organizations;
