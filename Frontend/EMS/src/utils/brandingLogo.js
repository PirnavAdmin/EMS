import { useEffect, useRef, useState } from "react";
import api from "../api/axiosInstance";
import { API_ENDPOINTS, buildServerUrl } from "../api/endpoints";

const ORGANIZATION_ADMIN_LOGO_UPDATED_EVENT =
  "ems-organization-admin-logo-updated";
const SUPER_ADMIN_LOGO_UPDATED_EVENT = "ems-super-admin-logo-updated";
let organizationLogoVersion = 0;
let superAdminLogoVersion = 0;
const BRANDING_CACHE_TTL = 5 * 60 * 1000;

const BRANDING_LOGO_FIELDS = {
  companyLogo: ["companyLogo", "CompanyLogo"],
  loginLogo: ["loginLogo", "LoginLogo", "companyLogo", "CompanyLogo"],
  sidebarLogo: ["sidebarLogo", "SidebarLogo", "companyLogo", "CompanyLogo"],
};

const isObjectLike = (value) => Boolean(value) && typeof value === "object";

const normalizeString = (value) => String(value || "").trim();

const publishLogoUpdate = (eventName) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(eventName));

  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(eventName);
      channel.postMessage({ type: eventName });
      channel.close();
    }
  } catch (error) {
    console.error(`Could not broadcast logo update for ${eventName}.`, error);
  }
};

const subscribeToLogoUpdate = (eventName, handler) => {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(eventName, handler);
  let channel;

  try {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(eventName);
      channel.addEventListener("message", (event) => {
        if (event.data?.type === eventName) handler();
      });
    }
  } catch (error) {
    console.error(`Could not subscribe to logo updates for ${eventName}.`, error);
  }

  return () => {
    window.removeEventListener(eventName, handler);
    channel?.close();
  };
};

const getBrandingPayload = (payload) => {
  const candidate = payload?.data?.data ?? payload?.data ?? payload;

  return isObjectLike(candidate) ? candidate : {};
};

const appendCacheBuster = (url, cacheToken) => {
  const normalizedUrl = normalizeString(url);

  if (!normalizedUrl || !cacheToken) {
    return normalizedUrl;
  }

  const [pathPart, hashPart = ""] = normalizedUrl.split("#");
  const separator = pathPart.includes("?") ? "&" : "?";
  const nextUrl = `${pathPart}${separator}v=${encodeURIComponent(
    String(cacheToken)
  )}`;

  return hashPart ? `${nextUrl}#${hashPart}` : nextUrl;
};

const resolveLogoPath = (value, cacheToken) => {
  const rawPath = normalizeString(value);

  if (!rawPath) {
    return "";
  }

  if (/^(https?:|blob:|data:)/i.test(rawPath)) {
    return appendCacheBuster(rawPath, cacheToken);
  }

  const serverRelativePath = rawPath.replace(/^\/?api\/+/i, "/");

  return appendCacheBuster(
    buildServerUrl(serverRelativePath) || rawPath,
    cacheToken
  );
};

export const resolveLogoUrl = (value, cacheToken = "") =>
  resolveLogoPath(
    value,
    normalizeString(cacheToken) || `${Date.now()}-${++superAdminLogoVersion}`
  );

const resolveFieldLogo = (brandingData, fieldName, cacheToken) => {
  const aliases = BRANDING_LOGO_FIELDS[fieldName] || [fieldName];

  for (const key of aliases) {
    const candidate = normalizeString(brandingData?.[key]);

    if (candidate) {
      return resolveLogoPath(candidate, cacheToken);
    }
  }

  return "";
};

export const resolveBrandingLogos = (payload, cacheToken = "") => {
  const brandingData = getBrandingPayload(payload);
  const resolvedCacheToken =
    normalizeString(cacheToken) || `${Date.now()}-${++organizationLogoVersion}`;

  return {
    companyLogo: resolveFieldLogo(
      brandingData,
      "companyLogo",
      resolvedCacheToken
    ),
    loginLogo: resolveFieldLogo(brandingData, "loginLogo", resolvedCacheToken),
    sidebarLogo: resolveFieldLogo(
      brandingData,
      "sidebarLogo",
      resolvedCacheToken
    ),
  };
};

