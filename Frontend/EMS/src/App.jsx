import React, { lazy, memo, Suspense, useEffect, useMemo } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import "./App.css";

import GlobalUiController from "./components/GlobalUiController";
import {
  getStoredPermissions,
  getStoredRole,
  getStoredToken,
} from "./utils/authStorage";
import {
  clearSessionTimer,
  handleAutoLogout,
  isSessionExpired,
  startSessionTimer,
} from "./utils/sessionManager";
import {
  endPerformanceTimer,
  startPerformanceTimer,
} from "./utils/performance";
import "./typography.css";
import "./theme/theme-overrides.css";
import { PageSkeleton } from "./components/Skeletons";

/* ================= HELPERS ================= */

const normalize = (name) =>
  (name || "")
    .toLowerCase()
    .replace(/^user\s+/i, "")
    .replace(/^admin\s+/i, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

const PUBLIC_ROUTES = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/otp",
  "/reset-password",
]);

const redirectToLoginIfNeeded = () => {
  if (
    typeof window !== "undefined" &&
    !PUBLIC_ROUTES.has(window.location.pathname)
  ) {
    window.location.replace("/login");
  }
};

// Optimization: split each route into its own chunk so login/first paint do not load every page.
const lazyRoute = (routeName, loader) =>
  lazy(() => {
    const timerLabel = `route:${routeName}`;

    startPerformanceTimer(timerLabel);

    return loader().finally(() => {
      endPerformanceTimer(timerLabel);
    });
  });

// Keep route transitions filled with a themed skeleton instead of a blank screen.
const RouteFallback = memo(() => (
  <div className="app-route-skeleton" style={{ padding: "24px" }}>
    <PageSkeleton variant="dashboard" />
  </div>
));

const Register = lazyRoute("register", () => import("./Pages/loginpage/Register"));
const Login = lazyRoute("login", () => import("./Pages/loginpage/Login"));
const ForgotPassword = lazyRoute("forgot-password", () => import("./Pages/loginpage/ForgotPassword"));
const OtpVerification = lazyRoute("otp", () => import("./Pages/loginpage/OtpVerification"));
const ResetPassword = lazyRoute("reset-password", () => import("./Pages/loginpage/ResetPassword"));

const Dashboard = lazyRoute("dashboard", () => import("./dashboard/Dashboard"));
const UserDashboard = lazyRoute("user-dashboard", () => import("./dashboard/UserDashboard"));

const EmployeeList = lazyRoute("employees", () => import("./Employees/EmployeeList"));
const AddEmployee = lazyRoute("add-employee", () => import("./Employees/AddEmployee/AddEmployee"));
const ScreenPermissions = lazyRoute("screen-permissions", () => import("./Employees/ScreenPermissions/ScreenPermissions"));

const Departments = lazyRoute("departments", () => import("./Departments/Departments"));
const CompanyDetails = lazyRoute("company", () => import("./Company/CompanyDetails"));
const Projects = lazyRoute("projects", () => import("./Company/Projects"));
const Holidays = lazyRoute("holidays", () => import("./Company/Holidays"));
const UserHolidays = lazyRoute("user-holidays", () => import("./Company/UserHolidays"));

const Roles = lazyRoute("roles", () => import("./Masters/Roles"));
const Assets = lazyRoute("assets", () => import("./Masters/Assets"));
const Clients = lazyRoute("clients", () => import("./Masters/Clients"));

const Attendance = lazyRoute("attendance", () => import("./Attendance/Attendance"));
const UserAttendance = lazyRoute("user-attendance", () => import("./Attendance/UserAttendance"));

const LeaveManagement = lazyRoute("leave-management", () => import("./LeaveManagement/LeaveManagement"));
const UserLeaveManagement = lazyRoute("user-leave-management", () => import("./LeaveManagement/UserLeaveManagement"));
const Teams = lazyRoute("teams", () => import("./Teams/Teams"));
const TeamDetails = lazyRoute("team-details", () => import("./Teams/TeamDetails"));

