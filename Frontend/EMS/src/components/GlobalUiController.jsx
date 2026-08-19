import { useEffect, useRef } from "react";

const MODAL_SELECTORS = [
  ".attendance-modal-overlay",
  ".location-modal-overlay",
  ".apply-modal-overlay",
  ".asset-delete-overlay",
  ".change-password-overlay",
  ".clients-add-modal-overlay-unique",
  ".client-drawer-overlay",
  ".client-modal-overlay",
  ".client-view-overlay",
  ".company-modal-overlay",
  ".delete-overlay",
  ".dept-members-overlay",
  ".dept-modal-overlay",
  ".emp-delete-overlay",
  ".emp-modal-overlay",
  ".ems-task-create-overlay",
  ".ems-task-delete-overlay",
  ".ems-task-view-overlay",
  ".holiday-modal-overlay",
  ".image-modal-overlay",
  ".job-modal-overlay",
  ".leave-details-overlay",
  ".modal",
  ".projects-modal-overlay",
  ".roles-modal-overlay",
  ".settings-modal-overlay",
];

const MODAL_QUERY = MODAL_SELECTORS.join(", ");

const isElementVisible = (element) => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const styles = window.getComputedStyle(element);

  return styles.display !== "none" && styles.visibility !== "hidden";
};

function GlobalUiController() {
  const animationFrameRef = useRef(0);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return undefined;
    }

    const syncModalState = () => {
      const hasOpenModal = Array.from(document.querySelectorAll(MODAL_QUERY)).some(
        isElementVisible
      );

      document.body.classList.toggle("app-modal-open", hasOpenModal);
    };

    const scheduleSyncModalState = () => {
      if (animationFrameRef.current || typeof window.requestAnimationFrame !== "function") {
        syncModalState();
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = 0;
        syncModalState();
      });
    };

    scheduleSyncModalState();

    const observer = new MutationObserver(scheduleSyncModalState);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "open"],
    });

    window.addEventListener("resize", scheduleSyncModalState);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleSyncModalState);
      if (animationFrameRef.current && typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = 0;
      document.body.classList.remove("app-modal-open");
    };
  }, []);

  return null;
}

export default GlobalUiController;