export const fetchBrandingLogos = async ({ forceRefresh = false } = {}) => {
  const response = await api.get(API_ENDPOINTS.settings.branding, {
    cacheTTL: forceRefresh ? 0 : BRANDING_CACHE_TTL,
  });
  const brandingData = getBrandingPayload(response.data);
  const cacheToken =
    normalizeString(brandingData.lastUpdated) ||
    normalizeString(brandingData.updatedAt) ||
    normalizeString(response?.headers?.["last-modified"]) ||
    normalizeString(response?.headers?.etag) ||
    `${Date.now()}-${++organizationLogoVersion}`;

  return resolveBrandingLogos(response.data, cacheToken);
};

export const notifyOrganizationAdminLogoUpdated = () => {
  publishLogoUpdate(ORGANIZATION_ADMIN_LOGO_UPDATED_EVENT);
};

export const notifySuperAdminLogoUpdated = () => {
  publishLogoUpdate(SUPER_ADMIN_LOGO_UPDATED_EVENT);
};

export const useSuperAdminLogo = (enabled = true) => {
  const [logoSrc, setLogoSrc] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    if (!enabled) {
      setLogoSrc("");
      setIsLoading(false);
      return () => {
        isMounted = false;
        requestIdRef.current += 1;
      };
    }

    const loadLandingLogo = async () => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      try {
        const url = await fetchLandingLogo();
        if (isMounted && requestId === requestIdRef.current) {
          setLogoSrc(url);
        }
      } catch {
        if (isMounted && requestId === requestIdRef.current) {
          setLogoSrc("");
        }
      } finally {
        if (isMounted && requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    const handleSuperAdminLogoUpdate = () => void loadLandingLogo();

    void loadLandingLogo();

    const unsubscribe = subscribeToLogoUpdate(
      SUPER_ADMIN_LOGO_UPDATED_EVENT,
      handleSuperAdminLogoUpdate
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [enabled]);

  return { logoSrc, isLoading };
};

export const useOrganizationAdminLogo = (fieldName, enabled = true) => {
  const [logoSrc, setLogoSrc] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    if (!enabled) {
      setLogoSrc("");
      setIsLoading(false);
      return () => {
        isMounted = false;
        requestIdRef.current += 1;
      };
    }

    const loadBrandingLogo = async (forceRefresh = false) => {
      const requestId = ++requestIdRef.current;

      if (!forceRefresh) {
        setIsLoading(true);
      }

      try {
        const logos = await fetchBrandingLogos({ forceRefresh });

        if (!isMounted || requestId !== requestIdRef.current) {
          return;
        }

        setLogoSrc(logos[fieldName] || "");
      } catch {
        if (isMounted && requestId === requestIdRef.current) {
          setLogoSrc("");
        }
      } finally {
        if (isMounted && requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    const handleOrganizationAdminLogoUpdate = () => {
      loadBrandingLogo(true);
    };

    loadBrandingLogo();

    const unsubscribe = subscribeToLogoUpdate(
      ORGANIZATION_ADMIN_LOGO_UPDATED_EVENT,
      handleOrganizationAdminLogoUpdate
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [enabled, fieldName]);

  return { logoSrc, isLoading };
};

export const fetchLandingLogo = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.public.landingLogo, {
      skipAuth: true,
      cacheTTL: 0,
    });
    const payload = getBrandingPayload(response.data);
    const logoUrl = normalizeString(payload.logoUrl || payload.companyLogo);
    const cacheToken =
      normalizeString(payload.lastUpdated) ||
      normalizeString(payload.updatedAt) ||
      `${Date.now()}-${++superAdminLogoVersion}`;

    return resolveLogoPath(logoUrl, cacheToken);
  } catch {
    return "";
  }
};