const TaskManagement = lazyRoute("tasks", () => import("./TaskManagement/TaskManagement"));
const UserTaskManagement = lazyRoute("user-tasks", () => import("./TaskManagement/UserTaskManagement"));

const Notifications = lazyRoute("notifications", () => import("./Notifications/Notifications"));
const UserNotifications = lazyRoute("user-notifications", () => import("./Notifications/UserNotifications"));

const Payroll = lazyRoute("payroll", () => import("./Payroll/Payroll"));
const UserPayslip = lazyRoute("user-payslip", () => import("./Payroll/UserPayslip"));

const OfferLetters = lazyRoute("offer-letters", () => import("./OfferLetters/OfferLetters"));
const Reports = lazyRoute("reports", () => import("./Reports/Reports"));

const MainLayout = lazyRoute("main-layout", () => import("./MainLayout"));

/* ================= ROUTES ================= */

const PrivateRoute = ({ children }) => {
  const token = getStoredToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isSessionExpired()) {
    handleAutoLogout({ redirect: false });
    return <Navigate to="/login" replace />;
  }

  return children;
};

const SessionController = () => {
  const location = useLocation();

  useEffect(() => {
    if (!getStoredToken()) {
      clearSessionTimer();
      return;
    }

    if (isSessionExpired()) {
      handleAutoLogout();
      return;
    }

    startSessionTimer();
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleSessionCheck = () => {
      if (!getStoredToken()) {
        clearSessionTimer();
        redirectToLoginIfNeeded();
        return;
      }

      if (isSessionExpired()) {
        handleAutoLogout();
        return;
      }

      startSessionTimer();
    };

    const handleStorageChange = (event) => {
      const authKeys = [
        "token",
        "authToken",
        "jwtToken",
        "loginTime",
        "role",
        "userData",
      ];

      if (authKeys.includes(event.key)) {
        handleSessionCheck();
      }
    };

    handleSessionCheck();

    window.addEventListener("focus", handleSessionCheck);
    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("visibilitychange", handleSessionCheck);

    return () => {
      clearSessionTimer();
      window.removeEventListener("focus", handleSessionCheck);
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleSessionCheck);
    };
  }, []);

  return null;
};

/* ================= PERMISSION ================= */

const PermissionRoute = ({ module, children }) => {
  const role = getStoredRole();
  const modules = getStoredPermissions();

  // Optimization: normalize permission names once per route render instead of during every lookup.
  const allowedModules = useMemo(
    () =>
      (modules || [])
        .filter((m) => (m.canAccess ?? m.CanAccess ?? true) === true)
        .map((m) => normalize(m.moduleName)),
    [modules]
  );

  // ADMIN -> full access
  if (role === "admin") return children;

  // NO DEFAULT MODULES
  if (!modules || modules.length === 0) {
    return <Navigate to="/unauthorized" replace />;
  }

  const normalizedModule = normalize(module);
  const hasAccess = allowedModules.includes(normalizedModule);

  return hasAccess ? children : <Navigate to="/unauthorized" replace />;
};

/* ================= APP ================= */

