import React, { useEffect, useMemo, useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { getAvailableTeamEmployees } from "../services/teamService";
import { normalizeCollection, normalizeEmployeeRecord } from "./teamUtils";

const getEmployeeId = (employee) =>
  String(employee?.employeeId ?? employee?.employee_Id ?? employee?.id ?? "").trim();

function AddMembersModal({
  open,
  team,
  onClose,
  onSave,
  saving = false
}) {
  const [search, setSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const controller = new AbortController();
    setSearch("");
    setSelectedMembers([]);

    const fetchEmployees = async () => {
      try {
        const res = await getAvailableTeamEmployees({
          signal: controller.signal,
          cacheTTL: 60 * 1000
        });

        if (controller.signal.aborted) {
          return;
        }

        const data = normalizeCollection(res.data).map((employee) =>
          normalizeEmployeeRecord(employee)
        );

        setEmployees(data.filter(Boolean));
      } catch (error) {
        if (error?.code === "ERR_CANCELED") {
          return;
        }

        setEmployees([]);
      }
    };

    fetchEmployees();
    return () => controller.abort();
  }, [open]);

  const availableEmployees = useMemo(() => {
    if (!team) {
      return employees;
    }

    const existingIds = new Set(
      (team.members || [])
        .map((member) => getEmployeeId(member))
        .filter(Boolean)
    );

    return employees.filter((employee) => !existingIds.has(getEmployeeId(employee)));
  }, [employees, team]);

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return availableEmployees.filter((employee) => {
      const id = String(getEmployeeId(employee)).toLowerCase();
      const name = String(
        employee.employeeName || employee.name || employee.fullName || ""
      ).toLowerCase();

      return name.includes(keyword) || id.includes(keyword);
    });
  }, [availableEmployees, search]);

  const selectedEmployees = useMemo(() => {
    return availableEmployees.filter((employee) =>
      selectedMembers.includes(getEmployeeId(employee))
    );
  }, [availableEmployees, selectedMembers]);

  const toggleEmployee = (employeeId) => {
    setSelectedMembers((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    );
  };

  if (!open) {
    return null;
  }

  return (
    <div className="team-modal-overlay">
      <div className="team-modal">
        <div className="team-modal-header">
          <div>
            <h3>Add Members</h3>
            <p>Select employees to add into this team.</p>
          </div>

          <button
            type="button"
            className="team-modal-close"
            onClick={onClose}
          >
            <FaTimes />
          </button>
        </div>

        <div className="team-modal-body">
          {selectedMembers.length > 0 ? (
            <div className="team-selected-count">
              {selectedMembers.length} member
              {selectedMembers.length > 1 ? "s" : ""} selected
            </div>
          ) : null}

          <div className="team-search-box">
            <FaSearch />

            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="team-member-selection">
            {filteredEmployees.length === 0 ? (
              <p className="team-empty-text">No employees found.</p>
            ) : (
              filteredEmployees.map((employee) => {
                const id = getEmployeeId(employee);
                const name =
                  employee.employeeName ||
                  employee.name ||
                  employee.fullName ||
                  "Unknown Employee";
                const designation =
                  employee.designation || employee.role || employee.designationName || "";

                return (
                  <label
                    key={`employee-${id}`}
                    className="team-member-checkbox"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(id)}
                      onChange={() => toggleEmployee(id)}
                    />

                    <div>
                      <strong>{name}</strong>

                      <span>Employee ID: {id}</span>

                      {designation ? <span>{designation}</span> : null}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {selectedEmployees.length > 0 ? (
          <div className="team-selected-members">
            {selectedEmployees.map((employee) => (
              <div
                key={getEmployeeId(employee)}
                className="team-selected-chip"
              >
                <span>
                  {employee.employeeName || employee.name || employee.fullName}
                </span>

                <button
                  type="button"
                  onClick={() => toggleEmployee(getEmployeeId(employee))}
                >
                  <FaTimes />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="team-modal-footer">
          <button
            type="button"
            className="team-action-btn secondary"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="team-action-btn"
            onClick={() => onSave(selectedMembers)}
            disabled={saving}
          >
            {saving ? "Adding..." : "Add Members"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddMembersModal;
