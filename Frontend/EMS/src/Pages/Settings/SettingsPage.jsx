import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { toastSuccess, toastError } from "@/components/common/toast/toastService";
import {
  FaCalendarMinus,
  FaBell,
  FaClock,
  FaFileAlt,
  FaFileSignature,
  FaEnvelope,
  FaImage,
  FaUserTie,
  FaMoneyBillWave,
  FaRedo,
  FaSave,
  FaShieldAlt,
} from "react-icons/fa";
import {
  CardSkeleton,
  PageSkeleton,
} from "../../components/Skeletons";
import { isPlatformAdmin } from "../../utils/authorization";
import {
  getSettingsErrorMessage,
  EMAIL_SETTINGS_DEFAULTS,
  ATTENDANCE_SETTINGS_DEFAULTS,
  NOTIFICATION_SETTINGS_DEFAULTS,
  LEAVE_SETTINGS_DEFAULTS,
  POLICY_SETTINGS_DEFAULTS,
  fetchEmailSettings,
  saveEmailSettings,
  fetchAttendanceSettings,
  saveAttendanceSettings,
  fetchNotificationSettings,
  saveNotificationSettings,
  fetchLeaveSettings,
  saveLeaveSettings,
  fetchPoliciesSettings,
  fetchPolicySettings,
  savePolicySettings,
} from "../../services/settingsService";
import EmailSettings from "./EmailSettings";
import AttendanceSettings from "./AttendanceSettings";
import LeaveSettings from "./LeaveSettings";
import BrandingSettings from "./BrandingSettings";
import NotificationSettings from "./NotificationSettings";
import PolicySettings from "./PolicySettings";
import AgreementSettings from "./AgreementSettings";
import HrmsSettingsPage, { TemplateSettingsPage } from "./HrmsSettingsPage";
import {
  validateEmailSettings,
  validateAttendanceSettings,
  validateNotificationSettings,
  validateLeaveSettings,
  validatePolicySettings,
} from "./settingsHelpers";
import "./Settings.css";

const HrmsSettingsTab = ({ moduleKey }) => (
  <HrmsSettingsPage moduleKey={moduleKey} />
);

const ShiftSettingsTab = () => <HrmsSettingsPage shiftMode />;

