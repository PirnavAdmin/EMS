import { useEffect, useRef, useState } from "react";
import api from "../api/axiosInstance";
import { API_ENDPOINTS, buildServerUrl } from "../api/endpoints";

const BRANDING_LOGO_UPDATED_EVENT = "ems-branding-logo-updated";
let brandingFetchVersion = 0;
const BRANDING_CACHE_TTL = 5 * 60 * 1000;

const BRANDING_LOGO_FIELDS = {
  companyLogo: ["companyLogo", "CompanyLogo"],
  loginLogo: ["loginLogo", "LoginLogo"],
  sidebarLogo: ["sidebarLogo", "SidebarLogo"],
};

const isObjectLike = (value) => Boolean(value) && typeof value === "object";

const normalizeString = (value) => String(value || "").trim();

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
    normalizeString(cacheToken) || `${Date.now()}-${++brandingFetchVersion}`;

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
    cacheTTL: forceRefresh ? 0 : BRANDING_CACHE_TTL
  });
  const cacheToken =
    normalizeString(response?.data?.lastUpdated) ||
    normalizeString(response?.data?.updatedAt) ||
    normalizeString(response?.data?.data?.lastUpdated) ||
    normalizeString(response?.data?.data?.updatedAt) ||
    normalizeString(response?.headers?.["last-modified"]) ||
    normalizeString(response?.headers?.etag) ||
    `${Date.now()}-${++brandingFetchVersion}`;

  return resolveBrandingLogos(response.data, cacheToken);
};

export const notifyBrandingLogoUpdated = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(BRANDING_LOGO_UPDATED_EVENT));
};

export const useBrandingLogo = (fieldName) => {
  const [logoSrc, setLogoSrc] = useState("");
  const requestIdRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    const loadBrandingLogo = async (forceRefresh = false) => {
      const requestId = ++requestIdRef.current;

      try {
        const logos = await fetchBrandingLogos({
          forceRefresh
        });

        if (!isMounted || requestId !== requestIdRef.current) {
          return;
        }

        setLogoSrc(logos[fieldName] || "");
      } catch {
        if (isMounted && requestId === requestIdRef.current) {
          setLogoSrc("");
        }
      }
    };

    const handleBrandingLogoUpdate = () => {
      loadBrandingLogo(true);
    };

    loadBrandingLogo();

    if (typeof window !== "undefined") {
      window.addEventListener(
        BRANDING_LOGO_UPDATED_EVENT,
        handleBrandingLogoUpdate
      );
    }

    return () => {
      isMounted = false;

      if (typeof window !== "undefined") {
        window.removeEventListener(
          BRANDING_LOGO_UPDATED_EVENT,
          handleBrandingLogoUpdate
        );
      }
    };
  }, [fieldName]);

  return logoSrc;
};