function App() {
  return (
    <BrowserRouter>
      <GlobalUiController />
      <SessionController />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/otp" element={<OtpVerification />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            {/* DASHBOARD */}
            <Route
              path="/dashboard"
              element={
                <PermissionRoute module="Dashboard">
                  <Dashboard />
                </PermissionRoute>
              }
            />

            {/* USER DASHBOARD */}
            <Route path="/user-dashboard" element={<UserDashboard />} />

            {/* EMPLOYEES */}
            <Route
              path="/employees"
              element={
                <PermissionRoute module="Employees">
                  <EmployeeList />
                </PermissionRoute>
              }
            />

            <Route
              path="/employee-permissions/:id/:roleName"
              element={
                <PermissionRoute module="Screen Permissions">
                  <ScreenPermissions />
                </PermissionRoute>
              }
            />

            {/* ADD EMPLOYEE ROUTES */}
            <Route
              path="/add-employee"
              element={
                getStoredRole() === "user" ? (
                  <AddEmployee />
                ) : (
                  <PermissionRoute module="Add Employee">
                    <AddEmployee />
                  </PermissionRoute>
                )
              }
            />

            {/* VIEW / EDIT EMPLOYEE FULL DETAIL */}
            <Route
              path="/add-employee/:id"
              element={
                <PermissionRoute module="Add Employee">
                  <AddEmployee />
                </PermissionRoute>
              }
            />

            <Route
              path="/departments"
              element={
                <PermissionRoute module="Departments">
                  <Departments />
                </PermissionRoute>
              }
            />

            {/* COMPANY */}
            <Route
              path="/company"
              element={
                <PermissionRoute module="Company Details">
                  <CompanyDetails />
                </PermissionRoute>
              }
            />

            <Route
              path="/projects"
              element={
                <PermissionRoute module="Projects">
                  <Projects />
                </PermissionRoute>
              }
            />

            <Route
              path="/holidays"
              element={
                <PermissionRoute module="Holidays">
                  <Holidays />
                </PermissionRoute>
              }
            />

            <Route
              path="/user-holidays"
              element={
                <PermissionRoute module="User Holidays">
                  <UserHolidays />
                </PermissionRoute>
              }
            />

            {/* MASTERS */}
            <Route
              path="/roles"
              element={
                <PermissionRoute module="Roles">
                  <Roles />
                </PermissionRoute>
              }
            />

            <Route
              path="/assets"
              element={
                <PermissionRoute module="Assets">
                  <Assets />
                </PermissionRoute>
              }
            />

            <Route
              path="/clients"
              element={
                <PermissionRoute module="Clients">
                  <Clients />
                </PermissionRoute>
              }
            />

            {/* ATTENDANCE */}
            <Route
              path="/attendance"
              element={
                <PermissionRoute module="Attendance">
                  <Attendance />
                </PermissionRoute>
              }
            />

            <Route
              path="/user-attendance"
              element={
                <PermissionRoute module="User Attendance">
                  <UserAttendance />
                </PermissionRoute>
              }
            />

            {/* TEAMS */}
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:teamId" element={<TeamDetails />} />

            {/* LEAVE */}
            <Route
              path="/leave-management"
              element={
                <PermissionRoute module="Leave Management">
                  <LeaveManagement />
                </PermissionRoute>
              }
            />

            <Route
              path="/user-leave-management"
              element={
                <PermissionRoute module="User Leave Management">
                  <UserLeaveManagement />
                </PermissionRoute>
              }
            />

            {/* TASKS */}
            <Route
              path="/tasks"
              element={
                <PermissionRoute module="Task Management">
                  <TaskManagement />
                </PermissionRoute>
              }
            />

            <Route
              path="/user-tasks"
              element={
                <PermissionRoute module="User Task Management">
                  <UserTaskManagement />
                </PermissionRoute>
              }
            />

            {/* PAYROLL */}
            <Route
              path="/payroll"
              element={
                <PermissionRoute module="Payroll">
                  <Payroll />
                </PermissionRoute>
              }
            />

            <Route
              path="/user-payslip"
              element={
                <PermissionRoute module="User Payslip">
                  <UserPayslip />
                </PermissionRoute>
              }
            />

            {/* OTHER */}
            <Route
              path="/notifications"
              element={
                <PermissionRoute module="Notifications">
                  <Notifications />
                </PermissionRoute>
              }
            />

            <Route
              path="/user-notifications"
              element={
                <PermissionRoute module="User Notifications">
                  <UserNotifications />
                </PermissionRoute>
              }
            />

            <Route
              path="/offer-letters"
              element={
                <PermissionRoute module="Offer Letters">
                  <OfferLetters />
                </PermissionRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <PermissionRoute module="Reports">
                  <Reports />
                </PermissionRoute>
              }
            />
          </Route>

          <Route path="/unauthorized" element={<h2>No Access ðŸš«</h2>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