const BASE_TAB_DEFINITIONS = [
  {
    key: "email",
    label: "Email Settings",
    description: "Email routing and support inboxes",
    icon: FaEnvelope,
    component: EmailSettings,
    fetchSettings: fetchEmailSettings,
    saveSettings: saveEmailSettings,
    validateSettings: validateEmailSettings,
    defaults: EMAIL_SETTINGS_DEFAULTS,
    successMessage: "Settings updated successfully.",
    loadErrorMessage: "We could not load the email configuration.",
  },
  {
    key: "attendance",
    label: "Attendance Settings",
    description: "Office timings and checkout rules",
    icon: FaClock,
    component: AttendanceSettings,
    fetchSettings: fetchAttendanceSettings,
    saveSettings: saveAttendanceSettings,
    validateSettings: validateAttendanceSettings,
    defaults: ATTENDANCE_SETTINGS_DEFAULTS,
    successMessage: "Settings updated successfully.",
    loadErrorMessage: "We could not load the attendance configuration.",
  },
  {
    key: "leave",
    label: "Leave Settings",
    description: "Approval routes, limits, and attachment rules",
    icon: FaCalendarMinus,
    component: LeaveSettings,
    fetchSettings: fetchLeaveSettings,
    saveSettings: saveLeaveSettings,
    validateSettings: validateLeaveSettings,
    defaults: LEAVE_SETTINGS_DEFAULTS,
    successMessage: "Settings updated successfully.",
    loadErrorMessage: "We could not load the leave configuration.",
  },
  {
    key: "brand",
    label: "Brand Settings",
    description: "Company logo and branding assets",
    icon: FaImage,
    component: BrandingSettings,
    fetchSettings: async () => ({ values: {}, lastUpdated: "" }),
    saveSettings: async () => ({ values: {}, lastUpdated: "" }),
    validateSettings: () => ({}),
    defaults: {},
    successMessage: "Settings updated successfully.",
    loadErrorMessage: "We could not load the branding configuration.",
    hideFooter: true,
  },
  {
    key: "notification",
    label: "Notification Settings",
    description: "Notification data returned by the backend",
    icon: FaBell,
    component: NotificationSettings,
    fetchSettings: fetchNotificationSettings,
    saveSettings: saveNotificationSettings,
    validateSettings: validateNotificationSettings,
    defaults: NOTIFICATION_SETTINGS_DEFAULTS,
    successMessage: "Settings updated successfully.",
    loadErrorMessage: "We could not load the notification configuration.",
  },
  {
    key: "policy",
    label: "Policies",
    description: "Policy catalog and editable policy details",
    icon: FaFileAlt,
    component: PolicySettings,
    fetchSettings: fetchPoliciesSettings,
    saveSettings: savePolicySettings,
    validateSettings: validatePolicySettings,
    defaults: { ...POLICY_SETTINGS_DEFAULTS, __policyOptions: [] },
    successMessage: "Settings updated successfully.",
    loadErrorMessage: "We could not load the policy configuration.",
  },
  {
    key: "agreements",
    label: "Agreement Settings",
    description: "Employee contracts and compliance documents",
    icon: FaFileSignature,
    component: AgreementSettings,
    fetchSettings: async () => ({ values: {}, lastUpdated: "" }),
    saveSettings: async () => ({ values: {}, lastUpdated: "" }),
    validateSettings: () => ({}),
    defaults: {},
    successMessage: "Settings updated successfully.",
    loadErrorMessage: "We could not load the agreement configuration.",
    hideFooter: true,
  },
];

const HRMS_SETTINGS_MODULES = [
  {
    key: "templates",
    label: "Templates",
    description: "Document and communication templates",
    icon: FaFileSignature,
    component: TemplateSettingsPage,
  },
  {
    key: "resignation",
    label: "Resignation",
    description: "Employee resignation workflow",
    icon: FaFileSignature,
    component: () => <HrmsSettingsTab moduleKey="resignation" />,
  },
  {
    key: "employeeClearance",
    label: "Employee Clearance",
    description: "Department clearance tracking",
    icon: FaShieldAlt,
    component: () => <HrmsSettingsTab moduleKey="employeeClearance" />,
  },
  {
    key: "exitInterview",
    label: "Exit Interview",
    description: "Exit interview notes and feedback",
    icon: FaUserTie,
    component: () => <HrmsSettingsTab moduleKey="exitInterview" />,
  },
  {
    key: "fullFinalSettlement",
    label: "Full & Final Settlement",
    description: "Settlement generation and approval",
    icon: FaMoneyBillWave,
    component: () => <HrmsSettingsTab moduleKey="fullFinalSettlement" />,
  },
  {
    key: "shiftManagement",
    label: "Shift Management",
    description: "Shift modules in one internal dropdown",
    icon: FaClock,
    component: ShiftSettingsTab,
  },
].map((definition) => ({
  ...definition,
  fetchSettings: async () => ({ values: {}, lastUpdated: "" }),
  saveSettings: async () => ({ values: {}, lastUpdated: "" }),
  validateSettings: () => ({}),
  defaults: {},
  hideFooter: true,
}));

const SETTINGS_GROUPS = [
  {
    key: "general",
    title: "General Settings",
    tabs: [
      "email",
      "attendance",
      "leave",
      "brand",
      "notification",
      "policy",
      "agreements",
      "templates",
    ],
  },

  /*
  {
    key: "exit",
    title: "Employee Exit",
    tabs: [
      "resignation",
      "employeeClearance",
      "exitInterview",
      "fullFinalSettlement",
    ],
  },
  */

  {
    key: "shift",
    title: "Shift Management",
    tabs: [
      "shiftManagement",
    ],
  },
];

