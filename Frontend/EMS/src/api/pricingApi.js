import api from "./axiosInstance";

const PRICING_ENDPOINT = "/SuperAdmin/landing/pricing";
const PRICING_UPDATE_EVENT = "pricing-updated";

export const DEFAULT_PRICING_PLANS = [
  {
    planKey: "starter",
    name: "Starter",
    monthlyPrice: 2499,
    annualPrice: 23990,
    note: "Per month",
    description:
      "A focused package for small teams that need core HR essentials and quick setup.",
    features: [
      "Employee records",
      "Attendance tracking",
      "Leave requests",
      "Email support",
    ],
    ctaLabel: "Start Free Trial",
    ctaLink: "/register",
    isFeatured: false,
    displayOrder: 1,
  },
  {
    planKey: "growth",
    name: "Growth",
    monthlyPrice: 4999,
    annualPrice: 47990,
    note: "Per month",
    description:
      "The best fit for scaling teams that want workflow automation and richer analytics.",
    features: [
      "Everything in Starter",
      "Payroll automation",
      "Performance reviews",
      "Priority support",
    ],
    ctaLabel: "Choose Growth",
    ctaLink: "/register",
    isFeatured: true,
    displayOrder: 2,
  },
  {
    planKey: "enterprise",
    name: "Enterprise",
    monthlyPrice: null,
    annualPrice: null,
    note: "Tailored pricing",
    description:
      "Built for larger organizations that need advanced controls, integrations, and onboarding.",
    features: [
      "Custom workflows",
      "SSO and permissions",
      "Dedicated onboarding",
      "API integrations",
    ],
    ctaLabel: "Contact Peoplehrsync",
    ctaLink: "#request-demo",
    isFeatured: false,
    displayOrder: 3,
  },
];

const extractPlans = (data) => {
  const payload = data?.data?.data ?? data?.data ?? data;
  const plans = Array.isArray(payload) ? payload : payload?.plans;

  if (!Array.isArray(plans)) {
    throw new Error("The pricing response did not contain a plan list.");
  }

  const defaultsByKey = new Map(
    DEFAULT_PRICING_PLANS.map((plan) => [plan.planKey, plan])
  );

  const normalizePrice = (value, fallback) => {
    if (value === null) return null;
    if (value === undefined || value === "") return fallback ?? null;
    const price = Number(value);
    return Number.isFinite(price) ? price : fallback ?? null;
  };

  return plans
    .map((plan = {}, index) => {
      const key =
        typeof plan.planKey === "string" && plan.planKey.trim()
          ? plan.planKey.trim()
          : `plan-${index + 1}`;
      const fallback = defaultsByKey.get(key) || {};

      return {
        planKey: key,
        name: String(plan.name ?? fallback.name ?? "Plan"),
        monthlyPrice: normalizePrice(plan.monthlyPrice, fallback.monthlyPrice),
        annualPrice: normalizePrice(plan.annualPrice, fallback.annualPrice),
        note: String(plan.note ?? fallback.note ?? ""),
        description: String(plan.description ?? fallback.description ?? ""),
        features: Array.isArray(plan.features)
          ? plan.features
          : fallback.features ?? [],
        ctaLabel: String(plan.ctaLabel || fallback.ctaLabel || ""),
        ctaLink: String(plan.ctaLink || fallback.ctaLink || ""),
        isFeatured:
          typeof plan.isFeatured === "boolean"
            ? plan.isFeatured
            : Boolean(fallback.isFeatured),
        displayOrder:
          plan.displayOrder !== undefined &&
          plan.displayOrder !== null &&
          plan.displayOrder !== "" &&
          Number.isInteger(Number(plan.displayOrder))
            ? Number(plan.displayOrder)
            : Number(fallback.displayOrder ?? index),
      };
    })
    .sort(
      (first, second) =>
        first.displayOrder - second.displayOrder ||
        first.name.localeCompare(second.name)
    );
};

const buildRequestUrl = (config) => {
  const baseURL = String(config?.baseURL || api.defaults.baseURL || "").replace(
    /\/+$/,
    ""
  );
  const endpoint = String(config?.url || PRICING_ENDPOINT).replace(/^\/+/, "");
  const query = new URLSearchParams(config?.params || {}).toString();
  return `${baseURL}/${endpoint}${query ? `?${query}` : ""}`;
};

export const getPricingPlans = async () => {
  const params = { _t: Date.now() };

  try {
    const response = await api.get(PRICING_ENDPOINT, {
      params,
      cacheTTL: 0,
      dedupe: false,
      skipAuth: true,
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "ngrok-skip-browser-warning": "true",
      },
    });

    console.log("Pricing GET:", {
      url: buildRequestUrl(response.config),
      status: response.status,
      response: response.data,
    });

    return extractPlans(response.data);
  } catch (error) {
    console.log("Pricing GET:", {
      url: buildRequestUrl(error?.config || error?.response?.config),
      status: error?.response?.status,
      response: error?.response?.data,
    });
    throw error;
  }
};

const cleanFeatureList = (features) => {
  const seen = new Set();
  return (Array.isArray(features) ? features : [])
    .map((feature) => String(feature ?? "").trim())
    .filter((feature) => {
      const normalized = feature.toLowerCase();
      if (!feature || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
};

export const savePricingPlans = async (plans) => {
  if (!Array.isArray(plans)) {
    throw new TypeError("Pricing plans must be provided as an array.");
  }

  const payload = plans
    .map((plan) => ({
      planKey: String(plan.planKey ?? "").trim(),
      name: String(plan.name ?? "").trim(),
      monthlyPrice: plan.monthlyPrice ?? null,
      annualPrice: plan.annualPrice ?? null,
      note: String(plan.note ?? "").trim(),
      description: String(plan.description ?? "").trim(),
      features: cleanFeatureList(plan.features),
      ctaLabel: String(plan.ctaLabel ?? "").trim(),
      ctaLink: String(plan.ctaLink ?? "").trim(),
      isFeatured: Boolean(plan.isFeatured),
      displayOrder: Number.isInteger(Number(plan.displayOrder))
        ? Number(plan.displayOrder)
        : 0,
    }))
    .sort(
      (first, second) =>
        first.displayOrder - second.displayOrder ||
        first.name.localeCompare(second.name)
    );

  return api.put(PRICING_ENDPOINT, payload, {
    headers: { "Content-Type": "application/json" },
  });
};

export const publishPricingUpdated = () => {
  if (typeof window === "undefined") return;

  const updateId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(PRICING_UPDATE_EVENT);
      channel.postMessage({ type: PRICING_UPDATE_EVENT, updateId });
      channel.close();
    }
  } catch (error) {
    console.error("Could not broadcast pricing update.", error);
  }

  try {
    window.localStorage.setItem(PRICING_UPDATE_EVENT, updateId);
  } catch (error) {
    console.error("Could not publish pricing storage event.", error);
  }
};

export const PRICING_UPDATED_EVENT = PRICING_UPDATE_EVENT;
