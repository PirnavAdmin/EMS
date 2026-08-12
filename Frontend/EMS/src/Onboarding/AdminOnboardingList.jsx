import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../Employees/EmployeeList.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import AppPagination from "../components/AppPagination";
import TruncatedText from "../components/TruncatedText";
import { TableSkeleton } from "../components/Skeletons";
import { toastError, toastSuccess } from "../components/common/toast/toastService";
import { extractCollection } from "../utils/collections";
import { formatDate } from "../utils/date";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const getFirstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");

const getCandidateName = (candidate) =>
  String(
    getFirstValue(
      candidate.candidateName,
      candidate.fullName,
      candidate.name,
      [candidate.firstName, candidate.middleName, candidate.lastName].filter(Boolean).join(" ")
    ) || "-"
  ).trim();

const normalizeCandidate = (candidate = {}) => {
  const onboardingId = String(
    getFirstValue(
      candidate.onboardingId,
      candidate.onboarding_Id,
      candidate.onboardingID,
      candidate.id,
      "-"
    )
  ).trim();
  const joiningDate = getFirstValue(candidate.joiningDate, candidate.dateOfJoining, "");

  return {
    onboardingId,
    candidateName: getCandidateName(candidate),
    email: getFirstValue(candidate.email, candidate.emailAddress, "-"),
    phoneNumber: getFirstValue(candidate.phoneNumber, candidate.phone, candidate.mobileNumber, "-"),
    department: getFirstValue(candidate.department, candidate.dept, "-"),
    designation: getFirstValue(candidate.designation, candidate.role, "-"),
    location: getFirstValue(candidate.location, candidate.workLocation, "-"),
    joiningDateValue: joiningDate ? String(joiningDate).split("T")[0] : "",
    joiningDate: formatDate(joiningDate) || "-",
    status: getFirstValue(candidate.status, candidate.onboardingStatus, "Pending"),
  };
};

