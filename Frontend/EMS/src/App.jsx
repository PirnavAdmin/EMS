import React, { lazy, memo, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import PermissionRoute from "./routes/PermissionRoute";
import ProtectedRoute from "./routes/ProtectedRoute";
import { usePermissionScope } from "./context/usePermissionScope";

import GlobalUiController from "./components/GlobalUiController";
import { AdminPermissionProvider } from "./context/AdminPermissionContext";
import { EmployeePermissionProvider } from "./context/EmployeePermissionContext";
import "react-toastify/dist/ReactToastify.css";
import "./components/common/Toast/toast.css";
import GlobalToastContainer from "./components/common/toast/GlobalToastContainer";
import { getStoredToken } from "./utils/authStorage";
import { hasRole } from "./utils/authorization";
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

const PUBLIC_ROUTES = new Set([
  "/",
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
const LandingPage = lazyRoute("landing-page", () => import("./Pages/landing/LandingPage"));
const Login = lazyRoute("login", () => import("./Pages/loginpage/Login"));
const ForgotPassword = lazyRoute("forgot-password", () => import("./Pages/loginpage/ForgotPassword"));
const OtpVerification = lazyRoute("otp", () => import("./Pages/loginpage/OtpVerification"));
const ResetPassword = lazyRoute("reset-password", () => import("./Pages/loginpage/ResetPassword"));

const Dashboard = lazyRoute("dashboard", () => import("./dashboard/Dashboard"));
const SuperAdminClients = lazyRoute("super-admin-clients", () => import("./SuperAdmin/SuperAdminClients"));
const Subscriptions = lazyRoute("subscriptions", () => import("./SuperAdmin/Subscriptions"));
// const Support = lazyRoute("support", () => import("./SuperAdmin/Support"));
const SuperAdminPermissions = lazyRoute("super-admin-permissions", () => import("./SuperAdmin/SuperAdminPermissions"));

const EmployeeList = lazyRoute("employees", () => import("./Employees/EmployeeList"));
const AddEmployee = lazyRoute("add-employee", () => import("./Employees/AddEmployee/AddEmployee"));
const ScreenPermissions = lazyRoute("screen-permissions", () => import("./Employees/ScreenPermissions/ScreenPermissions"));
const OnboardingDetails = lazyRoute("onboarding-details", () => import("./Onboarding/OnboardingDetails"));
const AdminOnboardingList = lazyRoute("admin-onboarding-list", () => import("./Onboarding/AdminOnboardingList"));
const AdminOnboardingDetails = lazyRoute("admin-onboarding-details", () => import("./Onboarding/AdminOnboardingDetails"));

const Departments = lazyRoute("departments", () => import("./Departments/Departments"));
const CompanyDetails = lazyRoute("company", () => import("./Company/CompanyDetails"));
const Projects = lazyRoute("projects", () => import("./Company/Projects"));
const ProjectDetails = lazyRoute("project-details", () => import("./Company/ProjectDetails"));
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

const TicketManagement = lazyRoute("ticket-management", () => import("./TicketManagement/TicketManagement"));
const MyTickets = lazyRoute("my-tickets", () => import("./TicketManagement/MyTickets"));
const TicketDetails = lazyRoute("ticket-details", () => import("./TicketManagement/TicketDetails"));
const EditTicket = lazyRoute("edit-ticket", () => import("./TicketManagement/EditTicket"));

const Notifications = lazyRoute("notifications", () => import("./Notifications/Notifications"));
const UserNotifications = lazyRoute("user-notifications", () => import("./Notifications/UserNotifications"));

const Payroll = lazyRoute("payroll", () => import("./Payroll/Payroll"));
const UserPayslip = lazyRoute("user-payslip", () => import("./Payroll/UserPayslip"));

const OfferLetters = lazyRoute("offer-letters", () => import("./OfferLetters/OfferLetters"));
const Reports = lazyRoute("reports", () => import("./Reports/Reports"));
const SettingsPage = lazyRoute("settings", () => import("./Pages/Settings/SettingsPage"));
const HrmsSettingsPage = lazyRoute("hrms-settings", () => import("./Pages/Settings/HrmsSettingsPage"));
const TemplateSettingsPage = lazyRoute("template-settings", () =>
  import("./Pages/Settings/HrmsSettingsPage").then((module) => ({
    default: module.TemplateSettingsPage,
  }))
);
const AccessDenied = lazyRoute("access-denied", () => import("./Pages/AccessDenied"));

const MainLayout = lazyRoute("main-layout", () => import("./MainLayout"));

/* ================= ROUTES ================= */

const SessionController = () => {
  const location = useLocation();

  useEffect(() => {
    if (!getStoredToken()) {
      clearSessionTimer();
      redirectToLoginIfNeeded();
      return;
    }

    if (isSessionExpired()) {
      handleAutoLogout({
        reason: "SessionController detected an expired session",
      });
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
        handleAutoLogout({
          reason: "SessionController detected an expired session",
        });
        return;
      }

      startSessionTimer();
    };

    const handleStorageChange = (event) => {
      const authKeys = [
        "token",
        "authToken",
        "jwtToken",
        "refreshToken",
        "loginTime",
        "role",
        "loginType",
        "user",
        "userId",
        "adminId",
        "adminEmail",
        "employeeId",
        "adminPermissions",
        "rolePermissions",
        "roleAllowedModules",
        "roleModules",
        "rolePermissionModules",
        "employeePermissions",
        "employeeAllowedModules",
        "employeeModules",
        "employeePermissionModules",
        "allowedModules",
        "modules",
        "permissions",
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

const AdminSettingsRoute = ({ children }) => (
  <PermissionRoute module="Settings">{children}</PermissionRoute>
);

const ProtectedMainLayout = () => {
  const permissionScope = usePermissionScope();

  return <MainLayout permissionScope={permissionScope} />;
};

/* ================= APP ================= */

function App() {
  return (
    <AdminPermissionProvider>
      <EmployeePermissionProvider>
        <GlobalToastContainer />
        <GlobalUiController />
        <SessionController />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/otp" element={<OtpVerification />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="/403" element={<AccessDenied />} />
          <Route path="/unauthorized" element={<Navigate to="/403" replace />} />

          <Route
            element={
            <ProtectedRoute>
                <ProtectedMainLayout />
              </ProtectedRoute>
            }
          >
            {/* DASHBOARD */}
            <Route path="/onboarding" element={<Navigate to="/onboarding/details" replace />} />
            <Route path="/onboarding/details" element={<OnboardingDetails />} />

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
            <Route
              path="/user-dashboard"
              element={<Navigate to="/dashboard" replace />}
            />

            <Route
              path="/super-admin/dashboard"
              element={
                <PermissionRoute module="Dashboard">
                  <Dashboard />
                </PermissionRoute>
              }
            />

            <Route
              path="/admin/dashboard"
              element={
                <PermissionRoute module="Dashboard">
                  <Dashboard />
                </PermissionRoute>
              }
            />

            <Route
              path="/employee/dashboard"
              element={
                <PermissionRoute module="Dashboard">
                  <Dashboard />
                </PermissionRoute>
              }
            />

            <Route
              path="/super-admin/administration"
              element={<Navigate to="/super-admin/administration/admins" replace />}
            />
            <Route
              path="/super-admin/administration/admins"
              element={
                <PermissionRoute module="Admin Management">
                  <SuperAdminClients />
                </PermissionRoute>
              }
            />
            <Route
              path="/super-admin/administration/subscriptions"
              element={
                <PermissionRoute module="Subscription Management">
                  <Subscriptions />
                </PermissionRoute>
              }
            />
            <Route
              path="/super-admin/administration/permissions"
              element={
                <PermissionRoute module="Permissions">
                  <SuperAdminPermissions />
                </PermissionRoute>
              }
            />
            <Route
              path="/admin-management"
              element={
                <PermissionRoute module="Admin Management">
                  <SuperAdminClients />
                </PermissionRoute>
              }
            />
            <Route
              path="/subscription-management"
              element={
                <PermissionRoute module="Subscription Management">
                  <Subscriptions />
                </PermissionRoute>
              }
            />
            <Route
              path="/permissions"
              element={
                <PermissionRoute module="Permissions">
                  <SuperAdminPermissions />
                </PermissionRoute>
              }
            />
            <Route
              path="/super-admin/*"
              element={<Navigate to="/super-admin/dashboard" replace />}
            />

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
                hasRole("user", "employee") ? (
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
              path="/admin/onboarding"
              element={
                <PermissionRoute module="Onboarding List">
                  <AdminOnboardingList />
                </PermissionRoute>
              }
            />

            <Route
              path="/admin/onboarding/:onboardingId"
              element={
                <PermissionRoute module="Onboarding List">
                  <AdminOnboardingDetails />
                </PermissionRoute>
              }
            />

            <Route
              path="/roles/:roleName"
              element={
                <PermissionRoute module="Screen Permissions">
                  <ScreenPermissions />
                </PermissionRoute>
              }
            />

            <Route
              path="/projects/:projectId"
              element={
                <PermissionRoute module="Projects">
                  <ProjectDetails />
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
            <Route
              path="/teams"
              element={
                <PermissionRoute module="Teams">
                  <Teams />
                </PermissionRoute>
              }
            />
            <Route
              path="/teams/:teamId"
              element={
                <PermissionRoute module="Teams">
                  <TeamDetails />
                </PermissionRoute>
              }
            />

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

            {/* TICKETS */}
            <Route
              path="/admin/tickets"
              element={
                <PermissionRoute module="All Tickets">
                  <TicketManagement />
                </PermissionRoute>
              }
            />

            <Route
              path="/admin/tickets/:ticketId"
              element={
                <PermissionRoute module="All Tickets">
                  <TicketDetails />
                </PermissionRoute>
              }
            />

            <Route
              path="/admin/tickets/edit/:ticketId"
              element={
                <PermissionRoute module="All Tickets">
                  <EditTicket />
                </PermissionRoute>
              }
            />

            <Route
              path="/employee/my-tickets"
              element={
                <PermissionRoute module="My Tickets">
                  <MyTickets />
                </PermissionRoute>
              }
            />

            <Route
              path="/employee/my-tickets/:ticketId"
              element={
                <PermissionRoute module="My Tickets">
                  <MyTickets />
                </PermissionRoute>
              }
            />

            <Route
              path="/employee/my-tickets/edit/:ticketId"
              element={
                <PermissionRoute module="My Tickets">
                  <EditTicket />
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

            <Route
              path="/settings"
              element={
                <AdminSettingsRoute>
                  <SettingsPage />
                </AdminSettingsRoute>
              }
            />
            <Route
              path="/settings/resignation"
              element={
                <AdminSettingsRoute>
                  <HrmsSettingsPage moduleKey="resignation" />
                </AdminSettingsRoute>
              }
            />
            <Route
              path="/settings/employee-clearance"
              element={
                <AdminSettingsRoute>
                  <HrmsSettingsPage moduleKey="employeeClearance" />
                </AdminSettingsRoute>
              }
            />
            <Route
              path="/settings/exit-interview"
              element={
                <AdminSettingsRoute>
                  <HrmsSettingsPage moduleKey="exitInterview" />
                </AdminSettingsRoute>
              }
            />
            <Route
              path="/settings/full-final-settlement"
              element={
                <AdminSettingsRoute>
                  <HrmsSettingsPage moduleKey="fullFinalSettlement" />
                </AdminSettingsRoute>
              }
            />
            <Route
              path="/settings/shift"
              element={
                <AdminSettingsRoute>
                  <HrmsSettingsPage shiftMode />
                </AdminSettingsRoute>
              }
            />
            <Route
              path="/settings/templates"
              element={
                <AdminSettingsRoute>
                  <TemplateSettingsPage />
                </AdminSettingsRoute>
              }
            />
          </Route>

          </Routes>
        </Suspense>
      </EmployeePermissionProvider>
    </AdminPermissionProvider>
  );
}

export default App;
