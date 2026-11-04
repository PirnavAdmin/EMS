export const TEAM_DATA_UPDATED_EVENT = "ems:team-data-updated";
export const TEAM_DATA_CHANNEL_NAME = "ems-team-data-updates";
let updateSequence = 0;

const dispatchLocalUpdate = (detail) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(TEAM_DATA_UPDATED_EVENT, { detail }));
};

export const notifyTeamDataChanged = (detail = {}) => {
  const message = {
    ...detail,
    updateId: `${Date.now()}-${++updateSequence}`
  };
  dispatchLocalUpdate(message);

  if (typeof BroadcastChannel === "undefined") return;

  try {
    const channel = new BroadcastChannel(TEAM_DATA_CHANNEL_NAME);
    channel.postMessage(message);
    channel.close();
  } catch {
    // Same-window updates still work when cross-tab messaging is unavailable.
  }
};

export const subscribeToTeamDataChanges = (onChange) => {
  if (typeof window === "undefined" || typeof onChange !== "function") {
    return () => {};
  }

  const seenUpdateIds = new Set();
  const handleMessage = (message) => {
    const detail = message ?? {};
    if (detail.updateId && seenUpdateIds.has(detail.updateId)) return;
    if (detail.updateId) {
      seenUpdateIds.add(detail.updateId);
      if (seenUpdateIds.size > 50) seenUpdateIds.delete(seenUpdateIds.values().next().value);
    }
    onChange(detail);
  };
  const handleLocalUpdate = (event) => handleMessage(event.detail);
  window.addEventListener(TEAM_DATA_UPDATED_EVENT, handleLocalUpdate);

  if (typeof BroadcastChannel === "undefined") {
    return () => window.removeEventListener(TEAM_DATA_UPDATED_EVENT, handleLocalUpdate);
  }

  let channel;
  try {
    channel = new BroadcastChannel(TEAM_DATA_CHANNEL_NAME);
    channel.onmessage = (event) => handleMessage(event.data);
  } catch {
    channel = null;
  }

  return () => {
    window.removeEventListener(TEAM_DATA_UPDATED_EVENT, handleLocalUpdate);
    channel?.close();
  };
};
