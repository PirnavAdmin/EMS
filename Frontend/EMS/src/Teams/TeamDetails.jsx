import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { toastError, toastInfo, toastSuccess } from "@/components/common/toast/toastService";
import { useNavigate, useParams } from "react-router-dom";
import "./Teams.css";
import EmptyState from "../components/EmptyState";
import { CardSkeleton, TableSkeleton } from "../components/Skeletons";
import TeamMembersTable from "./TeamMembersTable";
import AddMembersModal from "./AddMembersModal";
import TeamRequestPanels from "./TeamRequestPanels";
import TeamChangeRequestPanel from "./TeamChangeRequestPanel";
import TeamReportingDays from "./TeamReportingDays";
import AssignTeamShiftModal from "./AssignTeamShiftModal";
import CreateShiftModal from "./CreateShiftModal";
import { ShiftChangeModal, ShiftSwapModal } from "./ShiftRequestModal";
import OverrideMemberModal from "./OverrideMemberModal";
import EditTeamModal from "./EditTeamModal";
import DeleteTeamModal from "./DeleteTeamModal";
import RemoveMemberModal from "./RemoveMemberModal";
import { BASE_URL } from "../api/config";
import { API_ENDPOINTS } from "../api/endpoints";
import {
  addTeamMembers,
  deleteTeam,
  getMyTeam,
  getTeamById,
  removeTeamMember,
  updateTeam,
  updateTeamMemberOverride,
  updateTeamReportingDays
} from "../services/teamService";
import {
  createHrmsSettingsRecord,
  deleteHrmsSettingsRecord,
  listHrmsSettings
} from "../services/hrmsSettingsService";
import {
  createShiftChangeRequest
} from "../services/ShiftRequestService";
import { getApiErrorMessage } from "../services/superAdminService";
import { createSwap } from "../services/shiftSwapApi";
import { getMyEmployeeFullDetail } from "../services/employeeService";
import { shiftModulesConfig } from "../Pages/Settings/hrmsSettingsConfig";
import {
  hasDeletePermission,
  hasAddPermission,
  hasEditPermission,
  hasRole,
  isAdmin,
  hasViewPermission
} from "../utils/authorization";
import { getAuthenticatedUserSnapshot, getStoredAuthValue, getStoredEmployeeId, getStoredUserId } from "../utils/authStorage";
import { TEAM_DAY_OPTIONS } from "./teamsData";
import {
  buildMemberOverridePayload,
  buildAddMembersPayload,
  buildUpdateReportingDaysPayload,
  buildUpdateTeamPayload,
  extractApiErrorMessage,
  firstNonEmpty,
  normalizeCollection,
  normalizeEmployeeRecord,
  normalizeReportingDays,
  resolveLoggedInEmployee,
  normalizeTeamRecord,
  toNumberId
} from "./teamUtils";

const normalizeLookupId = (value) => String(value ?? "").trim();
const teamIdOfMember = (member) => normalizeLookupId(member?.teamId ?? member?.team_Id ?? member?.teamID ?? member?.TeamId ?? member?.raw?.teamId ?? member?.raw?.team_Id);
const explicitEmployeeIdentifier = (record) => {
  const queue = record && typeof record === "object" && !Array.isArray(record) ? [record] : [];
  const seen = new Set();
  const identifiers = [];
  const nestedKeys = ["employee", "Employee", "employeeDetails", "EmployeeDetails", "employeeFullDetail", "EmployeeFullDetail", "profile", "data"];
  for (let index = 0; index < queue.length; index += 1) {
    const source = queue[index];
    if (!source || typeof source !== "object" || Array.isArray(source) || seen.has(source)) continue;
    seen.add(source);
    identifiers.push(source.employeeId, source.employee_Id, source.employeeID, source.EmployeeId, source.EmployeeID, source.Employee_Id);
    for (const key of nestedKeys) {
      const nested = source[key];
      if (nested && typeof nested === "object" && !Array.isArray(nested)) queue.push(nested);
    }
  }
  return firstNonEmpty(...identifiers);
};

const findMatchingTeamMember = (members = [], sourceMember = {}) => {
  const targetTeamMemberId = normalizeLookupId(
    sourceMember.teamMemberId ?? sourceMember.id
  );
  const targetEmployeeId = normalizeLookupId(sourceMember.employeeId ?? sourceMember.employeeCode);
  const targetUserId = normalizeLookupId(sourceMember.userId);
  const targetEmployeeFallbackId = normalizeLookupId(
    sourceMember.employee?.id ??
      sourceMember.employee?.employeeId ??
      sourceMember.employee?.userId
  );

  return (
    members.find((member) => {
      const memberTeamMemberId = normalizeLookupId(member.teamMemberId ?? member.id);
      const memberEmployeeId = normalizeLookupId(member.employeeId);
      const memberEmployeeCode = normalizeLookupId(member.employeeCode ?? member.EmployeeCode ?? member.employee_code ?? member.empCode ?? member.employee?.employeeCode ?? member.employee?.EmployeeCode);
      const memberUserId = normalizeLookupId(member.userId);
      const memberEmployeeFallbackId = normalizeLookupId(
        member.employee?.id ?? member.employee?.employeeId ?? member.employee?.userId
      );

      return (
        (targetTeamMemberId && memberTeamMemberId === targetTeamMemberId) ||
        (targetEmployeeId && memberEmployeeId === targetEmployeeId) ||
        (targetEmployeeId && memberEmployeeCode === targetEmployeeId) ||
        (targetUserId && memberUserId === targetUserId) ||
        (targetEmployeeFallbackId &&
          memberEmployeeFallbackId === targetEmployeeFallbackId)
      );
    }) || null
  );
};

const areDayListsEqual = (leftDays = [], rightDays = []) => {
  const left = normalizeReportingDays(leftDays)
    .sort((leftDay, rightDay) => TEAM_DAY_OPTIONS.indexOf(leftDay) - TEAM_DAY_OPTIONS.indexOf(rightDay))
    .join("|");
  const right = normalizeReportingDays(rightDays)
    .sort((leftDay, rightDay) => TEAM_DAY_OPTIONS.indexOf(leftDay) - TEAM_DAY_OPTIONS.indexOf(rightDay))
    .join("|");

  return left === right;
};

