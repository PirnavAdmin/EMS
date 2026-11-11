import React, { useEffect, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { toastError, toastSuccess } from "@/components/common/Toast/toastService";
import { getTeamById, getTeams, updateTeamWeeklyOff } from "../services/teamService";
import { notifyTeamDataChanged } from "./teamDataSync";
import { normalizeCollection, normalizeTeamRecord, extractApiErrorMessage } from "./teamUtils";
import { WEEKLY_OFF_DAY_OPTIONS } from "./weeklyOffDays";

const getTeamId = (team) => String(team?.teamId ?? team?.id ?? "").trim();

function AssignWeekendsModal({
  open,
  initialTeamId = "",
  fixedTeamId = "",
  onClose,
  onSaved
}) {
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [weeklyOffDays, setWeeklyOffDays] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const saveInFlight = useRef(false);

  useEffect(() => {
    if (!open) return undefined;

    const controller = new AbortController();
    setTeams([]);
    setSelectedTeamId("");
    setWeeklyOffDays([]);
    setLoadError("");
    setSaveError("");
    setLoadingTeams(true);

    const fixedId = String(fixedTeamId || "").trim();
    const teamsRequest = fixedId
      ? getTeamById(fixedId, { signal: controller.signal, cacheTTL: 0 })
      : getTeams({ signal: controller.signal, cacheTTL: 0, dedupe: false });

    teamsRequest
      .then((response) => {
        if (controller.signal.aborted) return;
        const availableTeams = fixedId
          ? [normalizeTeamRecord(response.data)].filter(
              (team) => team && getTeamId(team) === fixedId
            )
          : normalizeCollection(response.data)
              .map((item) => normalizeTeamRecord(item))
              .filter((team) => team && getTeamId(team));
        setTeams(availableTeams);
        const preferredId = fixedId || String(initialTeamId || "").trim();
        setSelectedTeamId(
          availableTeams.some((team) => getTeamId(team) === preferredId)
            ? preferredId
            : ""
        );
        if (fixedId && availableTeams.length === 0) {
          setLoadError("Unable to load the selected team's weekly off days.");
        }
      })
      .catch((error) => {
        if (error?.code === "ERR_CANCELED") return;
        setLoadError(
          extractApiErrorMessage(
            error,
            fixedId
              ? "Unable to load the selected team's weekly off days."
              : "Unable to load teams."
          )
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingTeams(false);
      });

    return () => controller.abort();
  }, [fixedTeamId, initialTeamId, loadAttempt, open]);

  useEffect(() => {
    const selectedTeam = teams.find((team) => getTeamId(team) === selectedTeamId);
    setWeeklyOffDays(selectedTeam?.weeklyOffDays ?? []);
    setSaveError("");
  }, [selectedTeamId, teams]);

  const handleToggleDay = (day) => {
    setWeeklyOffDays((current) =>
      current.includes(day)
        ? current.filter((selectedDay) => selectedDay !== day)
        : [...current, day]
    );
    setSaveError("");
  };

  const handleSave = async () => {
    if (saveInFlight.current || saving) return;
    const targetTeamId = String(fixedTeamId || selectedTeamId).trim();
    if (!targetTeamId) {
      setSaveError("Select a team before saving weekly off days.");
      return;
    }

    const teamId = Number(targetTeamId);
    if (!Number.isInteger(teamId) || teamId <= 0) {
      setSaveError("The selected team has an invalid team ID.");
      return;
    }

    saveInFlight.current = true;
    setSaving(true);
    setSaveError("");

    try {
      const savedWeeklyOffDays = [...weeklyOffDays];
      await updateTeamWeeklyOff({ teamId, weeklyOffDays: savedWeeklyOffDays });
      notifyTeamDataChanged({
        teamId,
        reason: "weekly-off-updated",
        weeklyOffDays: savedWeeklyOffDays
      });
      toastSuccess("Weekly off days saved successfully.");
      try {
        const response = fixedTeamId
          ? await getTeamById(teamId, { cacheTTL: 0, dedupe: false })
          : await getTeams({ cacheTTL: 0, dedupe: false });
        const refreshedTeam = fixedTeamId
          ? normalizeTeamRecord(response.data)
          : normalizeCollection(response.data)
              .map((item) => normalizeTeamRecord(item))
              .find((team) => getTeamId(team) === String(teamId));
        if (!refreshedTeam || getTeamId(refreshedTeam) !== String(teamId)) {
          throw new Error("The updated team was not present in the refreshed team list.");
        }
        onSaved?.(refreshedTeam);
      } catch (error) {
        toastError(
          `Weekly off days were saved, but the team list could not be refreshed: ${
            extractApiErrorMessage(error, "Unable to reload teams.")
          }`
        );
        onSaved?.({ teamId, weeklyOffDays: savedWeeklyOffDays });
      }
      onClose?.();
    } catch (error) {
      const message = extractApiErrorMessage(error, "Unable to save weekly off days.");
      setSaveError(message);
      toastError(message);
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="team-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose?.();
      }}
    >
      <section
        className="team-modal team-modal-small weekly-off-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-weekly-off-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="team-modal-header">
          <div>
            <h2 className="team-modal-title" id="assign-weekly-off-title">
              Assign Weekly Off Days
            </h2>
            <p className="team-modal-subtitle">
              {fixedTeamId
                ? "Configure weekly off days for this team."
                : "Select a team and configure its weekly off days."}
            </p>
          </div>
          <button
            type="button"
            className="team-modal-close"
            aria-label="Close"
            onClick={onClose}
            disabled={saving}
          >
            <FaTimes />
          </button>
        </div>

        <div className="team-modal-body weekly-off-modal__body">
          {fixedTeamId ? (
            <div className="team-form-field" aria-live="polite">
              <span>Team</span>
              <strong>
                {teams[0]?.teamName ||
                  teams[0]?.teamNumber ||
                  `Team ${fixedTeamId}`}
              </strong>
            </div>
          ) : (
            <label className="team-form-field" htmlFor="weekly-off-team">
              <span>Select Team</span>
              <select
                id="weekly-off-team"
                className="team-form-select"
                value={selectedTeamId}
                onChange={(event) => setSelectedTeamId(event.target.value)}
                disabled={loadingTeams || saving || Boolean(loadError)}
              >
                <option value="">Select a team</option>
                {teams.map((team) => (
                  <option key={getTeamId(team)} value={getTeamId(team)}>
                    {team.teamName || team.teamNumber || `Team ${getTeamId(team)}`}
                  </option>
                ))}
              </select>
            </label>
          )}

          {loadingTeams && (
            <p className="team-reporting-days-modal__status" role="status">
              Loading teams...
            </p>
          )}
          {loadError && (
            <div className="team-reporting-days-modal__error" role="alert">
              <span>{loadError}</span>
              <button
                type="button"
                className="team-action-btn secondary"
                onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                disabled={loadingTeams || saving}
              >
                Retry
              </button>
            </div>
          )}

          {!loadingTeams && !loadError && teams.length === 0 && (
            <p className="team-reporting-days-modal__status" role="status">
              No teams are available to configure.
            </p>
          )}

          {!loadingTeams && !loadError && teams.length > 0 && (
            <fieldset
              className="weekly-off-fieldset"
              disabled={saving || !selectedTeamId}
              aria-busy={saving}
            >
              <legend>Select Weekly Off Days</legend>
              <div className="weekly-off-day-list">
                {WEEKLY_OFF_DAY_OPTIONS.map((day) => (
                  <label className="weekly-off-day-option" key={day}>
                    <input
                      type="checkbox"
                      checked={weeklyOffDays.includes(day)}
                      onChange={() => handleToggleDay(day)}
                    />
                    <span>{day}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {saveError && <p className="team-form-error" role="alert">{saveError}</p>}
        </div>

        <div className="team-modal-footer">
          <button
            type="button"
            className="team-action-btn secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="team-action-btn"
            onClick={handleSave}
            disabled={loadingTeams || saving || Boolean(loadError) || teams.length === 0}
          >
            {saving ? "Saving..." : "Save Weekly Off Days"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default AssignWeekendsModal;