function AdminOnboardingList() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [designationFilter, setDesignationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("latest-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [candidateToDelete, setCandidateToDelete] = useState(null);

  const fetchCandidates = async () => {
    setLoading(true);

    try {
      const response = await api.get(API_ENDPOINTS.onboardingPersonalInfo.list);
      setCandidates(extractCollection(response.data).map(normalizeCandidate));
    } catch (error) {
      console.error("Onboarding candidates load error:", error);
      toastError("Unable to load onboarding candidates.");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, departmentFilter, designationFilter, statusFilter, sortBy]);

  const departmentOptions = useMemo(
    () => [...new Set(candidates.map((candidate) => candidate.department).filter((value) => value && value !== "-"))],
    [candidates]
  );

  const designationOptions = useMemo(
    () => [...new Set(candidates.map((candidate) => candidate.designation).filter((value) => value && value !== "-"))],
    [candidates]
  );

  const statusOptions = useMemo(
    () => [...new Set(candidates.map((candidate) => candidate.status).filter((value) => value && value !== "-"))],
    [candidates]
  );

  const filteredCandidates = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    const results = candidates.filter((candidate) => {
      const matchesSearch =
        !searchText ||
        [
          candidate.onboardingId,
          candidate.candidateName,
          candidate.email,
          candidate.phoneNumber,
        ].some((value) => String(value || "").toLowerCase().includes(searchText));

      const matchesDepartment =
        departmentFilter === "All" || candidate.department === departmentFilter;
      const matchesDesignation =
        !designationFilter || candidate.designation === designationFilter;
      const matchesStatus =
        statusFilter === "All" || candidate.status === statusFilter;

      return matchesSearch && matchesDepartment && matchesDesignation && matchesStatus;
    });

    return [...results].sort((a, b) => {
      if (sortBy === "oldest-asc") {
        return new Date(a.joiningDateValue || 0) - new Date(b.joiningDateValue || 0);
      }

      if (sortBy === "name-asc") {
        return a.candidateName.localeCompare(b.candidateName);
      }

      return new Date(b.joiningDateValue || 0) - new Date(a.joiningDateValue || 0);
    });
  }, [candidates, departmentFilter, designationFilter, search, sortBy, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const visibleStart = filteredCandidates.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const visibleEnd = Math.min(safeCurrentPage * pageSize, filteredCandidates.length);
  const currentCandidates = filteredCandidates.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  useEffect(() => {
    if (safeCurrentPage !== currentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  const confirmDeleteCandidate = async () => {
    if (!candidateToDelete) return;

    try {
      await api.delete(API_ENDPOINTS.onboardingPersonalInfo.delete(candidateToDelete));
      toastSuccess("Candidate deleted successfully.");
      setCandidateToDelete(null);
      await fetchCandidates();
    } catch (error) {
      console.error("Onboarding candidate delete error:", error);
      toastError(error?.response?.data?.message || "Delete failed.");
    }
  };

  const emptyStateMessage = search.trim()
    ? "No onboarding candidates match your search."
    : "No onboarding candidates found.";

  return (
    <div className="emp-page-unique">
      <div className="emp-header-unique">
        <div>
          <h2>Onboarding List</h2>
          <p>
            Showing {visibleStart}-{visibleEnd} of {filteredCandidates.length} candidates
          </p>
        </div>
      </div>

      <div className="emp-toolbar">
        <input
          className="emp-search-box"
          type="text"
          placeholder="Search by onboarding ID, name, email, or phone..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="emp-filter-group">
          <select
            className="emp-filter-select"
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          >
            <option value="All">All Departments</option>
            {departmentOptions.map((department) => (
              <option key={department} value={department}>{department}</option>
            ))}
          </select>

          <select
            className="emp-filter-select"
            value={designationFilter}
            onChange={(event) => setDesignationFilter(event.target.value)}
            disabled={designationOptions.length === 0}
          >
            <option value="">All Designations</option>
            {designationOptions.map((designation) => (
              <option key={designation} value={designation}>{designation}</option>
            ))}
          </select>

          <select
            className="emp-filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select
            className="emp-filter-select"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="latest-desc">Sort: New Joining Date</option>
            <option value="oldest-asc">Sort: Old Joining Date</option>
            <option value="name-asc">Sort: Name</option>
          </select>
        </div>
      </div>

      <div className="emp-table-wrapper">
        <div className="emp-scroll-hint">
          Scroll horizontally to view more onboarding candidate details
        </div>

        <div className="emp-table-container">
          {loading ? (
            <TableSkeleton rows={8} columns={10} />
          ) : (
            <table className="emp-table">
              <colgroup>
                <col style={{ width: "150px" }} />
                <col style={{ width: "240px" }} />
                <col style={{ width: "280px" }} />
                <col style={{ width: "160px" }} />
                <col style={{ width: "150px" }} />
                <col style={{ width: "170px" }} />
                <col style={{ width: "150px" }} />
                <col style={{ width: "150px" }} />
                <col style={{ width: "130px" }} />
                <col style={{ width: "165px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className="emp-col-center">Onboarding ID</th>
                  <th scope="col" className="emp-name-col">Candidate Name</th>
                  <th scope="col" className="emp-email-col emp-col-center">Email</th>
                  <th scope="col" className="emp-col-center">Phone Number</th>
                  <th scope="col" className="emp-dept-col emp-col-center">Department</th>
                  <th scope="col" className="emp-role-col emp-col-center">Designation</th>
                  <th scope="col" className="emp-col-center">Location</th>
                  <th scope="col" className="emp-joined-col emp-col-center">Joining Date</th>
                  <th scope="col" className="emp-status-col emp-col-center">Status</th>
                  <th scope="col" className="emp-action-col emp-col-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentCandidates.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="emp-empty-state app-table-empty-cell">
                      {emptyStateMessage}
                    </td>
                  </tr>
                ) : (
                  currentCandidates.map((candidate) => (
                    <tr
                      key={candidate.onboardingId}
                      className="emp-row-click"
                      onClick={() => navigate(`/admin/onboarding/${candidate.onboardingId}`)}
                    >
                      <td className="emp-cell emp-cell--center emp-cell--truncate">
                        <TruncatedText as="div" className="emp-id-code" value={candidate.onboardingId} />
                      </td>
                      <td className="emp-name-col emp-cell emp-cell--truncate">
                        <TruncatedText as="div" className="emp-name" value={candidate.candidateName}>
                          {candidate.candidateName}
                        </TruncatedText>
                      </td>
                      <td className="emp-email-col emp-cell emp-cell--center emp-cell--truncate">
                        <TruncatedText className="emp-cell-truncate" value={candidate.email} />
                      </td>
                      <td className="emp-cell emp-cell--center emp-cell--truncate">{candidate.phoneNumber}</td>
                      <td className="emp-dept-col emp-cell emp-cell--center emp-cell--truncate">{candidate.department}</td>
                      <td className="emp-role-col emp-cell emp-cell--center emp-cell--truncate">{candidate.designation}</td>
                      <td className="emp-cell emp-cell--center emp-cell--truncate">{candidate.location}</td>
                      <td className="emp-joined-col emp-cell emp-cell--center emp-cell--truncate">{candidate.joiningDate}</td>
                      <td className="emp-status-col emp-cell emp-cell--center emp-cell--truncate">{candidate.status}</td>
                      <td className="emp-action-col">
                        <div className="emp-action-buttons">
                          <button
                            className="app-action-button emp-action-btn emp-action-btn--edit"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/admin/onboarding/${candidate.onboardingId}`, {
                                state: { edit: true },
                              });
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="app-action-button emp-action-btn emp-action-btn--delete"
                            onClick={(event) => {
                              event.stopPropagation();
                              setCandidateToDelete(candidate.onboardingId);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <AppPagination
          totalItems={filteredCandidates.length}
          currentPage={safeCurrentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          itemLabel="candidates"
        />
      </div>

      {candidateToDelete && (
        <div className="emp-delete-overlay">
          <div className="emp-delete-modal">
            <h3>Delete Candidate</h3>
            <p style={{ marginBottom: "35px" }}>
              Are you sure you want to delete this onboarding candidate?
            </p>
            <div className="emp-delete-actions">
              <button
                className="emp-delete-cancel-btn"
                onClick={() => setCandidateToDelete(null)}
              >
                Cancel
              </button>
              <button className="emp-delete-btn" onClick={confirmDeleteCandidate}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminOnboardingList;
