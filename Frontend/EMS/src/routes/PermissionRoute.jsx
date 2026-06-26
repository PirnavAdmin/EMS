import { Navigate } from "react-router-dom";
import { getStoredPermissions, getStoredRole } from "../utils/authStorage";
import { PageSkeleton } from "../components/Skeletons";

/* ✅ NORMALIZE */
const normalize = (name) => {
  return (name || "")
    .toLowerCase()
    .replace(/^user\s+/i, "") // remove "User"
    .replace(/\s+/g, " ")
    .trim();
};

/* ✅ UNIVERSAL MODULE MAP */
const moduleMap = {
  dashboard: "dashboard",

  "task management": "task management",
  "user task management": "task management",
  tasks: "task management",

  payroll: "payroll",
  payslip: "payslip",
  "user payslip": "payslip",

  leave: "leave management",
  "leave management": "leave management",
  "user leave management": "leave management",

  attendance: "attendance",
  "user attendance": "attendance",

  notifications: "notifications",
};

/* ✅ MAP FUNCTION */
const mapModule = (name) => {
  return moduleMap[normalize(name)] || normalize(name);
};

/* ✅ GET PERMISSIONS */
const PermissionRoute = ({ children, module }) => {
  const role = getStoredRole();
  const permissions = getStoredPermissions();

  if (role === "admin") {
    return children;
  }

  /* ⏳ WAIT */
  if (!Array.isArray(permissions)) {
    return (
      <div style={{ padding: "20px" }}>
        <PageSkeleton variant="cards" cardCount={3} />
      </div>
    );
  }

  /* ✅ ROUTE MODULE */
  const routeModule = mapModule(module);

  /* ✅ CHECK ACCESS */
  const hasAccess = permissions.some((p) => {
    const moduleName =
      typeof p === "string" ? p : p?.moduleName;

    return (
      (p?.canAccess ?? p?.CanAccess ?? true) === true &&
      mapModule(moduleName) === routeModule
    );
  });

  /* 🔍 DEBUG (keep for now) */
  console.log("Route:", module, "→", routeModule);
  console.log(
    "Permissions:",
    permissions.map((p) => mapModule(p.moduleName))
  );
  console.log("Access:", hasAccess);

  /* ❌ BLOCK */
  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  /* ✅ ALLOW */
  return children;
};

export default PermissionRoute;
