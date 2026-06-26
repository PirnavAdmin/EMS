import React, { useEffect, useMemo, useState } from "react";
import "./Clients.css";
import {
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaEllipsisV,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { extractCollection } from "../utils/collections";
import { formatDate } from "../utils/date";

const EMPTY_CLIENT_FORM = {
  client_Name: "",
  description: "",
  location: "",
  phone: "",
  email: "",
  active_Projects: 0,
};

const getTextOrFallback = (value, fallback = "-") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const getClientInitials = (name) => {
  const normalized = String(name ?? "").trim();
  return normalized ? normalized.slice(0, 2).toUpperCase() : "CL";
};

function Clients() {
  const [showModal, setShowModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [menuOpenIndex, setMenuOpenIndex] = useState(null);
  const [isUpdate, setIsUpdate] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [saving, setSaving] = useState(false);

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectCounts, setProjectCounts] = useState({});
  const [errors, setErrors] = useState({});

  const [newClient, setNewClient] = useState(EMPTY_CLIENT_FORM);
  const [currentPage, setCurrentPage] = useState(1);
  const [clientsPerPage, setClientsPerPage] = useState(30);

  const loadClients = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.masters.clients.list);
      setClients(extractCollection(res.data));
    } catch (err) {
      console.error("Fetch Error:", err);
      toast.error("Failed to load clients.");
    }
  };

  const loadProjectCounts = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.company.projects.list);
      const allProjects = extractCollection(res.data);

      const counts = {};
      allProjects.forEach((project) => {
        if (!counts[project.client]) counts[project.client] = 0;
        counts[project.client] += 1;
      });

      setProjectCounts(counts);
    } catch (err) {
      console.error("Project Count Error:", err);
      toast.error("Failed to load client project counts.");
    }
  };

  useEffect(() => {
    loadClients();
    loadProjectCounts();
  }, []);

  useEffect(() => {
    if (menuOpenIndex === null) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (!event.target.closest(".menu-wrapper")) {
        setMenuOpenIndex(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpenIndex]);

  const validateField = (name, draft = newClient) => {
    const value = String(draft[name] ?? "").trim();

    if (name === "client_Name") {
      if (!value) {
        return "Client Name is required";
      }

      if (value.length < 2) {
        return "Client Name must be at least 2 characters";
      }

      if (value.length > 25) {
        return "Client Name cannot exceed 25 characters";
      }

      if (!/^[A-Za-z\s]+$/.test(value)) {
        return "Only alphabets are allowed";
      }

      return "";
    }

    if (name === "description") {
      if (!value) {
        return "";
      }

      if (value.length > 30) {
        return "Description cannot exceed 30 characters";
      }

      if (!/^[A-Za-z\s]+$/.test(value)) {
        return "Description allows only alphabets";
      }

      return "";
    }

    if (name === "location") {
      if (!value) {
        return "Location is required";
      }

      if (value.length > 15) {
        return "Location cannot exceed 15 characters";
      }

      if (!/^[A-Za-z\s]+$/.test(value)) {
        return "Only alphabets are allowed";
      }

      return "";
    }

    if (name === "phone") {

      if (!value) {
        return "Phone is required";
      }

      if (!/^[0-9]{10}$/.test(value)) {
        return "Phone Number must contain exactly 10 digits";
      }

      // NO SAME DIGITS 10 TIMES
      if (/^(\d)\1{9}$/.test(value)) {
        return "Phone Number cannot contain same digit repeatedly";
      }

      return "";
    }

    if (name === "email") {

      if (!value) {
        return "Email is required";
      }

      if (value.length > 40) {
        return "Email cannot exceed 40 characters";
      }

      // NO SPACES
      if (/\s/.test(value)) {
        return "Email cannot contain spaces";
      }

      // MUST START WITH LETTER
      if (!/^[A-Za-z]/.test(value)) {
        return "Email must start with an alphabet";
      }

      // ONLY ONE @
      if ((value.match(/@/g) || []).length !== 1) {
        return "Email must contain exactly one @";
      }

      // ONLY ONE .com
      if ((value.match(/\.com/g) || []).length !== 1) {
        return ".com is allowed only once";
      }

      // ALLOW ONLY gmail/yahoo/pirnav
      if (
        !/^[A-Za-z][A-Za-z0-9]*@(gmail|yahoo|pirnav)\.com$/.test(value)
      ) {
        return "Email must be like demo@gmail.com";
      }

      // NO SPECIAL CHARACTERS
      if (!/^[A-Za-z0-9@.]+$/.test(value)) {
        return "Special characters are not allowed";
      }

      return "";
    }

    return "";
  };

  const validateForm = (draft = newClient) => {
    const nextErrors = {
      client_Name: validateField("client_Name", draft),
      description: validateField("description", draft),
      location: validateField("location", draft),
      phone: validateField("phone", draft),
      email: validateField("email", draft),
    };

    const cleanedErrors = Object.fromEntries(
      Object.entries(nextErrors).filter(([, value]) => value)
    );

    setErrors(cleanedErrors);
    return Object.keys(cleanedErrors).length === 0;
  };

  const handleViewClient = async (client) => {
    setSelectedClient(client);
    setShowDrawer(true);
    setMenuOpenIndex(null);
    setProjects([]);

    try {
      const res = await api.get(API_ENDPOINTS.company.projects.list);
      const allProjects = extractCollection(res.data);
      const filteredProjects = allProjects.filter(
        (project) => project.client === client.client_Name
      );

      setProjects(filteredProjects);
    } catch (error) {
      console.error("Project fetch failed:", error);
      setProjects([]);
    }
  };

  const handleChange = (event) => {

    const { name, value } = event.target;

    let nextValue = value;

    if (name === "client_Name") {

      nextValue = value
        .replace(/[^A-Za-z\s]/g, "")
        .replace(/\s+/g, " ")
        .replace(/^\s+/g, "")
        .slice(0, 25);

    }

    if (name === "description") {

      nextValue = value
        .replace(/[^A-Za-z\s]/g, "")
        .replace(/\s+/g, " ")
        .replace(/^\s+/g, "")
        .slice(0, 30);

    }

    if (name === "location") {

      nextValue = value
        .replace(/[^A-Za-z\s]/g, "")
        .replace(/\s+/g, " ")
        .replace(/^\s+/g, "")
        .slice(0, 15);

    }

    if (name === "phone") {

      nextValue = value
        .replace(/\D/g, "")
        .slice(0, 10);

    }

    if (name === "email") {

      nextValue = value
        .toLowerCase()
        .replace(/\s/g, "")
        .slice(0, 40);

    }

    const draft = {
      ...newClient,
      [name]: nextValue,
    };

    setNewClient(draft);

    setErrors((prev) => {

      const nextErrors = {
        ...prev,
        [name]: validateField(name, draft),
      };

      return Object.fromEntries(
        Object.entries(nextErrors)
          .filter(([, error]) => error)
      );

    });

  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setIsUpdate(false);
    setEditIndex(null);
    setErrors({});
    setNewClient(EMPTY_CLIENT_FORM);
    setMenuOpenIndex(null);
  };

  const openCreateModal = () => {
    setShowModal(true);
    setIsUpdate(false);
    setEditIndex(null);
    setErrors({});
    setNewClient(EMPTY_CLIENT_FORM);
    setMenuOpenIndex(null);
  };

  const handleSaveClient = async () => {
    const trimmedClient = {
      ...newClient,
      client_Name: newClient.client_Name.trim().replace(/\s+/g, " "),
      description: newClient.description.trim().replace(/\s+/g, " "),
      location: newClient.location.trim().replace(/\s+/g, " "),
      email: newClient.email.trim(),
      phone: newClient.phone.trim(),
    };

    setNewClient(trimmedClient);

    if (!validateForm(trimmedClient)) return;

    try {
      setSaving(true);

      if (isUpdate) {
        const clientToUpdate = clients[editIndex];

        await api.put(
          API_ENDPOINTS.masters.clients.byId(
            encodeURIComponent(clientToUpdate.client_Name)
          ),
          trimmedClient,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        toast.success("Client updated successfully.");
      } else {
        await api.post(
          API_ENDPOINTS.masters.clients.list,
          {
            client_Name: trimmedClient.client_Name,
            description: trimmedClient.description,
            location: trimmedClient.location,
            phone: trimmedClient.phone,
            email: trimmedClient.email,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        toast.success("Client added successfully.");
      }

      closeModal();
      await loadClients();
      await loadProjectCounts();
    } catch (error) {
      console.error("Save Error:", error);
      toast.error(error.response?.data?.message || "Unable to save client.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (client) => {
    try {
      await api.delete(
        API_ENDPOINTS.masters.clients.byId(
          encodeURIComponent(client.client_Name)
        )
      );

      toast.success("Client deleted successfully.");
      setClients((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
      setMenuOpenIndex(null);
      await loadProjectCounts();
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error("Unable to delete client.");
    }
  };

  const handleEdit = (client) => {
    setNewClient(client);
    setEditIndex(clients.findIndex((item) => item.client_Name === client.client_Name));
    setIsUpdate(true);
    setErrors({});
    setShowModal(true);
    setMenuOpenIndex(null);
  };

  const visibleProjectItems = useMemo(
    () => (Array.isArray(projects) ? projects : []),
    [projects]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(clients.length / clientsPerPage)
  );

  const indexOfLastClient = currentPage * clientsPerPage;
  const indexOfFirstClient = indexOfLastClient - clientsPerPage;

  const visibleClients = useMemo(
    () => clients.slice(indexOfFirstClient, indexOfLastClient),
    [clients, indexOfFirstClient, indexOfLastClient]
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [clients.length, clientsPerPage]);

  return (
    <div className="clients-page">
      <ToastContainer position="top-right" autoClose={2400} />

      <div className="clients-header">
        <div className="clients-header-copy">
          <h2>Clients</h2>
          <p>Manage client relationships</p>
        </div>

        <button
          className="add-client-btn app-button-primary"
          type="button"
          onClick={openCreateModal}
        >
          + Add Client
        </button>
      </div>

      <div className="clients-grid">
        {clients.length === 0 ? (
          <div className="clients-empty-state app-empty-state">
            No clients found.
          </div>
        ) : (
          visibleClients.map((client, index) => {
            const clientName = getTextOrFallback(client.client_Name);
            const clientDescription = getTextOrFallback(
              client.description,
              "No description provided."
            );
            const clientLocation = getTextOrFallback(client.location);
            const clientPhone = getTextOrFallback(client.phone);
            const clientEmail = getTextOrFallback(client.email);

            return (
              <article className="client-card" key={client.id || index}>
                <div className="card-header">
                  <div className="avatar">{getClientInitials(client.client_Name)}</div>

                  <div className="menu-wrapper">
                    <button
                      className="menu-icon-btn"
                      type="button"
                      aria-label={`Open actions for ${clientName}`}
                      aria-haspopup="menu"
                      aria-expanded={menuOpenIndex === index}
                    onClick={() =>
                        setMenuOpenIndex(menuOpenIndex === index ? null : index)
                      }
                    >
                      <FaEllipsisV className="menu-icon" aria-hidden="true" />
                    </button>

                    {menuOpenIndex === index && (
                      <div className="menu-dropdown" role="menu">
                        <button
                        className="menu-dropdown-item"
                        type="button"
                        role="menuitem"
                        onClick={() => handleEdit(client)}
                      >
                          Edit
                        </button>
                        <button
                        className="menu-dropdown-item menu-dropdown-item--danger"
                        type="button"
                        role="menuitem"
                        onClick={() => handleDelete(client)}
                      >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="client-card-body">
                  <h3 className="client-name" title={clientName}>
                    {clientName}
                  </h3>

                  <p className="client-desc" title={clientDescription}>
                    {clientDescription}
                  </p>

                  <div className="client-info">
                    <p className="client-info-item" title={clientLocation}>
                      <FaMapMarkerAlt aria-hidden="true" />
                      <span>{clientLocation}</span>
                    </p>
                    <p className="client-info-item" title={clientPhone}>
                      <FaPhoneAlt aria-hidden="true" />
                      <span>{clientPhone}</span>
                    </p>
                    <p className="client-info-item" title={clientEmail}>
                      <FaEnvelope aria-hidden="true" />
                      <span>{clientEmail}</span>
                    </p>
                  </div>
                </div>

                <div className="card-divider"></div>

                <div className="card-footer">
                  <span className="client-project-count">
                    {projectCounts[client.client_Name] || 0} active projects
                  </span>

                  <button
                    className="view-link"
                    type="button"
                    onClick={() => handleViewClient(client)}
                  >
                    View
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {clients.length > 0 && (
        <div className="app-pagination-bar">
          <div className="app-pagination-info">
            Showing <strong>{indexOfFirstClient + 1}</strong>-<strong>{Math.min(indexOfLastClient, clients.length)}</strong> of <strong>{clients.length}</strong>
          </div>

          <div className="app-pagination-controls">
            <select
              className="app-pagination-page-size"
              value={clientsPerPage}
              onChange={(event) => setClientsPerPage(Number(event.target.value))}
            >
              {[10, 20, 30, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>

            <button
              type="button"
              className="app-pagination-button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
            >
              First
            </button>

            <button
              type="button"
              className="app-pagination-button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, pageIndex) => pageIndex + 1)
              .filter((page) => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1))
              .map((page, index, pages) => {
                const previousPage = pages[index - 1];
                const shouldShowDots = previousPage && page - previousPage > 1;

                return (
                  <React.Fragment key={page}>
                    {shouldShowDots && <span className="app-pagination-dots">...</span>}
                    <button
                      type="button"
                      className={`app-pagination-button ${currentPage === page ? "active" : ""}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              type="button"
              className="app-pagination-button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            >
              Next
            </button>

            <button
              type="button"
              className="app-pagination-button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
            >
              Last
            </button>
          </div>
        </div>
      )}

      {showDrawer && selectedClient && (
        <div
          className="client-view-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowDrawer(false);
            }
          }}
        >
          <div
            className="client-view-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="view-header">
              <div className="view-left">
                <div className="view-avatar">
                  {getClientInitials(selectedClient.client_Name)}
                </div>

                <div className="view-copy">
                  <h2 title={getTextOrFallback(selectedClient.client_Name)}>
                    {getTextOrFallback(selectedClient.client_Name)}
                  </h2>
                  <p
                    title={getTextOrFallback(
                      selectedClient.description,
                      "No description provided."
                    )}
                  >
                    {getTextOrFallback(
                      selectedClient.description,
                      "No description provided."
                    )}
                  </p>
                </div>
              </div>

              <button
                className="view-close"
                type="button"
                aria-label="Close client details"
                onClick={() => setShowDrawer(false)}
              >
                X
              </button>
            </div>

            <div className="view-contact">
              <p
                className="contact-item"
                title={getTextOrFallback(selectedClient.location)}
              >
                <FaMapMarkerAlt className="contact-icon" />
                <span>{getTextOrFallback(selectedClient.location)}</span>
              </p>
              <p
                className="contact-item"
                title={getTextOrFallback(selectedClient.phone)}
              >
                <FaPhoneAlt className="contact-icon" />
                <span>{getTextOrFallback(selectedClient.phone)}</span>
              </p>
              <p
                className="contact-item"
                title={getTextOrFallback(selectedClient.email)}
              >
                <FaEnvelope className="contact-icon" />
                <span>{getTextOrFallback(selectedClient.email)}</span>
              </p>
            </div>

            <div className="view-projects">
              <h4>PROJECTS ({visibleProjectItems.length})</h4>

              <div className="project-list">
                {visibleProjectItems.length > 0 ? (
                  visibleProjectItems.map((project, index) => (
                    <div className="project-card" key={index}>
                      <div className="project-card-copy">
                        <h5 title={getTextOrFallback(project.project_Name)}>
                          {getTextOrFallback(project.project_Name)}
                        </h5>

                        <p>
                          {project.start_Date
                            ? formatDate(project.start_Date)
                            : "-"}
                        </p>
                      </div>

                      <span className="status active">{project.status}</span>
                    </div>
                  ))
                ) : (
                  <p className="no-projects">No Projects Found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="clients-add-modal-overlay-unique">
          <div className="clients-add-modal-box-unique">
            <h3>{isUpdate ? "Update Client" : "Add Client"}</h3>

            <div className="clients-field-group">
              <label htmlFor="client-name-input">Client Name</label>
              <input
                id="client-name-input"
                className={`clients-add-input-unique ${errors.client_Name ? "has-error" : ""}`}
                type="text"
                value={newClient.client_Name}
                onChange={(event) =>
                  handleChange({
                    target: { name: "client_Name", value: event.target.value },
                  })
                }
              />
              {errors.client_Name && (
                <p className="client-form-error">{errors.client_Name}</p>
              )}
            </div>

            <div className="clients-field-group">
              <label htmlFor="client-description-input">Description</label>
              <input
                id="client-description-input"
                className={`clients-add-input-unique ${errors.description ? "has-error" : ""}`}
                type="text"
                value={newClient.description}
                onChange={(event) =>
                  handleChange({
                    target: { name: "description", value: event.target.value },
                  })
                }
              />
              {errors.description && (
                <p className="client-form-error">{errors.description}</p>
              )}
            </div>

            <div className="clients-field-group">
              <label htmlFor="client-location-input">Location</label>
              <input
                id="client-location-input"
                className={`clients-add-input-unique ${errors.location ? "has-error" : ""}`}
                type="text"
                value={newClient.location}
                onChange={(event) =>
                  handleChange({
                    target: { name: "location", value: event.target.value },
                  })
                }
              />
              {errors.location && (
                <p className="client-form-error">{errors.location}</p>
              )}
            </div>

            <div className="clients-field-group">
              <label htmlFor="client-phone-input">Phone</label>
              <input
                id="client-phone-input"
                className={`clients-add-input-unique ${errors.phone ? "has-error" : ""}`}
                type="text"
                inputMode="numeric"
                value={newClient.phone}
                onChange={(event) =>
                  handleChange({
                    target: { name: "phone", value: event.target.value },
                  })
                }
              />
              {errors.phone && (
                <p className="client-form-error">{errors.phone}</p>
              )}
            </div>

            <div className="clients-field-group">
              <label htmlFor="client-email-input">Email</label>
              <input
                id="client-email-input"
                className={`clients-add-input-unique ${errors.email ? "has-error" : ""}`}
                type="email"
                value={newClient.email}
                onChange={(event) =>
                  handleChange({
                    target: { name: "email", value: event.target.value },
                  })
                }
              />
              {errors.email && (
                <p className="client-form-error">{errors.email}</p>
              )}
            </div>

            <div className="clients-add-actions-unique">
              <button
                className="clients-add-cancel-btn-unique"
                type="button"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="clients-add-save-btn-unique"
                type="button"
                onClick={handleSaveClient}
                disabled={saving}
              >
                {saving
                  ? isUpdate
                    ? "Updating..."
                    : "Saving..."
                  : isUpdate
                    ? "Update"
                    : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clients;