const logOverrideDebug = (...args) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

const normalizeShiftOption = (shift = {}) => ({
  shiftId: toNumberId(shift.shiftId ?? shift.shift_Id ?? shift.id),
  shiftName: String(shift.shiftName ?? shift.name ?? "").trim(),
  shiftCode: String(shift.shiftCode ?? shift.shift_Code ?? shift.code ?? "").trim(),
  startTime: String(shift.startTime ?? shift.start_Time ?? "").trim(),
  endTime: String(shift.endTime ?? shift.end_Time ?? "").trim(),
  isActive: shift.isActive ?? shift.IsActive
});

const normalizeTeamResponse = (payload) => {
  const candidates = [
    payload,
    payload?.team,
    payload?.Team,
    payload?.data,
    payload?.result,
    payload?.data?.team,
    payload?.data?.Team,
    payload?.data?.data,
    payload?.data?.result,
    ...normalizeCollection(payload)
  ].filter(Boolean);
  for (const candidate of candidates) {
    const normalized = normalizeTeamRecord(candidate);
    if (normalized && (normalized.teamId != null || normalized.members?.length)) return normalized;
  }
  return null;
};

function TeamDetails({ mode = "management" }) {
  const params = useParams();
  const navigate = useNavigate();
  const isMyTeamMode = mode === "my-team";
  const teamId = isMyTeamMode ? null : params.teamId;

  const [team, setTeam] = useState(() => {
    return null;
  });
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const employeeProfileLookupAttempted = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingReportingDays, setIsEditingReportingDays] = useState(false);
  const [draftReportingDays, setDraftReportingDays] = useState([...TEAM_DAY_OPTIONS]);
  const [overrideMember, setOverrideMember] = useState(null);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);
  const [isDeleteTeamOpen, setIsDeleteTeamOpen] = useState(false);
  const [removeMember, setRemoveMember] = useState(null);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [isSavingReportingDays, setIsSavingReportingDays] = useState(false);
  const [isAssignShiftOpen, setIsAssignShiftOpen] = useState(false);
  const [isCreateShiftOpen, setIsCreateShiftOpen] = useState(false);
  const [availableShifts, setAvailableShifts] = useState([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [isSavingShift, setIsSavingShift] = useState(false);
  const createShiftRequestInFlight = useRef(false);
  const [deletingShiftId, setDeletingShiftId] = useState(null);
  const deleteShiftRequestInFlight = useRef(false);
  const [shiftChangeMember, setShiftChangeMember] = useState(null);
  const [shiftSwapMember, setShiftSwapMember] = useState(null);
  const [shiftSwapMembers, setShiftSwapMembers] = useState([]);
  const [isLoadingSwapMembers, setIsLoadingSwapMembers] = useState(false);
  const [isLoadingEmployeeProfile, setIsLoadingEmployeeProfile] = useState(false);
  const [employeeProfileLoadError, setEmployeeProfileLoadError] = useState("");
  const [isSavingShiftRequest, setIsSavingShiftRequest] = useState(false);
  const [isSavingOverride, setIsSavingOverride] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [requestRefreshKey, setRequestRefreshKey] = useState(0);
  const [activeRequestView, setActiveRequestView] = useState(isMyTeamMode ? "swap" : "");
  const currentEmployeeId = normalizeLookupId(getStoredEmployeeId());
  const currentUserId = normalizeLookupId(getStoredUserId());
  const authSnapshot = getAuthenticatedUserSnapshot();
  const authUser = authSnapshot.user;
  const explicitEmployeeId = firstNonEmpty(
    authUser?.employeeId,
    authUser?.employee_Id,
    authUser?.employeeID,
    authUser?.EmployeeId,
    authUser?.Employee_Id,
    authUser?.employeeCode,
    authUser?.employee_code,
    authUser?.EmployeeCode,
    authSnapshot.payload?.employeeId,
    authSnapshot.payload?.employee_Id,
    authSnapshot.payload?.employeeID,
    authSnapshot.payload?.EmployeeId,
    authSnapshot.payload?.Employee_Id,
    authSnapshot.payload?.employeeCode,
    authSnapshot.payload?.employee_code,
    authSnapshot.payload?.EmployeeCode,
    getStoredAuthValue("employeeId"),
    getStoredAuthValue("employee_Id"),
    getStoredAuthValue("employeeCode"),
    getStoredAuthValue("EmployeeCode")
  );
  const currentEmployeeMember = useMemo(() => {
    const members = team?.members ?? [];
    const identity = {
      ...(authSnapshot.payload ?? {}),
      ...(authUser ?? {}),
      employeeId: explicitEmployeeId,
      userId: currentUserId || authUser?.userId || authUser?.user_Id,
      email: authUser?.email ?? authUser?.Email ?? authSnapshot.payload?.email,
      name: authUser?.name ?? authUser?.employeeName ?? authUser?.fullName ?? authUser?.displayName,
      profile: employeeProfile
    };

    if (!isMyTeamMode) return findMatchingTeamMember(members, { employeeId: currentEmployeeId, userId: currentUserId });
    const resolvedEmployee = resolveLoggedInEmployee(members, identity);
    if (resolvedEmployee) return resolvedEmployee;

    const authEmails = [
      authUser?.email, authUser?.Email, authUser?.employeeEmail, authUser?.userEmail,
      authSnapshot.payload?.email, authSnapshot.payload?.Email,
      employeeProfile?.email, employeeProfile?.Email, employeeProfile?.employeeEmail
    ].map((value) => normalizeLookupId(value).toLowerCase()).filter(Boolean);
    if (!authEmails.length) return null;
    return members.find((candidate) => [
      candidate?.email, candidate?.Email, candidate?.employeeEmail, candidate?.userEmail,
      candidate?.employee?.email, candidate?.employee?.employeeEmail,
      candidate?.raw?.email, candidate?.raw?.employee?.email
    ].some((value) => authEmails.includes(normalizeLookupId(value).toLowerCase()))) || null;
  }, [team?.members, isMyTeamMode, currentEmployeeId, currentUserId, explicitEmployeeId, authSnapshot.payload, authUser, employeeProfile]);
  const currentEmployeeCode = firstNonEmpty(
    currentEmployeeMember?.employeeCode,
    currentEmployeeMember?.EmployeeCode,
    currentEmployeeMember?.employee_code,
    currentEmployeeMember?.empCode,
    explicitEmployeeIdentifier(currentEmployeeMember?.raw),
    explicitEmployeeIdentifier(currentEmployeeMember?.employee),
    explicitEmployeeIdentifier(employeeProfile),
    explicitEmployeeIdentifier(authUser),
    explicitEmployeeIdentifier(authSnapshot.payload),
    currentEmployeeMember?.employeeId,
    currentEmployeeMember?.employee_Id,
    getStoredAuthValue("employeeId"),
    getStoredAuthValue("employee_Id"),
    getStoredAuthValue("employeeCode"),
    getStoredAuthValue("EmployeeCode")
  );
  const currentEmployeeRequestId = firstNonEmpty(
    currentEmployeeMember?.employeeId,
    currentEmployeeMember?.employee_Id,
    explicitEmployeeIdentifier(currentEmployeeMember?.raw),
    explicitEmployeeIdentifier(currentEmployeeMember?.employee),
    explicitEmployeeIdentifier(employeeProfile)
  );
  const canViewTeam = isMyTeamMode || hasViewPermission("Teams");
  const canEditTeam = !isMyTeamMode && hasEditPermission("Teams");
  const canDeleteTeam = !isMyTeamMode && hasDeletePermission("Teams");
  const isAdminUser = !isMyTeamMode && isAdmin();
  const canCreateShift = isAdminUser || hasAddPermission("Shift Master");
  const canDeleteShift = isAdminUser || (!isMyTeamMode && hasDeletePermission("Shift Master"));
  const canManageShiftRequests = !isMyTeamMode && (isAdminUser || hasRole("manager"));

  useEffect(() => {
    if (
      !isMyTeamMode ||
      !team?.members?.length ||
      (currentEmployeeMember && currentEmployeeRequestId) ||
      employeeProfileLookupAttempted.current
    ) return undefined;

    employeeProfileLookupAttempted.current = true;
    let cancelled = false;
    setIsLoadingEmployeeProfile(true);
    setEmployeeProfileLoadError("");
    getMyEmployeeFullDetail({ dedupe: false })
      .then((response) => {
        if (cancelled) return;
        const profileData = response?.data;
        const employeeRecord = profileData?.employee ?? profileData?.Employee ?? profileData?.employeeDetails ?? profileData?.EmployeeDetails ?? profileData?.employeeFullDetail ?? profileData?.EmployeeFullDetail ?? profileData?.data?.employee ?? profileData?.data?.Employee ?? profileData?.data?.employeeDetails ?? profileData?.data?.employeeFullDetail ?? profileData?.data?.data ?? profileData?.data ?? profileData;
        const normalizedEmployee = normalizeEmployeeRecord(employeeRecord);
        setEmployeeProfile(normalizedEmployee && typeof employeeRecord === "object" ? { ...employeeRecord, ...normalizedEmployee } : normalizedEmployee);
      })
      .catch((error) => {
        if (cancelled) return;
        const status = error?.response?.status;
        const message = status === 401
          ? "Your session has expired. Please log in again."
          : status === 403
            ? "You are not authorized to load your employee profile."
            : extractApiErrorMessage(error, "Unable to load your employee profile. Please try again.");
        setEmployeeProfileLoadError(message);
        toastError(message);
      })
      .finally(() => { if (!cancelled) setIsLoadingEmployeeProfile(false); });

    return () => {
      cancelled = true;
      employeeProfileLookupAttempted.current = false;
    };
  }, [isMyTeamMode, team?.members, currentEmployeeMember, currentEmployeeRequestId]);

  const fetchTeam = useCallback(
    async (
      signal,
      {
        cacheTTL = 60 * 1000,
        showError = true,
        throwOnError = false,
        setLoading = true,
        clearOnError = true
      } = {}
    ) => {
      try {
        if (setLoading) {
          setIsLoading(true);
        }

        const res = isMyTeamMode
          ? await getMyTeam({
              signal,
              cacheTTL
            })
          : await getTeamById(teamId, {
              signal,
              cacheTTL
            });

        const normalizedTeam = normalizeTeamRecord(res.data);

        setTeam(normalizedTeam);
        setDraftReportingDays(
          normalizedTeam?.reportingDays?.length
            ? [...normalizedTeam.reportingDays]
            : [...TEAM_DAY_OPTIONS]
        );

        return normalizedTeam;
      } catch (error) {
        if (error?.code === "ERR_CANCELED") {
          return null;
        }

        if (clearOnError) {
          setTeam(null);
        }

        if (showError && error?.response?.status !== 404) {
          toastError(extractApiErrorMessage(error, "Unable to load team"));
        }

        if (throwOnError) {
          throw error;
        }

        return null;
      } finally {
        if (setLoading) {
          setIsLoading(false);
        }
      }
    },
    [isMyTeamMode, teamId]
  );

  useEffect(() => {
    if (!canViewTeam) {
      return undefined;
    }

    const controller = new AbortController();
    void fetchTeam(controller.signal).catch(() => {});

    return () => controller.abort();
  }, [canViewTeam, fetchTeam]);

  useEffect(() => {
    if (!team) {
      return;
    }

    setDraftReportingDays(
      team.reportingDays?.length ? [...team.reportingDays] : [...TEAM_DAY_OPTIONS]
    );
  }, [team]);

  const summary = useMemo(() => {
    if (!team) {
      return null;
    }

    return {
      totalMembers: team.memberCount || team.members?.length || 0,
      reportingDays: team.reportingDays || TEAM_DAY_OPTIONS
    };
  }, [team]);

  const refreshTeam = useCallback(async () => {
    return fetchTeam(undefined, {
      cacheTTL: 0,
      showError: false,
      throwOnError: true,
      setLoading: false,
      clearOnError: false
    });
  }, [fetchTeam]);

  const handleToggleReportingDay = (day) => {
    setDraftReportingDays((current) => {
      const isSelected = current.includes(day);
      return isSelected ? current.filter((item) => item !== day) : [...current, day];
    });
  };

  const handleSaveReportingDays = async () => {
    if (draftReportingDays.length === 0) {
      toastError("Select at least one reporting day");
      return;
    }

    setIsSavingReportingDays(true);

    try {
      await updateTeamReportingDays(
        buildUpdateReportingDaysPayload(team.teamId, draftReportingDays)
      );
      toastSuccess("Reporting days updated");
      setIsEditingReportingDays(false);
      await refreshTeam().catch(() => {});
    } catch (error) {
      toastError(extractApiErrorMessage(error, "Unable to update reporting days"));
    } finally {
      setIsSavingReportingDays(false);
    }
  };

  const handleOpenOverride = async (member) => {
    setOverrideMember(member);
    setIsOverrideOpen(true);
    setIsLoadingShifts(true);
    try {
      await loadActiveShifts();
    } catch (error) {
      toastError(extractApiErrorMessage(error, "Unable to load active shifts"));
    } finally {
      setIsLoadingShifts(false);
    }
  };

  const handleOpenAssignShift = async () => {
    setIsAssignShiftOpen(true);
    setIsLoadingShifts(true);

    try {
      await loadActiveShifts();
    } catch (error) {
      setAvailableShifts([]);
      toastError(extractApiErrorMessage(error, "Unable to load active shifts"));
    } finally {
      setIsLoadingShifts(false);
    }
  };

  const handleAssignShift = async (shiftId) => {
    if (!team || !shiftId) return;

    setIsSavingShift(true);

    try {
      await updateTeam(
        buildUpdateTeamPayload({
          teamId: team.teamId,
          teamNumber: team.teamNumber,
          teamName: team.teamName,
          projectId: team.projectId,
          reportingManagerId: team.reportingManagerId,
          engagementType: team.engagementType,
          reportingDays: team.reportingDays,
          shiftId,
          employeeIds: (team.members || []).map((member) => member.employeeId).filter(Boolean)
        })
      );
      toastSuccess("Team shift assigned");
      setIsAssignShiftOpen(false);
      await refreshTeam();
    } catch (error) {
      toastError(extractApiErrorMessage(error, "Unable to assign team shift"));
    } finally {
      setIsSavingShift(false);
    }
  };

  const handleCreateShift = async (shift) => {
    if (createShiftRequestInFlight.current) return false;
    createShiftRequestInFlight.current = true;
    setIsSavingShift(true);
    try {
      await createHrmsSettingsRecord(shiftModulesConfig.shiftMaster, {
        ...shift,
      });
      toastSuccess("Shift created successfully.");
      setIsCreateShiftOpen(false);
      try {
        await loadActiveShifts();
      } catch (refreshError) {
        toastError(extractApiErrorMessage(refreshError, "Shift was created, but the shift list could not be refreshed"));
      }
      return true;
    } catch (error) {
      toastError(extractApiErrorMessage(error, "Unable to create shift"));
      return false;
    } finally {
      createShiftRequestInFlight.current = false;
      setIsSavingShift(false);
    }
  };

  const handleDeleteShift = async (shift) => {
    const shiftId = shift?.shiftId;
    if (shiftId == null || deleteShiftRequestInFlight.current) return false;

    deleteShiftRequestInFlight.current = true;
    setDeletingShiftId(String(shiftId));
    setIsSavingShift(true);
    try {
      const deleteResponse = await deleteHrmsSettingsRecord(shiftModulesConfig.shiftMaster, shiftId);
      let refreshedShifts;
      try {
        refreshedShifts = await loadActiveShifts();
      } catch (refreshError) {
        if (import.meta.env.DEV) {
          console.error("Shift DELETE succeeded but fresh GET /Shift failed", {
            shiftId,
            deleteStatus: deleteResponse?.status,
            deleteResponse: deleteResponse?.data,
            refreshError
          });
        }
        toastError(extractApiErrorMessage(refreshError, "Unable to verify the shift deletion against the refreshed shift list"));
        return false;
      }

      const stillAssignable = refreshedShifts.some((item) => String(item.shiftId) === String(shiftId));
      if (stillAssignable) {
        if (import.meta.env.DEV) {
          console.error("Shift DELETE returned success but fresh GET /Shift still contains the active shift", {
            shiftId,
            deleteStatus: deleteResponse?.status,
            deleteResponse: deleteResponse?.data,
            refreshedShift: refreshedShifts.find((item) => String(item.shiftId) === String(shiftId))
          });
        }
        toastError("The delete request succeeded, but a fresh GET /Shift still returns this active shift. Check the backend delete persistence and active-shift filtering.");
        return false;
      }

      toastSuccess("Shift deleted successfully.");
      try {
        await refreshTeam();
      } catch (refreshError) {
        toastError(extractApiErrorMessage(refreshError, "Shift was deleted, but the team details could not be refreshed"));
      }
      return true;
    } catch (error) {
      toastError(extractApiErrorMessage(error, "Unable to delete shift"));
      return false;
    } finally {
      deleteShiftRequestInFlight.current = false;
      setDeletingShiftId(null);
      setIsSavingShift(false);
    }
  };

  const loadActiveShifts = async () => {
    const shifts = await listHrmsSettings(shiftModulesConfig.shiftMaster, {}, { cacheTTL: 0 });
    const normalizedShifts = shifts
      .map(normalizeShiftOption)
      .filter((shift) => shift.shiftId != null && shift.isActive !== false);
    setAvailableShifts(normalizedShifts);
    return normalizedShifts;
  };

  const handleOpenShiftChange = async (member = currentEmployeeMember) => {
    if (isMyTeamMode && (!currentEmployeeMember || member !== currentEmployeeMember)) return;
    if (!currentEmployeeCode) {
      toastError("Unable to identify the signed-in employee");
      return;
    }
    const modalMember = isMyTeamMode ? currentEmployeeMember : member;
    if (!modalMember) {
      toastError("Unable to identify the signed-in employee");
      return;
    }
    setShiftChangeMember(modalMember);
    setIsLoadingShifts(true);
    try {
      await loadActiveShifts();
    } catch (error) {
      toastError(extractApiErrorMessage(error, "Unable to load active shifts"));
    } finally {
      setIsLoadingShifts(false);
    }
  };

  const handleOpenShiftSwap = async (member) => {
    if (isMyTeamMode && currentEmployeeMember && member !== currentEmployeeMember) return;
    const modalMember = isMyTeamMode ? currentEmployeeMember || member : member;
    if (!modalMember) return;
    setShiftSwapMember(modalMember);
    setShiftSwapMembers([]);
    setIsLoadingSwapMembers(true);
    setIsLoadingShifts(true);
    const rosterRequest = (async () => {
      const currentTeamId = team?.teamId ?? team?.id;
      if (currentTeamId == null) return team?.members ?? [];
      try {
        const response = await getTeamById(currentTeamId, { cacheTTL: 0, dedupe: false });
        const detailedTeam = normalizeTeamResponse(response?.data);
        return detailedTeam?.members?.length ? detailedTeam.members : team?.members ?? [];
      } catch {
        return team?.members ?? [];
      }
    })();
    const [rosterResult, shiftsResult] = await Promise.allSettled([rosterRequest, loadActiveShifts()]);
    const roster = rosterResult.status === "fulfilled" && Array.isArray(rosterResult.value) ? rosterResult.value : team?.members ?? [];
    setShiftSwapMembers(roster);
    if (roster.length <= 1 && team?.members?.length > roster.length) setShiftSwapMembers(team.members);
    if (shiftsResult.status === "rejected") toastError(extractApiErrorMessage(shiftsResult.reason, "Unable to load shift information"));
    setIsLoadingSwapMembers(false);
    setIsLoadingShifts(false);
  };

  const handleSubmitShiftChange = async (form) => {
    if (!shiftChangeMember) return;
    const employeeId = isMyTeamMode
      ? currentEmployeeCode
      : normalizeLookupId(
          shiftChangeMember.employeeId ?? shiftChangeMember.employee_Id ?? shiftChangeMember.id
        );
    const requesterShiftMember = isMyTeamMode ? currentEmployeeMember : shiftChangeMember;
    if (!requesterShiftMember) {
      throw new Error("Request could not be created because the requesting employee could not be identified.");
    }
    const rawCurrentShiftId = requesterShiftMember.currentShiftId ?? requesterShiftMember.shiftId ?? requesterShiftMember.currentShift?.shiftId ?? requesterShiftMember.shift?.shiftId;
    const rawCurrentShiftName = (typeof requesterShiftMember.currentShift === "string" ? requesterShiftMember.currentShift : requesterShiftMember.currentShift?.shiftName)
      ?? (typeof requesterShiftMember.shift === "string" ? requesterShiftMember.shift : requesterShiftMember.shift?.shiftName)
      ?? requesterShiftMember.currentShiftName ?? requesterShiftMember.shiftName;
    const currentShiftFromMaster = availableShifts.find((shift) => String(shift.shiftId) === String(rawCurrentShiftId))
      ?? availableShifts.find((shift) => String(shift.shiftName ?? "").toLowerCase().replace(/[^a-z]/g, "") === String(rawCurrentShiftName ?? "").toLowerCase().replace(/[^a-z]/g, ""));
    const currentShiftId = toNumberId(rawCurrentShiftId ?? currentShiftFromMaster?.shiftId ?? team?.shiftId);
    const requestedShiftId = toNumberId(form.requestedShiftId);

    if (!employeeId || !currentShiftId || !requestedShiftId || currentShiftId === requestedShiftId || !form.effectiveFrom || (!form.isPermanent && !form.effectiveTo)) {
      throw new Error("Complete the dates and choose a new shift before submitting.");
    }
    if (!form.isPermanent && form.effectiveTo < form.effectiveFrom) {
      throw new Error("To date must be on or after the from date.");
    }
    const payload = {
      employeeId,
      currentShiftId,
      requestedShiftId,
      effectiveFrom: form.effectiveFrom,
        effectiveTo: form.isPermanent ? null : form.effectiveTo,
        isPermanent: Boolean(form.isPermanent),
        reason: String(form.reason ?? "").trim()
    };

    setIsSavingShiftRequest(true);
    try {
      // ShiftChangeRequest is the existing admin-approval workflow; the backend applies the shift after approval.
      if (import.meta.env.DEV) console.debug("POST /api/ShiftChangeRequest payload:", payload);
      await createShiftChangeRequest(payload);
      toastSuccess("Shift change request submitted successfully");
        if (isMyTeamMode) setActiveRequestView("change");
        setRequestRefreshKey((value) => value + 1);
        await refreshTeam().catch(() => {});
        setShiftChangeMember(null);
        return { ok: true };
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to submit shift change request.");
      if (error?.response?.status === 409 || /already exists|already decided/i.test(message)) {
        setRequestRefreshKey((value) => value + 1);
        toastInfo("Your shift change request status was refreshed.");
        return { synchronized: true };
      }
      throw error;
    } finally {
      setIsSavingShiftRequest(false);
    }
  };

  const handleSubmitShiftSwap = async (form) => {
    if (!shiftSwapMember) return;
    const targetEmployeeId = String(form.toEmployeeId ?? "").trim();
    const fromEmployeeId = isMyTeamMode
      ? currentEmployeeRequestId
      : normalizeLookupId(
          shiftSwapMember.employeeId ?? shiftSwapMember.employee_Id
        );

    if (!fromEmployeeId || !currentEmployeeMember) {
      throw new Error("Unable to identify the logged-in employee.");
    }
    const swapRoster = [...shiftSwapMembers, ...(team?.members ?? [])];
    const targetMember = swapRoster.find((candidate) => [candidate?.employeeId, candidate?.employee_Id, candidate?.employee?.employeeId, candidate?.employee?.employee_Id, candidate?.raw?.employeeId, candidate?.raw?.employee_Id].some((value) => normalizeLookupId(value) === targetEmployeeId));
    if (!targetEmployeeId || !targetMember) throw new Error("The selected employee could not be found.");
    if (fromEmployeeId.toLowerCase() === targetEmployeeId.toLowerCase()) throw new Error("You cannot request a shift swap with yourself.");
    const requesterTeamId = teamIdOfMember(currentEmployeeMember) || normalizeLookupId(team?.teamId ?? team?.id);
    const targetTeamId = teamIdOfMember(targetMember);
    if (!requesterTeamId || !targetTeamId || requesterTeamId !== targetTeamId) {
      throw new Error("Shift swap is allowed only between employees in the same team.");
    }
    if (!form.shiftDate || !form.shiftId) throw new Error("Choose a requested shift and date before submitting.");

    setIsSavingShiftRequest(true);
    try {
      // The existing ShiftSwap API owns technology compatibility and approval-stage validation; no frontend rule/API is defined here.
      await createSwap({
        fromEmployeeId,
        toEmployeeId: targetEmployeeId,
        shiftDate: form.shiftDate,
        shiftId: toNumberId(form.shiftId),
        reason: String(form.reason ?? "").trim() || null
      });
      toastSuccess("Shift swap request submitted successfully");
      setShiftSwapMember(null);
      if (isMyTeamMode) setActiveRequestView("swap");
      setRequestRefreshKey((value) => value + 1);
      await refreshTeam().catch(() => {});
    } finally {
      setIsSavingShiftRequest(false);
    }
  };

  const handleEditTeam = () => {
    setIsEditTeamOpen(true);
  };

  const handleDeleteTeam = () => {
    setIsDeleteTeamOpen(true);
  };

  const handleRemoveMember = (member) => {
    setRemoveMember(member);
  };

  const handleSaveOverride = async (form) => {
    if (!team || !overrideMember) {
      return null;
    }

    setIsSavingOverride(true);

    try {
      const payload = buildMemberOverridePayload(team.teamId, overrideMember, form);
      const overrideApiUrl = `${BASE_URL}${API_ENDPOINTS.team.memberOverride}`;

      logOverrideDebug("OVERRIDE MEMBER ID:", {
        teamId: payload.teamId,
        teamMemberId: payload.teamMemberId,
        employeeId: payload.employeeId,
        userId: overrideMember.userId ?? overrideMember.employee?.userId ?? ""
      });
      logOverrideDebug("OVERRIDE API URL:", overrideApiUrl);
      logOverrideDebug("OVERRIDE API METHOD:", "PUT");
      logOverrideDebug("OVERRIDE PAYLOAD:", payload);
      logOverrideDebug("SENT CUSTOM DAYS:", payload.reportingDays ?? []);
      logOverrideDebug("SENT FLAG:", payload.customReportingDays);
      logOverrideDebug(
        "SENT PROJECT OVERRIDE:",
        payload.differentProject
          ? {
              projectId: payload.projectId
            }
          : null
      );

      const saveResponse = await updateTeamMemberOverride(payload);
      logOverrideDebug("OVERRIDE API RESPONSE:", saveResponse?.data ?? saveResponse);

      const refreshedTeam = await refreshTeam();
      logOverrideDebug("OVERRIDE REFETCH RESPONSE:", refreshedTeam?.raw ?? refreshedTeam);
      const refreshedMember = findMatchingTeamMember(
        refreshedTeam?.members || [],
        overrideMember
      );

      if (!refreshedMember) {
        throw new Error(
          "The override was saved, but the refreshed team data did not include the selected member."
        );
      }

      const mismatches = [];
      if (
        form.customShift &&
        toNumberId(refreshedMember.shiftId ?? refreshedMember.shift?.shiftId) !==
          toNumberId(form.overrideShiftId)
      ) {
        mismatches.push("custom shift");
      }
      const selectedProjectId = toNumberId(form.projectId);
      const selectedReportingDays = normalizeReportingDays(form.reportingDays);
      const returnedProjectId = toNumberId(
        refreshedMember.overrideProjectId ?? refreshedMember.projectId
      );
      const returnedReportingDays = normalizeReportingDays(
        refreshedMember.overrideReportingDays?.length > 0
          ? refreshedMember.overrideReportingDays
          : refreshedMember.wfoDays
      );
      const returnedCustomDaysFlag = refreshedMember.customReportingDays === true;

      if (form.differentProject) {
        if (selectedProjectId == null) {
          mismatches.push("selected project");
        } else if (returnedProjectId !== selectedProjectId) {
          mismatches.push("selected project");
        }

        if (
          refreshedMember.differentProject !== true &&
          refreshedMember.isCrossMapped !== true
        ) {
          mismatches.push("cross-team flag");
        }
      }

      if (form.customReportingDays) {
        if (returnedCustomDaysFlag !== true) {
          mismatches.push("custom reporting days flag");
        }

        if (!areDayListsEqual(returnedReportingDays, selectedReportingDays)) {
          mismatches.push("custom reporting days");
        }
      }

      logOverrideDebug("RETURNED CUSTOM DAYS:", returnedReportingDays);
      logOverrideDebug("RETURNED FLAG:", returnedCustomDaysFlag);
      logOverrideDebug("OVERRIDE COMPARISON:", {
        sentProjectId: selectedProjectId,
        returnedProjectId,
        sentCustomDays: selectedReportingDays,
        returnedCustomDays: returnedReportingDays,
        sentFlag: Boolean(form.customReportingDays),
        returnedFlag: returnedCustomDaysFlag,
        sentEmployeeId: payload.employeeId,
        returnedEmployeeId: refreshedMember.employeeId,
        returnedUserId: refreshedMember.userId
      });

      if (mismatches.length > 0) {
        throw new Error(
          `The override was not persisted for ${mismatches.join(" and ")}.`
        );
      }

      toastSuccess("Member override saved");
      return refreshedMember;
    } catch (error) {
      toastError(extractApiErrorMessage(error, "Unable to save member override"));
      throw error;
    } finally {
      setIsSavingOverride(false);
    }
  };

  const handleSaveTeam = async (form) => {
    if (!team) {
      return;
    }

    setIsSavingTeam(true);

    try {
      await updateTeam(
        buildUpdateTeamPayload({
          teamId: team.teamId,
          teamNumber: team.teamNumber,
          teamName: form.teamName,
          projectId: form.projectId ?? team.projectId,
          reportingManagerId: form.reportingManagerId ?? team.reportingManagerId,
          engagementType: form.engagementType ?? team.engagementType,
          reportingDays: form.reportingDays ?? team.reportingDays,
          shiftId: team.shiftId,
          employeeIds:
            form.employeeIds ??
            (team.members || [])
              .map((member) => member.employeeId)
              .filter(Boolean)
        })
      );

      toastSuccess("Team updated successfully");
      setIsEditTeamOpen(false);
      await refreshTeam().catch(() => {});
    } catch (error) {
      toastError(extractApiErrorMessage(error, "Unable to update team"));
    } finally {
      setIsSavingTeam(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!team) {
      return;
    }

    setIsDeletingTeam(true);

    try {
      await deleteTeam(team.teamId);
      toastSuccess("Team deleted");
      navigate("/teams");
    } catch (error) {
      toastError(extractApiErrorMessage(error, "Unable to delete team"));
    } finally {
      setIsDeletingTeam(false);
    }
  };

  const handleAddMembers = async (employeeIds = []) => {
    if (!team?.teamId || employeeIds.length === 0) {
      toastError("Select an employee to add");
      return;
    }

    setIsAddingMembers(true);
    try {
      await addTeamMembers(buildAddMembersPayload(team.teamId, employeeIds));
      const employeeLabel = employeeIds.length === 1 ? employeeIds[0] : `${employeeIds.length} employees`;
      toastSuccess(`${employeeLabel} added to ${team.teamName || "the"} team`);
      setIsAddMembersOpen(false);
      await refreshTeam();
    } catch (error) {
      toastError(extractApiErrorMessage(error, "Unable to add team member"));
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!team || !removeMember) {
      return;
    }

    setIsRemovingMember(true);

    try {
      await removeTeamMember(team.teamId, removeMember.employeeId);
      toastSuccess("Member removed");
      setRemoveMember(null);
      await refreshTeam().catch(() => {});
    } catch (error) {
      toastError(extractApiErrorMessage(error, "Unable to remove member"));
    } finally {
      setIsRemovingMember(false);
    }
  };

  const backButtonLabel = isMyTeamMode ? "Back to Dashboard" : "Back to Teams";
  const backButtonTarget = isMyTeamMode ? "/dashboard" : "/teams";

  if (isLoading) {
    return (
      <div className="teams-page">
        <div className="teams-details-back-row">
          <div className="teams-skeleton-back-button" />
        </div>

        <div className="teams-details-grid">
          <CardSkeleton count={2} variant="panel" />
          <CardSkeleton count={1} variant="panel" />
        </div>

        <CardSkeleton count={1} variant="panel" />
        <TableSkeleton
          rows={4}
          columns={[
            { width: "minmax(220px, 1.5fr)", headerWidth: "72%" },
            { width: "120px", headerWidth: "64%" },
            { width: "minmax(220px, 1.35fr)", headerWidth: "72%" },
            { width: "160px", type: "stacked", headerWidth: "64%" },
            { width: "160px", type: "stacked", headerWidth: "64%" },
            { width: "140px", type: "actions", headerWidth: "54%" }
          ]}
        />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="teams-page">
        <button
          type="button"
          className="teams-back-btn"
          onClick={() => navigate(backButtonTarget)}
        >
          <FaArrowLeft />
          {backButtonLabel}
        </button>

        <EmptyState
          className="teams-empty-state teams-detail-empty"
          message={
            isMyTeamMode
              ? "You are not assigned to a team yet."
              : "Team not found."
          }
        />
      </div>
    );
  }

  return (
    <div className="teams-page">
      <button
        type="button"
        className="teams-back-btn"
        onClick={() => navigate(backButtonTarget)}
      >
        <FaArrowLeft />
        {backButtonLabel}
      </button>

      <div className="teams-details-grid">
        <section className="teams-summary-card">
          <div className="teams-summary-header">
            <div>
              <span className="teams-section-kicker">Team Summary</span>

              <h2>{team.teamName || "Team"}</h2>

              <p>Members, project alignment and reporting setup.</p>
            </div>

            {canEditTeam && (
              <div className="team-summary-actions">
                <button
                  type="button"
                  className="team-action-btn secondary"
                  onClick={handleEditTeam}
                >
                  Edit Team
                </button>

                {canDeleteTeam && (
                  <button
                    type="button"
                    className="team-action-btn danger"
                    onClick={handleDeleteTeam}
                  >
                    Delete Team
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="teams-summary-list">
            <div className="teams-summary-row">
              <span className="teams-summary-label">Team ID</span>
              <strong className="teams-summary-value">
                {team.teamId ?? team.id ?? "-"}
              </strong>
            </div>

            <div className="teams-summary-row">
              <span className="teams-summary-label">Team Number</span>
              <strong className="teams-summary-value">{team.teamNumber || "-"}</strong>
            </div>

            <div className="teams-summary-row">
              <span className="teams-summary-label">Reporting Manager</span>
              <strong className="teams-summary-value">
                {team.reportingManagerName || team.reportingManager || "-"}
              </strong>
            </div>

            <div className="teams-summary-row">
              <span className="teams-summary-label">Project Name</span>
              <strong className="teams-summary-value">{team.projectName || "-"}</strong>
            </div>

            <div className="teams-summary-row">
              <span className="teams-summary-label">Engagement Type</span>
              <strong className="teams-summary-value">
                {team.engagementType || "-"}
              </strong>
            </div>

            <div className="teams-summary-row">
              <span className="teams-summary-label">Total Members</span>
              <strong className="teams-summary-value">
                {summary?.totalMembers || 0}
              </strong>
            </div>
          </div>
        </section>

        {isMyTeamMode ? (
          <>
            <TeamRequestPanels
              currentEmployeeId={currentEmployeeCode}
              refreshKey={requestRefreshKey}
              members={team?.members ?? []}
              onRequestUpdated={() => refreshTeam().catch(() => {})}
              onRequestViewChange={setActiveRequestView}
              activeRequestView={activeRequestView}
            />

          </>
        ) : <TeamChangeRequestPanel
          team={team}
          approverId={currentEmployeeId}
          canManage={canManageShiftRequests}
          onRequestUpdated={() => refreshTeam().catch(() => {})}
        />}
      </div>

      {!isMyTeamMode && <TeamReportingDays
        teamName={team.teamName}
        days={summary?.reportingDays || TEAM_DAY_OPTIONS}
        draftDays={draftReportingDays}
        isEditing={isEditingReportingDays}
        saving={isSavingReportingDays}
        canManage={canEditTeam}
        onEdit={() => setIsEditingReportingDays(true)}
        onCancel={() => {
          setDraftReportingDays(team.reportingDays || [...TEAM_DAY_OPTIONS]);
          setIsEditingReportingDays(false);
        }}
        onSave={handleSaveReportingDays}
        onToggleDay={handleToggleReportingDay}
        shift={team.shift}
        onAssignShift={handleOpenAssignShift}
        onCreateShift={() => setIsCreateShiftOpen(true)}
        canCreateShift={canCreateShift}
      />}

      <TeamMembersTable
        members={team.members || []}
        teamData={team}
        reportingDays={team.reportingDays || TEAM_DAY_OPTIONS}
        isAdmin={isAdminUser}
        canAddMember={canEditTeam || isAdminUser}
        onAddMember={() => setIsAddMembersOpen(true)}
        selfServiceShiftActions={isMyTeamMode}
        currentEmployeeMember={currentEmployeeMember}
        authenticatedEmployeeId={currentEmployeeCode}
        authenticatedIds={[currentEmployeeId, currentEmployeeCode, currentUserId]}
        onOverride={handleOpenOverride}
        onRemove={handleRemoveMember}
        onRequestChange={handleOpenShiftChange}
        onSwapShift={handleOpenShiftSwap}
      />

      {shiftChangeMember && (
        <ShiftChangeModal
          member={shiftChangeMember}
          requester={currentEmployeeMember}
          members={team?.members ?? []}
          shifts={availableShifts}
          selfServiceMode={isMyTeamMode}
          saving={isSavingShiftRequest}
          onClose={() => setShiftChangeMember(null)}
          onSubmit={handleSubmitShiftChange}
        />
      )}

      {shiftSwapMember && (
        <ShiftSwapModal
          member={shiftSwapMember}
          requester={currentEmployeeMember}
          members={shiftSwapMembers.length ? shiftSwapMembers : team?.members ?? []}
          shifts={availableShifts}
          teamId={team?.teamId ?? team?.id}
          saving={isSavingShiftRequest}
          loadingShifts={isLoadingShifts}
          loadingEmployeeInfo={isLoadingEmployeeProfile}
          loadingTeamMembers={isLoadingSwapMembers}
          employeeInfoError={employeeProfileLoadError}
          onClose={() => setShiftSwapMember(null)}
          onSubmit={handleSubmitShiftSwap}
        />
      )}

      {isAssignShiftOpen && (
        <AssignTeamShiftModal
          open
          shifts={availableShifts}
          assignedShiftId={team.shiftId}
          loading={isLoadingShifts}
          saving={isSavingShift}
          canDeleteShift={canDeleteShift}
          deletingShiftId={deletingShiftId}
          onClose={() => setIsAssignShiftOpen(false)}
          onSave={handleAssignShift}
          onDeleteShift={handleDeleteShift}
        />
      )}

      {isCreateShiftOpen && <CreateShiftModal
        open={isCreateShiftOpen}
        saving={isSavingShift}
        onClose={() => {
          if (!createShiftRequestInFlight.current) setIsCreateShiftOpen(false);
        }}
        onCreate={handleCreateShift}
      />}

      <AddMembersModal
        open={isAddMembersOpen}
        team={team}
        onClose={() => setIsAddMembersOpen(false)}
        onSave={handleAddMembers}
        saving={isAddingMembers}
        singleSelect
      />

      <OverrideMemberModal
        open={isOverrideOpen}
        member={overrideMember}
        shifts={availableShifts}
        loadingShifts={isLoadingShifts}
        teamProjectName={team.projectName}
        onClose={() => {
          setIsOverrideOpen(false);
          setOverrideMember(null);
        }}
        onSave={handleSaveOverride}
        saving={isSavingOverride}
      />

      <EditTeamModal
        open={isEditTeamOpen}
        team={team}
        onClose={() => setIsEditTeamOpen(false)}
        onSave={handleSaveTeam}
        saving={isSavingTeam}
      />

      <DeleteTeamModal
        open={isDeleteTeamOpen}
        team={team}
        onClose={() => setIsDeleteTeamOpen(false)}
        onDelete={handleDeleteConfirm}
        saving={isDeletingTeam}
      />

      <RemoveMemberModal
        open={!!removeMember}
        member={removeMember}
        onClose={() => setRemoveMember(null)}
        onRemove={handleConfirmRemoveMember}
        saving={isRemovingMember}
      />
    </div>
  );
}

export default TeamDetails;
