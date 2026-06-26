import React, { useEffect, useMemo, useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

function AddMembersModal({
    open,
    team,
    onClose,
    onSave,
}) {
    const [search, setSearch] = useState("");
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [employees, setEmployees] = useState([]);

    const getToken = () =>
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");

    const getEmployeeId = (employee) =>
        employee?.employee_Id ??
        employee?.employeeId ??
        employee?.id;

    useEffect(() => {
        if (!open) return;

        setSearch("");
        setSelectedMembers([]);

        const fetchEmployees = async () => {
            try {
                const res = await api.get(
                    API_ENDPOINTS.team.availableEmployees,
                    {
                        headers: {
                            Authorization: `Bearer ${getToken()}`
                        }
                    }
                );

                const data =
                    res.data?.data ||
                    res.data?.list ||
                    res.data ||
                    [];

                setEmployees(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error(err);
                setEmployees([]);
            }
        };

        fetchEmployees();
    }, [open]);

    const availableEmployees = useMemo(() => {
        if (!team) return employees;

        const existingIds = new Set(
            (team.members || []).map((member) =>
                member.employee_Id ??
                member.employeeId ??
                member.id
            )
        );

        return employees.filter((employee) => {
            const id =
                employee.employee_Id ??
                employee.employeeId ??
                employee.id;
            return id != null && !existingIds.has(id);
        });
    }, [employees, team]);

    const filteredEmployees = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return availableEmployees.filter((employee) => {
            const id = String(getEmployeeId(employee) ?? "").toLowerCase();

            const name = String(
                employee.employeeName ||
                employee.name ||
                employee.fullName ||
                ""
            ).toLowerCase();

            return (
                name.includes(keyword) ||
                id.includes(keyword)
            );
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

    if (!open) return null;

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

                    {selectedMembers.length > 0 && (
                        <div className="team-selected-count">
                            {selectedMembers.length} member
                            {selectedMembers.length > 1 ? "s" : ""} selected
                        </div>
                    )}

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
                            <p className="team-empty-text">
                                No employees found.
                            </p>
                        ) : (
                            filteredEmployees.map((employee) => {
                                const id = getEmployeeId(employee);

                                const name =
                                    employee.employeeName ||
                                    employee.name ||
                                    employee.fullName ||
                                    "Unknown Employee";

                                const designation =
                                    employee.designation ||
                                    employee.role ||
                                    employee.designationName ||
                                    "";

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

                                            <span>
                                                Employee ID: {
                                                    employee.employee_Id ||
                                                    employee.employeeId ||
                                                    employee.id
                                                }
                                            </span>

                                            {designation && (
                                                <span>{designation}</span>
                                            )}
                                        </div>
                                    </label>
                                );
                            })
                        )}

                    </div>

                </div>

                {selectedEmployees.length > 0 && (
                    <div className="team-selected-members">

                        {selectedEmployees.map((employee) => (
                            <div
                                key={getEmployeeId(employee)}
                                className="team-selected-chip"
                            >
                                <span>
                                    {employee.employeeName ||
                                        employee.name ||
                                        employee.fullName}
                                </span>

                                <button
                                    type="button"
                                    onClick={() =>
                                        toggleEmployee(getEmployeeId(employee))
                                    }
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        ))}

                    </div>
                )}

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
                    >
                        Add Members
                    </button>

                </div>

            </div>
        </div>
    );
}

export default AddMembersModal;