const createSectionState = (defaults) => ({
  values: { ...defaults },
  initialValues: { ...defaults },
  errors: {},
  loading: true,
  saving: false,
  loadError: "",
  lastUpdated: "",
});

const createInitialSections = (definitions = BASE_TAB_DEFINITIONS) =>
  Object.fromEntries(
    definitions.map((tab) => [tab.key, createSectionState(tab.defaults)])
  );

const areSectionsEqual = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);

function SettingsPage() {
  const isAdminUser = isPlatformAdmin();
  const tabDefinitions = useMemo(
    () => [...BASE_TAB_DEFINITIONS, ...HRMS_SETTINGS_MODULES],
    []
  );
  const tabKeys = useMemo(
    () => tabDefinitions.map((tab) => tab.key),
    [tabDefinitions]
  );
  const getInitialTab = () => {
    if (typeof window === "undefined") {
      return "email";
    }

    const storedKey = window.localStorage.getItem("ems.settings.activeModule");
    return tabDefinitions.some((tab) => tab.key === storedKey) ? storedKey : "email";
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [expandedGroup, setExpandedGroup] = useState("general");
  const [sections, setSections] = useState(() => createInitialSections(tabDefinitions));
  const [pageLoading, setPageLoading] = useState(true);
  const policyRequestIdRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      if (!isAdminUser) {
        setPageLoading(false);
        return;
      }

      setPageLoading(true);

      try {
        const loadResults = await Promise.all(
          tabDefinitions.map(async (definition) => {
            try {
              const result = await definition.fetchSettings();

              return {
                key: definition.key,
                status: "fulfilled",
                result,
              };
            } catch (error) {
              return {
                key: definition.key,
                status: "rejected",
                error,
              };
            }
          })
        );

        if (!isMounted) {
          return;
        }

        setSections((previousSections) => {
          const nextSections = { ...previousSections };

          loadResults.forEach((loadResult) => {
            const definition = tabDefinitions.find(
              (tab) => tab.key === loadResult.key
            );

            if (!definition) {
              return;
            }

            if (loadResult.status === "fulfilled") {
              const { values, lastUpdated } = loadResult.result;

              nextSections[definition.key] = {
                ...previousSections[definition.key],
                values: { ...values },
                initialValues: { ...values },
                errors: {},
                loading: false,
                saving: false,
                loadError: "",
                lastUpdated: lastUpdated || "",
              };

              return;
            }

            const loadErrorMessage = getSettingsErrorMessage(
              loadResult.error,
              definition.loadErrorMessage
            );

            toastError(loadErrorMessage);

            nextSections[definition.key] = {
              ...previousSections[definition.key],
              values: { ...definition.defaults },
              initialValues: { ...definition.defaults },
              errors: {},
              loading: false,
              saving: false,
              loadError: loadErrorMessage,
              lastUpdated: "",
            };
          });

          return nextSections;
        });
      } finally {
        if (isMounted) {
          setPageLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [isAdminUser, tabDefinitions]);

  const activeDefinition = useMemo(
    () => tabDefinitions.find((tab) => tab.key === activeTab) || tabDefinitions[0],
    [activeTab, tabDefinitions]
  );

  const activeSection =
    sections[activeDefinition.key] || createSectionState(activeDefinition.defaults);

  useEffect(() => {
    setSections((previousSections) => {
      const nextSections = { ...previousSections };

      tabDefinitions.forEach((definition) => {
        if (!nextSections[definition.key]) {
          nextSections[definition.key] = createSectionState(definition.defaults);
        }
      });

      return nextSections;
    });
  }, [tabDefinitions]);

  useEffect(() => {
    if (!tabDefinitions.some((tab) => tab.key === activeTab)) {
      setActiveTab(tabDefinitions[0]?.key || "email");
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem("ems.settings.activeModule", activeTab);
    }
  }, [activeTab, tabDefinitions]);

  const dirtyTabs = useMemo(
    () =>
      tabKeys.filter(
        (key) => sections[key] && !areSectionsEqual(sections[key].values, sections[key].initialValues)
      ),
    [sections, tabKeys]
  );

  const hasUnsavedChanges = dirtyTabs.length > 0;

  const handleFieldChange = (tabKey) => (event) => {
    const { name, type, checked, value } = event.target;
    const nextValue = type === "checkbox" ? checked : value;
    const definition = tabDefinitions.find((tab) => tab.key === tabKey);

    if (!definition) {
      return;
    }

    setSections((previousSections) => {
      const section = previousSections[tabKey];
      const nextValues = {
        ...section.values,
        [name]: nextValue,
      };

      return {
        ...previousSections,
        [tabKey]: {
          ...section,
          values: nextValues,
          errors: definition.validateSettings(nextValues),
        },
      };
    });
  };

  const handlePolicyChange = async (nextType) => {
    const targetType = String(nextType || "").trim();

    if (!targetType) {
      return;
    }

    const currentPolicySection = sections.policy;

    if (
      !currentPolicySection ||
      currentPolicySection.values?.type === targetType
    ) {
      return;
    }

    const requestId = policyRequestIdRef.current + 1;
    policyRequestIdRef.current = requestId;

    const previousValues = currentPolicySection.values;
    const previousInitialValues = currentPolicySection.initialValues;

    setSections((previousSections) => ({
      ...previousSections,
      policy: {
        ...previousSections.policy,
        values: {
          ...previousSections.policy.values,
          type: targetType,
        },
        loading: true,
        saving: false,
        errors: {},
        loadError: "",
      },
    }));

    try {
      const result = await fetchPolicySettings(targetType);

      if (policyRequestIdRef.current !== requestId) {
        return;
      }

      setSections((previousSections) => {
        const preservedMetadata = Object.fromEntries(
          Object.entries(previousSections.policy.values || {}).filter(([key]) =>
            String(key).startsWith("__")
          )
        );
        const nextValues = {
          ...preservedMetadata,
          ...result.values,
        };

        return {
          ...previousSections,
          policy: {
            ...previousSections.policy,
            values: nextValues,
            initialValues: { ...nextValues },
            errors: {},
            loading: false,
            saving: false,
            loadError: "",
            lastUpdated:
              result.lastUpdated || previousSections.policy.lastUpdated,
          },
        };
      });
    } catch (error) {
      if (policyRequestIdRef.current !== requestId) {
        return;
      }

      const loadErrorMessage = getSettingsErrorMessage(
        error,
        "We could not load the selected policy."
      );

      toastError(loadErrorMessage);

      setSections((previousSections) => ({
        ...previousSections,
        policy: {
          ...previousSections.policy,
          values: previousValues,
          initialValues: previousInitialValues,
          errors: {},
          loading: false,
          saving: false,
          loadError: loadErrorMessage,
        },
      }));
    }
  };

  const handleResetCurrentTab = () => {
    const definition = activeDefinition;

    setSections((previousSections) => ({
      ...previousSections,
      [definition.key]: {
        ...previousSections[definition.key],
        values: { ...previousSections[definition.key].initialValues },
        errors: {},
      },
    }));
  };

  const handleSaveCurrentTab = async () => {
    const definition = activeDefinition;
    const section = sections[definition.key];
    const validationErrors = definition.validateSettings(section.values);

    if (Object.keys(validationErrors).length > 0) {
      setSections((previousSections) => ({
        ...previousSections,
        [definition.key]: {
          ...previousSections[definition.key],
          errors: validationErrors,
        },
      }));

      toastError("Please correct the highlighted fields before saving.");
      return;
    }

    setSections((previousSections) => ({
      ...previousSections,
      [definition.key]: {
        ...previousSections[definition.key],
        saving: true,
        errors: {},
      },
    }));

    try {
      const response = await definition.saveSettings(section.values);
      const refreshArg =
        definition.key === "policy"
          ? String(section.values?.type || "").trim()
          : undefined;
      let refreshedResult = response;

      try {
        refreshedResult = await definition.fetchSettings(refreshArg);
      } catch (refreshError) {
        console.error("Settings Refresh Error:", refreshError);
        console.trace();
      }

      const preservedMetadata = Object.fromEntries(
        Object.entries(section.values || {}).filter(([key]) =>
          String(key).startsWith("__")
        )
      );
      const nextValues = {
        ...preservedMetadata,
        ...refreshedResult.values,
      };

      setSections((previousSections) => ({
        ...previousSections,
        [definition.key]: {
          ...previousSections[definition.key],
          values: nextValues,
          initialValues: { ...nextValues },
          errors: {},
          saving: false,
          loadError: "",
          lastUpdated:
            refreshedResult.lastUpdated ||
            response.lastUpdated ||
            previousSections[definition.key].lastUpdated,
        },
      }));

      toastSuccess(definition.successMessage);
    } catch (error) {
      console.error("Settings Save Error:", error);
      console.trace();
      const errorMessage = getSettingsErrorMessage(
        error,
        "Failed to update settings."
      );

      setSections((previousSections) => ({
        ...previousSections,
        [definition.key]: {
          ...previousSections[definition.key],
          saving: false,
        },
      }));

      toastError(errorMessage);
    }
  };

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    const handleDocumentClick = (event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest(".settings-page")) {
        return;
      }

      const navigationTarget = target.closest("[data-nav-target]");

      if (!navigationTarget) {
        return;
      }

      const shouldLeave = window.confirm(
        "You have unsaved changes. Leave this page without saving?"
      );

      if (shouldLeave) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [hasUnsavedChanges]);

  const currentSectionSaving = Boolean(activeSection?.saving);
  const currentSectionLoading = Boolean(activeSection?.loading);
  const currentSectionDirty = !areSectionsEqual(
    activeSection?.values,
    activeSection?.initialValues
  );
  const ActiveTabComponent = activeDefinition.component;
  const lastUpdatedDisplay = activeSection?.lastUpdated || "Not Available";
  const environmentDisplay =
    import.meta.env.MODE === "production" ? "Production" : "Development";

  if (!isAdminUser) {
    return <Navigate to="/access-denied" replace />;
  }

  if (pageLoading) {
    return (
      <div className="settings-page">
        <div className="settings-hero settings-hero-skeleton app-surface">
          <div className="settings-skeleton-line settings-skeleton-kicker" />
          <div className="settings-skeleton-line settings-skeleton-title" />
          <div className="settings-skeleton-line settings-skeleton-subtitle" />
          <div className="settings-skeleton-pills">
            <div className="settings-skeleton-pill" />
            <div className="settings-skeleton-pill" />
            <div className="settings-skeleton-pill" />
          </div>
        </div>

        <div className="settings-layout">
          <CardSkeleton count={1} variant="panel" className="settings-nav-skeleton" />
          <PageSkeleton variant="form" formFields={7} formColumns={2} />
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      {/* <div className="settings-hero app-surface">
        <div className="settings-hero-copy">
          <div className="settings-hero-kicker">
            <FaShieldAlt />
            <span>Admin only control plane</span>
          </div>

          <h1 className="settings-title">Settings Workspace</h1>
          <p className="settings-subtitle">
            Manage EMS HRMS configuration from one enterprise workspace.
            Settings modules render here without route changes or page refreshes.
          </p>
        </div>

        <div className="settings-hero-stats">
          <SettingsStatPill label="Total Modules" value={`${tabDefinitions.length}`} tone="info" />
          <SettingsStatPill label="Active Module" value={activeDefinition.label} tone="info" />
          <SettingsStatPill label="Last Updated" value={lastUpdatedDisplay} tone="info" />
          <SettingsStatPill label="Environment" value={environmentDisplay} tone="info" />
          <SettingsStatPill
            label="Unsaved Changes"
            value={hasUnsavedChanges ? `${dirtyTabs.length} pending` : "Synced"}
            tone={hasUnsavedChanges ? "warning" : "success"}
          />
          <SettingsStatPill
            label="Access Level"
            value="Admin"
            tone="info"
          />
        </div>
      </div> */}

      <div className="settings-layout">
        <aside className="settings-nav app-surface">
          <div className="settings-nav-head">
            <span className="settings-nav-eyebrow">Modules</span>
            <h2>Settings Navigation</h2>
            <p>Select the module you want to configure.</p>
          </div>

          <div className="settings-nav-list" role="tablist" aria-label="Settings tabs">
            {SETTINGS_GROUPS.map((group) => {
              const isExpanded = expandedGroup === group.key;

              return (
                <div key={group.key} className="settings-group">

                  <button
                    type="button"
                    className="settings-group-header"
                    onClick={() =>
                      setExpandedGroup(
                        isExpanded ? "" : group.key
                      )
                    }
                  >
                    <span>{group.title}</span>

                    <span>
                      {isExpanded ? "▼" : "▶"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="settings-group-body">

                      {group.tabs.map((tabKey) => {

                        const definition =
                          tabDefinitions.find(
                            (item) => item.key === tabKey
                          );

                        if (!definition) return null;

                        const Icon = definition.icon;

                        const section =
                          sections[definition.key];

                        const isActive =
                          activeTab === definition.key;

                        return (
                          <button
                            key={definition.key}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            className={`settings-sidebar-item settings-nav-item ${isActive ? "active" : ""
                              } ${section.loadError
                                ? "has-error"
                                : ""
                              }`.trim()}
                            onClick={() =>
                              setActiveTab(definition.key)
                            }
                          >
                            <span className="settings-sidebar-icon settings-nav-icon">
                              <Icon />
                            </span>

                            <span className="settings-nav-copy">
                              <strong>{definition.label}</strong>
                              <span>{definition.description}</span>
                            </span>

                            {section.loadError && (
                              <span
                                className="settings-nav-badge"
                                title="Loaded with warnings"
                              >
                                !
                              </span>
                            )}
                          </button>
                        );
                      })}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <section
          className="settings-content"
          style={{ marginTop: 0, paddingTop: 0 }}
        >
          <ActiveTabComponent
            values={activeSection.values}
            errors={activeSection.errors}
            onChange={handleFieldChange(activeDefinition.key)}
            onPolicyChange={handlePolicyChange}
            policyOptions={activeSection.values.__policyOptions || []}
            lastUpdated={activeSection.lastUpdated}
            loadError={activeSection.loadError}
            loading={currentSectionLoading}
            disabled={currentSectionSaving || currentSectionLoading}
          />

          {!activeDefinition.hideFooter && (
            <div className="settings-footer app-surface">
              <div className="settings-footer-copy">
                <strong>
                  {currentSectionDirty ? "Unsaved changes in this tab" : "No pending changes"}
                </strong>
                <span>
                  {currentSectionDirty
                    ? "Save before moving to another page or refreshing."
                    : "Your latest changes are already stored."}
                </span>
              </div>

              <div className="settings-footer-actions">
                <button
                  type="button"
                  className="app-button-ghost settings-reset-btn"
                  onClick={handleResetCurrentTab}
                  disabled={
                    !currentSectionDirty ||
                    currentSectionSaving ||
                    currentSectionLoading
                  }
                >
                  <FaRedo />
                  Reset
                </button>

                <button
                  type="button"
                  className="app-button-primary settings-save-btn"
                  onClick={handleSaveCurrentTab}
                  disabled={currentSectionSaving || currentSectionLoading}
                >
                  <FaSave />
                  {currentSectionSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default SettingsPage;
