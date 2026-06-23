import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./ScreenPermissions.css";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS } from "../../api/endpoints";

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/* ================= MODULES (DB SYNCED) ================= */
const MODULES = [
  { moduleId: 46, moduleName: "Dashboard" },

  { moduleId: 47, moduleName: "Employees" },
  { moduleId: 48, moduleName: "Add Employee" },
  { moduleId: 49, moduleName: "Screen Permissions" },

  { moduleId: 50, moduleName: "Departments" },
  { moduleId: 51, moduleName: "Company Details" },
  { moduleId: 52, moduleName: "Holidays" },
  { moduleId: 53, moduleName: "Projects" },
  { moduleId: 54, moduleName: "Job Openings" },
  { moduleId: 70, moduleName: "User Holidays" },

  { moduleId: 55, moduleName: "Roles" },
  { moduleId: 56, moduleName: "Assets" },
  { moduleId: 57, moduleName: "Clients" },

  { moduleId: 58, moduleName: "Attendance" },
  { moduleId: 59, moduleName: "User Attendance" },

  { moduleId: 60, moduleName: "Leave Management" },
  { moduleId: 61, moduleName: "User Leave Management" },

  { moduleId: 62, moduleName: "Task Management" },
  { moduleId: 63, moduleName: "User Task Management" },

  { moduleId: 64, moduleName: "Payroll" },
  { moduleId: 65, moduleName: "User Payslip" },

  { moduleId: 66, moduleName: "Offer Letters" },
  { moduleId: 67, moduleName: "Reports" },
  { moduleId: 68, moduleName: "Notifications" },
  { moduleId: 71, moduleName: "User Notifications"}
];

/* ================= GROUPING ================= */
const GROUPS = [
  {
    title: "EMPLOYEE MANAGEMENT",
    modules: [47, 48, 49]
  },
  {
    title: "COMPANY",
    modules: [50, 51, 52, 70, 53, 54]
  },
  {
    title: "MASTERS",
    modules: [55, 56, 57]
  },
  {
    title: "ATTENDANCE & LEAVE",
    modules: [58, 59, 60, 61]
  },
  {
    title: "TASKS",
    modules: [62, 63]
  },
  {
    title: "PAYROLL",
    modules: [64, 65]
  },
  {
    title: "OTHERS",
    modules: [66, 67, 68, 71]
  }
];

function ScreenPermissions() {
  const { id, roleName } = useParams();
  const navigate = useNavigate();

  const roleId = parseInt(id, 10);

  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  /* ================= FETCH ================= */
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const decodedRoleName = decodeURIComponent(roleName);

        const res = await api.get(
          API_ENDPOINTS.rolePermission.byRoleName(decodedRoleName)
        );

        const data =
          res?.data?.data?.$values ||
          res?.data?.data ||
          res?.data ||
          [];

        const formatted = {};
        data.forEach((p) => {
          formatted[p.moduleId] = p.canAccess ?? p.CanAccess ?? false;
        });

        setPermissions(formatted);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load permissions ❌");
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [roleName]);

  /* ================= TOGGLE ================= */
  const toggleAccess = (moduleId) => {
    setPermissions((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  /* ================= GLOBAL SELECT ================= */
  const handleSelectAll = () => {
    const allSelected = Object.values(permissions).every(v => v === true);

    const updated = {};
    MODULES.forEach(m => {
      updated[m.moduleId] = !allSelected;
    });

    setPermissions(updated);
  };

  /* ================= SAVE ================= */
  const handleSave = async () => {
    try {
      const decodedRoleName = decodeURIComponent(roleName);

      const modulesPayload = MODULES.map((m) => ({
        moduleId: m.moduleId,
        moduleName: m.moduleName,
        canAccess: permissions[m.moduleId] === true
      }));

      await api.post(
        API_ENDPOINTS.rolePermission.save,
        {
          roleId,
          roleName: decodedRoleName,
          modules: modulesPayload
        },
        {
          headers: {
            "Content-Type": "application/json",
          }
        }
      );

      toast.success("Permissions Saved Successfully ✅");

      // ✅ FIXED HERE (navigate to roles)
      setTimeout(() => navigate("/roles"), 1200);

    } catch (error) {
      console.error(error);
      toast.error("Save failed ❌");
    }
  };

  if (loading) return <p style={{ padding: "20px" }}>Loading...</p>;

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="permission-page">

        {/* HEADER */}
        <div className="permission-top">
          <h2>
            Role Permissions — <span>{decodeURIComponent(roleName)}</span>
          </h2>

          <button className="select-all-btn" onClick={handleSelectAll}>
            Select All
          </button>
        </div>

        {/* GROUPS */}
        {GROUPS.map(group => (
          <div className="permission-group" key={group.title}>

            <div className="group-header">{group.title}</div>

            {group.modules.map(id => {
              const module = MODULES.find(m => m.moduleId === id);

              return (
                <div className="permission-row" key={id}>
                  <span>{module?.moduleName}</span>

                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={permissions[id] || false}
                      onChange={() => toggleAccess(id)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              );
            })}
          </div>
        ))}

        {/* FOOTER */}
        <div className="permission-actions">
          {/* ✅ FIXED HERE */}
          <button onClick={() => navigate("/roles")}>
            Skip
          </button>

          <button onClick={handleSave}>
            Save Permissions
          </button>
        </div>

      </div>
    </>
  );
}

export default ScreenPermissions;
