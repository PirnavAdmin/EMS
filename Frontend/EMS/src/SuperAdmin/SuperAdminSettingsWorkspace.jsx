import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaCheck,
  FaCog,
  FaAt,
  FaEdit,
  FaEnvelope,
  FaImage,
  FaPlus,
  FaTimes,
  FaTrash,
  FaUpload,
} from "react-icons/fa";
import {
  getPricingPlans,
  publishPricingUpdated,
  savePricingPlans,
} from "../api/pricingApi";
import {
  getSuperAdminLandingLogo,
  uploadSuperAdminLandingLogo,
} from "../services/landingPricingService";
import { getApiErrorMessage } from "../services/superAdminService";
import { toastError, toastSuccess } from "../components/common/Toast/toastService";
import {
  notifySuperAdminLogoUpdated,
  resolveLogoUrl,
} from "../utils/brandingLogo";
import { SettingsCard, SettingsStatPill } from "../Pages/Settings/SettingsShared";
import EmailSettings from "../Pages/Settings/EmailSettings";
import ContactEmailSettings from "./ContactEmailSettings";
import "../Pages/Settings/Settings.css";
import "./SuperAdminSettingsWorkspace.css";

const EMPTY_PLAN = {
  planKey: "",
  name: "",
  monthlyPrice: "",
  annualPrice: "",
  note: "",
  description: "",
  features: [],
  ctaLabel: "",
  ctaLink: "",
  customPricing: false,
  isFeatured: false,
  displayOrder: 0,
};

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_EXTENSIONS = /\.(png|svg|webp)$/i;

const verifyLogoImage = (source) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("The saved logo image could not be loaded."));
    image.src = source;
  });

const sortPlans = (plans) =>
  [...plans].sort(
    (first, second) =>
      (Number(first.displayOrder) || 0) - (Number(second.displayOrder) || 0) ||
      String(first.name).localeCompare(String(second.name))
  );

const formatINR = (value) => {
  const amount = Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const getPlanForm = (plan = EMPTY_PLAN) => ({
  ...EMPTY_PLAN,
  ...plan,
  monthlyPrice: plan.monthlyPrice ?? "",
  annualPrice: plan.annualPrice ?? "",
  features: Array.isArray(plan.features) ? [...plan.features] : [],
  customPricing: plan.monthlyPrice == null && plan.annualPrice == null,
});

const normalizeApiPlan = (apiPlan) => {
  const ctaLink = typeof apiPlan.ctaLink === "string" ? apiPlan.ctaLink : "";
  const isInternalLink =
    ctaLink.startsWith("/") &&
    !ctaLink.startsWith("//");

  return {
    ...apiPlan,
    planKey: String(apiPlan.planKey ?? ""),
    name: String(apiPlan.name ?? "Plan"),
    note: String(apiPlan.note ?? ""),
    description: String(apiPlan.description ?? ""),
    features: Array.isArray(apiPlan.features)
      ? apiPlan.features
          .map((feature) => String(feature ?? "").trim())
          .filter((feature, index, features) =>
            feature && features.findIndex((item) => item.toLowerCase() === feature.toLowerCase()) === index
          )
      : [],
    displayOrder: Number.isFinite(Number(apiPlan.displayOrder))
      ? Number(apiPlan.displayOrder)
      : 0,
    isFeatured: Boolean(apiPlan.isFeatured),
    price: apiPlan.monthlyPrice,
    icon: FaImage,
    featured: Boolean(apiPlan.isFeatured),
    to: isInternalLink ? ctaLink : undefined,
    href: isInternalLink ? undefined : ctaLink,
  };
};

const toPricingPayload = (plan) => ({
  planKey: plan.planKey,
  name: plan.name,
  monthlyPrice: plan.monthlyPrice ?? null,
  annualPrice: plan.annualPrice ?? null,
  note: plan.note ?? "",
  description: plan.description ?? "",
  features: Array.isArray(plan.features) ? plan.features : [],
  ctaLabel: plan.ctaLabel ?? "",
  ctaLink: plan.ctaLink ?? plan.to ?? plan.href ?? "",
  isFeatured: Boolean(plan.isFeatured),
  displayOrder: Number(plan.displayOrder),
});

const validatePlan = (plan, plans, editingPlanKey) => {
  const errors = {};
  const planKey = String(plan.planKey).trim();

  if (!planKey) {
    errors.planKey = "Plan key is required.";
  } else if (!/^[a-z0-9_-]+$/.test(planKey)) {
    errors.planKey = "Use lowercase letters, numbers, hyphens, or underscores only.";
  } else if (
    plans.some(
      (existing) =>
        existing.planKey.toLowerCase() === planKey.toLowerCase() &&
        existing.planKey !== editingPlanKey
    )
  ) {
    errors.planKey = "Plan key must be unique.";
  }

  if (!String(plan.name).trim()) {
    errors.name = "Plan name is required.";
  }

  if (!plan.customPricing) {
    ["monthlyPrice", "annualPrice"].forEach((field) => {
      const value = plan[field];
      if (value === "" || !Number.isFinite(Number(value)) || Number(value) < 0) {
        errors[field] = "Enter a number greater than or equal to zero.";
      }
    });
  }

  if (!String(plan.ctaLink).trim()) {
    errors.ctaLink = "CTA link is required.";
  } else if (!/^(\/(?!\/)|#|https:\/\/)/i.test(String(plan.ctaLink).trim())) {
    errors.ctaLink = "Use an internal path, # anchor, or https:// URL.";
  }

  if (
    String(plan.displayOrder).trim() === "" ||
    !Number.isInteger(Number(plan.displayOrder))
  ) {
    errors.displayOrder = "Display order must be an integer.";
  }

  return errors;
};

function PricingModule() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingPlanKey, setDeletingPlanKey] = useState("");
  const [form, setForm] = useState(EMPTY_PLAN);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlanKey, setEditingPlanKey] = useState(null);
  const [featureDraft, setFeatureDraft] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);

  useEffect(() => {
    let active = true;

    getPricingPlans()
      .then((responsePlans) => {
        if (active) {
          setPlans(sortPlans(responsePlans.map(normalizeApiPlan)));
          setLoadError("");
        }
      })
      .catch((error) => {
        if (active) {
          const message = getApiErrorMessage(error, "Pricing plans could not be loaded.");
          setLoadError(message);
          toastError(message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [reloadVersion]);

  const sortedPlans = useMemo(() => sortPlans(plans), [plans]);

  const startAdd = () => {
    setSavedSuccessfully(false);
    setServerError("");
    setFormOpen(true);
    setEditingPlanKey(null);
    setForm(getPlanForm());
    setErrors({});
    setFeatureDraft("");
  };

  const startEdit = (plan) => {
    setSavedSuccessfully(false);
    setServerError("");
    setFormOpen(true);
    setEditingPlanKey(plan.planKey);
    setForm(getPlanForm(plan));
    setErrors({});
    setFeatureDraft("");
  };

  const cancelEdit = () => {
    setFormOpen(false);
    setEditingPlanKey(null);
    setForm(getPlanForm());
    setErrors({});
    setFeatureDraft("");
  };

  const addFeature = () => {
    const feature = featureDraft.trim();
    if (!feature) return;

    if (form.features.some((existing) => existing.toLowerCase() === feature.toLowerCase())) {
      setErrors((current) => ({ ...current, features: "Features cannot be duplicated." }));
      return;
    }

    setForm((current) => ({ ...current, features: [...current.features, feature] }));
    setFeatureDraft("");
    setErrors((current) => ({ ...current, features: "" }));
  };

  const removeFeature = (featureToRemove) => {
    setForm((current) => ({
      ...current,
      features: current.features.filter((feature) => feature !== featureToRemove),
    }));
  };

  const savePlan = async (event) => {
    event.preventDefault();
    const validationErrors = validatePlan(form, plans, editingPlanKey);
    setErrors(validationErrors);
    setServerError("");

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const payload = {
      planKey: String(form.planKey).trim(),
      name: String(form.name).trim(),
      monthlyPrice: form.customPricing ? null : Number(form.monthlyPrice),
      annualPrice: form.customPricing ? null : Number(form.annualPrice),
      note: String(form.note).trim(),
      description: String(form.description).trim(),
      features: form.features,
      ctaLabel: String(form.ctaLabel).trim(),
      ctaLink: String(form.ctaLink).trim(),
      displayOrder: Number(form.displayOrder),
      isFeatured: Boolean(form.isFeatured),
    };

    setSaving(true);
    try {
      const nextPlans = editingPlanKey
        ? plans.map((plan) =>
            plan.planKey === editingPlanKey
              ? payload
              : { ...toPricingPayload(plan), isFeatured: payload.isFeatured ? false : plan.isFeatured }
          )
        : [
            ...plans.map((plan) => ({
              ...toPricingPayload(plan),
              isFeatured: payload.isFeatured ? false : plan.isFeatured,
            })),
            payload,
          ];
      const sortedNextPlans = sortPlans(nextPlans).map((plan) => ({
        ...plan,
        planKey: String(plan.planKey).trim(),
        name: String(plan.name).trim(),
        note: String(plan.note).trim(),
        description: String(plan.description).trim(),
        ctaLabel: String(plan.ctaLabel).trim(),
        ctaLink: String(plan.ctaLink).trim(),
        features: plan.features
          .map((feature) => String(feature).trim())
          .filter((feature, index, list) =>
            feature && list.findIndex((item) => item.toLowerCase() === feature.toLowerCase()) === index
          ),
      }));
      await savePricingPlans(sortedNextPlans);
      publishPricingUpdated();
      const savedPlans = await getPricingPlans();
      setPlans(sortPlans(savedPlans.map(normalizeApiPlan)));
      setLoadError("");
      setSavedSuccessfully(true);
      toastSuccess(editingPlanKey ? "Pricing plan updated." : "Pricing plan created.");
      cancelEdit();
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Pricing plan could not be saved or refreshed."
      );
      setServerError(message);
      toastError(message);
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (plan) => {
    if (!window.confirm(`Delete the ${plan.name} plan? This cannot be undone.`)) {
      return;
    }

    setDeletingPlanKey(plan.planKey);
    try {
      await savePricingPlans(
        plans
          .filter((existingPlan) => existingPlan.planKey !== plan.planKey)
          .map(toPricingPayload)
      );
      publishPricingUpdated();
      const savedPlans = await getPricingPlans();
      setPlans(sortPlans(savedPlans.map(normalizeApiPlan)));
      setLoadError("");
      toastSuccess("Pricing plan deleted.");
      setSavedSuccessfully(true);
      if (editingPlanKey === plan.planKey) {
        cancelEdit();
      }
    } catch (error) {
      toastError(getApiErrorMessage(error, "Pricing plan could not be deleted."));
    } finally {
      setDeletingPlanKey("");
    }
  };

  return (
    <SettingsCard
      title="Pricing plans"
      description="Plans shown on the landing page pricing section"
      className="super-admin-workspace-card"
      meta={
        <button type="button" className="super-admin-workspace-primary" onClick={startAdd}>
          <FaPlus aria-hidden="true" /> Add plan
        </button>
      }
    >
      {savedSuccessfully && (
        <a
          className="super-admin-pricing-landing-link"
          href="/#pricing"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on landing page
        </a>
      )}
      <div className="super-admin-plan-table-wrap">
        <table className="super-admin-plan-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Plan</th>
              <th>Monthly</th>
              <th>Annual</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6">Loading pricing plans...</td></tr>
            ) : loadError ? (
              <tr>
                <td colSpan="6">
                  Pricing plans could not be loaded: {loadError}{" "}
                  <button
                    type="button"
                    className="super-admin-plan-retry"
                    onClick={() => {
                      setLoading(true);
                      setReloadVersion((version) => version + 1);
                    }}
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ) : sortedPlans.length === 0 ? (
              <tr><td colSpan="6">No pricing plans found.</td></tr>
            ) : sortedPlans.map((plan) => (
              <tr key={plan.planKey}>
                <td>{plan.displayOrder}</td>
                <td>
                  <strong>{plan.name}</strong>
                  <small>{plan.planKey}</small>
                </td>
                <td>{plan.monthlyPrice == null ? "Custom" : formatINR(plan.monthlyPrice)}</td>
                <td>{plan.annualPrice == null ? "Custom" : formatINR(plan.annualPrice)}</td>
                <td><span className={`super-admin-featured-pill ${plan.isFeatured ? "is-featured" : ""}`}>{plan.isFeatured ? "Yes" : "No"}</span></td>
                <td>
                  <div className="super-admin-plan-actions">
                    <button type="button" aria-label={`Edit ${plan.name}`} onClick={() => startEdit(plan)}><FaEdit aria-hidden="true" /></button>
                    <button
                      type="button"
                      className="is-danger"
                      aria-label={`Delete ${plan.name}`}
                      disabled={deletingPlanKey === plan.planKey}
                      onClick={() => deletePlan(plan)}
                    >
                      <FaTrash aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {formOpen ? (
        <form className="super-admin-plan-form" onSubmit={savePlan} noValidate>
          <h4 className="super-admin-plan-form-title">
            {editingPlanKey
              ? `Edit plan: ${form.name || editingPlanKey}`
              : "Add pricing plan"}
          </h4>
          <div className="super-admin-plan-form-grid">
            {serverError && (
              <p className="super-admin-pricing-error super-admin-plan-form-wide" role="alert">
                {serverError}
              </p>
            )}
            <label className="settings-field">
              <span className="settings-field-label">Plan key *</span>
              <input
                className="settings-input"
                value={form.planKey}
                onChange={(event) => setForm((current) => ({ ...current, planKey: event.target.value }))}
                aria-invalid={Boolean(errors.planKey)}
              />
              {errors.planKey && <span className="settings-field-error">{errors.planKey}</span>}
            </label>
            <label className="settings-field">
              <span className="settings-field-label">Name *</span>
              <input
                className="settings-input"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <span className="settings-field-error">{errors.name}</span>}
            </label>
            <label className="settings-field">
              <span className="settings-field-label">Monthly price (₹)</span>
              <input
                className="settings-input"
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyPrice}
                disabled={form.customPricing}
                onChange={(event) => setForm((current) => ({ ...current, monthlyPrice: event.target.value }))}
                aria-invalid={Boolean(errors.monthlyPrice)}
              />
              {errors.monthlyPrice && <span className="settings-field-error">{errors.monthlyPrice}</span>}
            </label>
            <label className="settings-field">
              <span className="settings-field-label">Annual price (₹)</span>
              <input
                className="settings-input"
                type="number"
                min="0"
                step="0.01"
                value={form.annualPrice}
                disabled={form.customPricing}
                onChange={(event) => setForm((current) => ({ ...current, annualPrice: event.target.value }))}
                aria-invalid={Boolean(errors.annualPrice)}
              />
              {errors.annualPrice && <span className="settings-field-error">{errors.annualPrice}</span>}
            </label>
            <label className="settings-field super-admin-plan-form-wide">
              <span className="settings-field-label">
                <input
                  type="checkbox"
                  checked={form.customPricing}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      customPricing: event.target.checked,
                      monthlyPrice: "",
                      annualPrice: "",
                    }))
                  }
                />{" "}
                Custom pricing (no fixed price)
              </span>
            </label>
            <label className="settings-field">
              <span className="settings-field-label">Price note</span>
              <input
                className="settings-input"
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              />
            </label>
            <label className="settings-field">
              <span className="settings-field-label">Display order *</span>
              <input
                className="settings-input"
                type="number"
                step="1"
                value={form.displayOrder}
                onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))}
                aria-invalid={Boolean(errors.displayOrder)}
              />
              {errors.displayOrder && <span className="settings-field-error">{errors.displayOrder}</span>}
            </label>
            <label className="settings-field super-admin-plan-form-wide">
              <span className="settings-field-label">Description</span>
              <textarea
                className="settings-textarea"
                rows="3"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            <div className="settings-field super-admin-plan-form-wide">
              <span className="settings-field-label">Features</span>
              <div className="super-admin-feature-input">
                <input
                  className="settings-input"
                  value={featureDraft}
                  onChange={(event) => setFeatureDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addFeature();
                    }
                  }}
                  placeholder="Type a feature and press Enter"
                />
                <button type="button" className="super-admin-workspace-secondary" onClick={addFeature}>
                  <FaPlus aria-hidden="true" /> Add
                </button>
              </div>
              {form.features.length > 0 && (
                <div className="super-admin-feature-chips">
                  {form.features.map((feature) => (
                    <span className="super-admin-feature-chip" key={feature}>
                      {feature}
                      <button
                        type="button"
                        aria-label={`Remove ${feature}`}
                        onClick={() => removeFeature(feature)}
                      >
                        <FaTimes aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {errors.features && <span className="settings-field-error">{errors.features}</span>}
            </div>
            <label className="settings-field">
              <span className="settings-field-label">CTA label</span>
              <input
                className="settings-input"
                value={form.ctaLabel}
                onChange={(event) => setForm((current) => ({ ...current, ctaLabel: event.target.value }))}
              />
            </label>
            <label className="settings-field">
              <span className="settings-field-label">CTA link *</span>
              <input
                className="settings-input"
                value={form.ctaLink}
                onChange={(event) => setForm((current) => ({ ...current, ctaLink: event.target.value }))}
                aria-invalid={Boolean(errors.ctaLink)}
              />
              {errors.ctaLink && <span className="settings-field-error">{errors.ctaLink}</span>}
            </label>
            <label className="super-admin-featured-toggle">
              <input
                type="checkbox"
                checked={Boolean(form.isFeatured)}
                onChange={(event) => {
                  setForm((current) => ({ ...current, isFeatured: event.target.checked }));
                  setErrors((current) => ({ ...current, isFeatured: "" }));
                }}
              />
              <span>Featured plan (turning this on unfeatures the other plan)</span>
            </label>
            {errors.isFeatured && <span className="settings-field-error">{errors.isFeatured}</span>}
          </div>
          <div className="super-admin-workspace-actions">
            <button type="button" className="super-admin-workspace-secondary" onClick={cancelEdit} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="super-admin-workspace-primary" disabled={saving}>
              <FaCheck aria-hidden="true" /> {saving ? "Saving..." : "Save plan"}
            </button>
          </div>
        </form>
      ) : null}

    </SettingsCard>
  );
}

function LogoModule() {
  const [currentLogo, setCurrentLogo] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;

    getSuperAdminLandingLogo()
      .then((logoData) => {
        if (active) {
          const logoUrl = logoData.logoUrl || logoData.companyLogo || "";
          const logo = resolveLogoUrl(
            logoUrl,
            logoData.updatedAt || logoData.lastUpdated || Date.now()
          );
          if (!logo) {
            throw new Error("The branding response did not contain a company logo.");
          }
          return verifyLogoImage(logo).then(() => {
            if (active) setCurrentLogo(logo);
          });
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(getApiErrorMessage(requestError, "Current logo could not be loaded."));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  const selectLogo = (file) => {
    if (!file) return;

    const hasAllowedExtension = ALLOWED_LOGO_EXTENSIONS.test(file.name);
    const hasAllowedType =
      !file.type || ["image/png", "image/svg+xml", "image/webp"].includes(file.type);

    if (!hasAllowedExtension || !hasAllowedType) {
      setError("Choose a PNG, SVG, or WebP image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("The logo must be no larger than 2 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setError("");
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const refreshLogo = async (fallbackLogoUrl = "") => {
    let logoData;

    try {
      logoData = await getSuperAdminLandingLogo();
    } catch (error) {
      if (!fallbackLogoUrl) throw error;
      logoData = { logoUrl: fallbackLogoUrl };
    }

    const logoUrl = logoData.logoUrl || logoData.companyLogo || fallbackLogoUrl;
    const logo = resolveLogoUrl(
      logoUrl,
      logoData.updatedAt || logoData.lastUpdated || Date.now()
    );
    if (!logo) {
      throw new Error("The branding response did not contain a company logo.");
    }

    await verifyLogoImage(logo);
    setCurrentLogo(logo);
    setError("");
    notifySuperAdminLogoUpdated();
    return logo;
  };

  const saveLogo = async () => {
    if (!selectedFile) {
      setError("Choose a logo file before uploading.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const uploadResponse = await uploadSuperAdminLandingLogo(selectedFile);
      const uploadedLogoUrl =
        uploadResponse.data?.logoUrl ||
        uploadResponse.data?.companyLogo ||
        uploadResponse.data?.data?.logoUrl ||
        uploadResponse.data?.data?.companyLogo ||
        "";
      try {
        await refreshLogo(uploadedLogoUrl);
        cancelUpload();
        toastSuccess("Logo uploaded and verified.");
      } catch (refreshError) {
        const message = getApiErrorMessage(
          refreshError,
          "The upload request succeeded, but the saved logo could not be loaded."
        );
        setError(message);
        toastError(message);
      }
    } catch (uploadError) {
      const message = getApiErrorMessage(uploadError, "Logo could not be uploaded.");
      setError(message);
      toastError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard
      title="Company logo"
      description="Upload the logo used on the public landing page and Super Admin workspace."
      className="super-admin-workspace-card"
    >
      <div className="super-admin-logo-preview-panel">
        <h4>Current logo</h4>
        {loading ? (
          <p>Loading logo...</p>
        ) : currentLogo ? (
          <img
            src={currentLogo}
            alt="Current company logo"
            onError={() => setError("The current logo URL could not be loaded.")}
          />
        ) : (
          <p>No company logo is currently configured.</p>
        )}
      </div>

      <div
        className={`super-admin-logo-dropzone ${dragging ? "is-dragging" : ""}`}
        role="button"
        tabIndex={0}
        onClick={(event) => {
          if (event.target !== fileInputRef.current) {
            fileInputRef.current?.click();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          selectLogo(event.dataTransfer.files?.[0]);
        }}
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="Selected logo preview" />
            <span>{selectedFile?.name}</span>
          </>
        ) : (
          <>
            <FaUpload aria-hidden="true" />
            <strong>Drop a logo here or click to choose</strong>
            <span>PNG, SVG, or WebP. Maximum file size: 2 MB.</span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.svg,.webp,image/png,image/svg+xml,image/webp"
          hidden
          onChange={(event) => selectLogo(event.target.files?.[0])}
        />
      </div>

      {error && <p className="super-admin-logo-error" role="alert">{error}</p>}

      <div className="super-admin-workspace-actions">
        <button
          type="button"
          className="super-admin-workspace-primary"
          disabled={!selectedFile || saving}
          onClick={saveLogo}
        >
          <FaUpload aria-hidden="true" /> {saving ? "Saving..." : "Upload and save"}
        </button>
        <button
          type="button"
          className="super-admin-workspace-secondary"
          disabled={saving}
          onClick={cancelUpload}
        >
          Cancel
        </button>
      </div>
    </SettingsCard>
  );
}

function SuperAdminSettingsWorkspace() {
  const [activeModule, setActiveModule] = useState("pricing");
  const modules = [
    { key: "pricing", label: "Pricing", description: "Landing page plans", icon: FaCog },
    { key: "logo", label: "Logo", description: "Company brand asset", icon: FaImage },
    { key: "contact", label: "Contact Email", description: "Landing page contact address", icon: FaAt },
    { key: "senders", label: "Sender Email Accounts", description: "Demo-request SMTP senders", icon: FaEnvelope },
  ];
  const activeDefinition = modules.find((module) => module.key === activeModule);

  return (
    <div className="settings-page super-admin-settings-workspace">
      <div className="settings-hero app-surface">
        <div className="settings-hero-copy">
          <h1 className="settings-title">Settings Workspace</h1>
          <p className="settings-subtitle">
            Manage public pricing, brand assets, landing page contact details, and demo-request email senders from one Super Admin workspace.
            Modules switch without reloading the page.
          </p>
        </div>
        <div className="settings-hero-stats">
          <SettingsStatPill label="Total Modules" value={String(modules.length)} tone="info" />
          <SettingsStatPill label="Active Module" value={activeDefinition.label} tone="info" />
          <SettingsStatPill label="Workspace" value="Super Admin" tone="info" />
        </div>
      </div>

      <div className="settings-layout">
        <aside className="settings-nav app-surface">
          <div className="settings-nav-head">
            <span className="settings-nav-eyebrow">Modules</span>
            <h2>Settings Navigation</h2>
            <p>Select the module you want to configure.</p>
          </div>
          <div className="settings-nav-list" role="tablist" aria-label="Super Admin settings">
            {modules.map(({ key, label, description, icon }) => (
              <button
                type="button"
                role="tab"
                aria-selected={activeModule === key}
                className={`settings-sidebar-item settings-nav-item ${activeModule === key ? "active" : ""}`}
                key={key}
                onClick={() => setActiveModule(key)}
              >
                <span className="settings-sidebar-icon settings-nav-icon">
                  {React.createElement(icon)}
                </span>
                <span className="settings-nav-copy">
                  <strong>{label}</strong>
                  <span>{description}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="settings-content" role="tabpanel">
          {activeModule === "pricing" ? (
            <PricingModule />
          ) : activeModule === "logo" ? (
            <LogoModule />
          ) : activeModule === "contact" ? (
            <ContactEmailSettings />
          ) : activeModule === "senders" ? (
            <EmailSettings
              senderAccountsOnly
              senderPurposeScope={["demo request notification", "demo request reply"]}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default SuperAdminSettingsWorkspace;
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import {
//   FaCheck,
//   FaCog,
//   FaAt,
//   FaEdit,
//   FaEnvelope,
//   FaImage,
//   FaPlus,
//   FaTimes,
//   FaTrash,
//   FaUpload,
// } from "react-icons/fa";
// import {
//   getPricingPlans,
//   publishPricingUpdated,
//   savePricingPlans,
// } from "../api/pricingApi";
// import {
//   getSuperAdminLandingLogo,
//   uploadSuperAdminLandingLogo,
// } from "../services/landingPricingService";
// import { getApiErrorMessage } from "../services/superAdminService";
// import { toastError, toastSuccess } from "../components/common/Toast/toastService";
// import {
//   notifySuperAdminLogoUpdated,
//   resolveLogoUrl,
// } from "../utils/brandingLogo";
// import { SettingsCard, SettingsStatPill } from "../Pages/Settings/SettingsShared";
// import ContactEmailSettings from "./ContactEmailSettings";
// import SuperAdminEmaialSettings from "./SuperAdminEmaialSettings";
// import "../Pages/Settings/Settings.css";
// import "./SuperAdminSettingsWorkspace.css";

// const EMPTY_PLAN = {
//   planKey: "",
//   name: "",
//   monthlyPrice: "",
//   annualPrice: "",
//   note: "",
//   description: "",
//   features: [],
//   ctaLabel: "",
//   ctaLink: "",
//   customPricing: false,
//   isFeatured: false,
//   displayOrder: 0,
// };

// const MAX_LOGO_BYTES = 2 * 1024 * 1024;
// const ALLOWED_LOGO_EXTENSIONS = /\.(png|svg|webp)$/i;

// const verifyLogoImage = (source) =>
//   new Promise((resolve, reject) => {
//     const image = new Image();
//     image.onload = () => resolve();
//     image.onerror = () => reject(new Error("The saved logo image could not be loaded."));
//     image.src = source;
//   });

// const sortPlans = (plans) =>
//   [...plans].sort(
//     (first, second) =>
//       (Number(first.displayOrder) || 0) - (Number(second.displayOrder) || 0) ||
//       String(first.name).localeCompare(String(second.name))
//   );

// const formatINR = (value) => {
//   const amount = Number(value);
//   if (value === null || value === undefined || value === "" || !Number.isFinite(amount)) {
//     return "—";
//   }

//   return new Intl.NumberFormat("en-IN", {
//     style: "currency",
//     currency: "INR",
//     maximumFractionDigits: 2,
//   }).format(amount);
// };

// const getPlanForm = (plan = EMPTY_PLAN) => ({
//   ...EMPTY_PLAN,
//   ...plan,
//   monthlyPrice: plan.monthlyPrice ?? "",
//   annualPrice: plan.annualPrice ?? "",
//   features: Array.isArray(plan.features) ? [...plan.features] : [],
//   customPricing: plan.monthlyPrice == null && plan.annualPrice == null,
// });

// const normalizeApiPlan = (apiPlan) => {
//   const ctaLink = typeof apiPlan.ctaLink === "string" ? apiPlan.ctaLink : "";
//   const isInternalLink =
//     ctaLink.startsWith("/") &&
//     !ctaLink.startsWith("//");

//   return {
//     ...apiPlan,
//     planKey: String(apiPlan.planKey ?? ""),
//     name: String(apiPlan.name ?? "Plan"),
//     note: String(apiPlan.note ?? ""),
//     description: String(apiPlan.description ?? ""),
//     features: Array.isArray(apiPlan.features)
//       ? apiPlan.features
//           .map((feature) => String(feature ?? "").trim())
//           .filter((feature, index, features) =>
//             feature && features.findIndex((item) => item.toLowerCase() === feature.toLowerCase()) === index
//           )
//       : [],
//     displayOrder: Number.isFinite(Number(apiPlan.displayOrder))
//       ? Number(apiPlan.displayOrder)
//       : 0,
//     isFeatured: Boolean(apiPlan.isFeatured),
//     price: apiPlan.monthlyPrice,
//     icon: FaImage,
//     featured: Boolean(apiPlan.isFeatured),
//     to: isInternalLink ? ctaLink : undefined,
//     href: isInternalLink ? undefined : ctaLink,
//   };
// };

// const toPricingPayload = (plan) => ({
//   planKey: plan.planKey,
//   name: plan.name,
//   monthlyPrice: plan.monthlyPrice ?? null,
//   annualPrice: plan.annualPrice ?? null,
//   note: plan.note ?? "",
//   description: plan.description ?? "",
//   features: Array.isArray(plan.features) ? plan.features : [],
//   ctaLabel: plan.ctaLabel ?? "",
//   ctaLink: plan.ctaLink ?? plan.to ?? plan.href ?? "",
//   isFeatured: Boolean(plan.isFeatured),
//   displayOrder: Number(plan.displayOrder),
// });

// const validatePlan = (plan, plans, editingPlanKey) => {
//   const errors = {};
//   const planKey = String(plan.planKey).trim();

//   if (!planKey) {
//     errors.planKey = "Plan key is required.";
//   } else if (!/^[a-z0-9_-]+$/.test(planKey)) {
//     errors.planKey = "Use lowercase letters, numbers, hyphens, or underscores only.";
//   } else if (
//     plans.some(
//       (existing) =>
//         existing.planKey.toLowerCase() === planKey.toLowerCase() &&
//         existing.planKey !== editingPlanKey
//     )
//   ) {
//     errors.planKey = "Plan key must be unique.";
//   }

//   if (!String(plan.name).trim()) {
//     errors.name = "Plan name is required.";
//   }

//   if (!plan.customPricing) {
//     ["monthlyPrice", "annualPrice"].forEach((field) => {
//       const value = plan[field];
//       if (value === "" || !Number.isFinite(Number(value)) || Number(value) < 0) {
//         errors[field] = "Enter a number greater than or equal to zero.";
//       }
//     });
//   }

//   if (!String(plan.ctaLink).trim()) {
//     errors.ctaLink = "CTA link is required.";
//   } else if (!/^(\/(?!\/)|#|https:\/\/)/i.test(String(plan.ctaLink).trim())) {
//     errors.ctaLink = "Use an internal path, # anchor, or https:// URL.";
//   }

//   if (
//     String(plan.displayOrder).trim() === "" ||
//     !Number.isInteger(Number(plan.displayOrder))
//   ) {
//     errors.displayOrder = "Display order must be an integer.";
//   }

//   return errors;
// };

// function PricingModule() {
//   const [plans, setPlans] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [loadError, setLoadError] = useState("");
//   const [saving, setSaving] = useState(false);
//   const [deletingPlanKey, setDeletingPlanKey] = useState("");
//   const [form, setForm] = useState(EMPTY_PLAN);
//   const [formOpen, setFormOpen] = useState(false);
//   const [editingPlanKey, setEditingPlanKey] = useState(null);
//   const [featureDraft, setFeatureDraft] = useState("");
//   const [errors, setErrors] = useState({});
//   const [serverError, setServerError] = useState("");
//   const [reloadVersion, setReloadVersion] = useState(0);
//   const [savedSuccessfully, setSavedSuccessfully] = useState(false);

//   useEffect(() => {
//     let active = true;

//     getPricingPlans()
//       .then((responsePlans) => {
//         if (active) {
//           setPlans(sortPlans(responsePlans.map(normalizeApiPlan)));
//           setLoadError("");
//         }
//       })
//       .catch((error) => {
//         if (active) {
//           const message = getApiErrorMessage(error, "Pricing plans could not be loaded.");
//           setLoadError(message);
//           toastError(message);
//         }
//       })
//       .finally(() => {
//         if (active) {
//           setLoading(false);
//         }
//       });

//     return () => {
//       active = false;
//     };
//   }, [reloadVersion]);

//   const sortedPlans = useMemo(() => sortPlans(plans), [plans]);

//   const startAdd = () => {
//     setSavedSuccessfully(false);
//     setServerError("");
//     setFormOpen(true);
//     setEditingPlanKey(null);
//     setForm(getPlanForm());
//     setErrors({});
//     setFeatureDraft("");
//   };

//   const startEdit = (plan) => {
//     setSavedSuccessfully(false);
//     setServerError("");
//     setFormOpen(true);
//     setEditingPlanKey(plan.planKey);
//     setForm(getPlanForm(plan));
//     setErrors({});
//     setFeatureDraft("");
//   };

//   const cancelEdit = () => {
//     setFormOpen(false);
//     setEditingPlanKey(null);
//     setForm(getPlanForm());
//     setErrors({});
//     setFeatureDraft("");
//   };

//   const addFeature = () => {
//     const feature = featureDraft.trim();
//     if (!feature) return;

//     if (form.features.some((existing) => existing.toLowerCase() === feature.toLowerCase())) {
//       setErrors((current) => ({ ...current, features: "Features cannot be duplicated." }));
//       return;
//     }

//     setForm((current) => ({ ...current, features: [...current.features, feature] }));
//     setFeatureDraft("");
//     setErrors((current) => ({ ...current, features: "" }));
//   };

//   const removeFeature = (featureToRemove) => {
//     setForm((current) => ({
//       ...current,
//       features: current.features.filter((feature) => feature !== featureToRemove),
//     }));
//   };

//   const savePlan = async (event) => {
//     event.preventDefault();
//     const validationErrors = validatePlan(form, plans, editingPlanKey);
//     setErrors(validationErrors);
//     setServerError("");

//     if (Object.keys(validationErrors).length > 0) {
//       return;
//     }

//     const payload = {
//       planKey: String(form.planKey).trim(),
//       name: String(form.name).trim(),
//       monthlyPrice: form.customPricing ? null : Number(form.monthlyPrice),
//       annualPrice: form.customPricing ? null : Number(form.annualPrice),
//       note: String(form.note).trim(),
//       description: String(form.description).trim(),
//       features: form.features,
//       ctaLabel: String(form.ctaLabel).trim(),
//       ctaLink: String(form.ctaLink).trim(),
//       displayOrder: Number(form.displayOrder),
//       isFeatured: Boolean(form.isFeatured),
//     };

//     setSaving(true);
//     try {
//       const nextPlans = editingPlanKey
//         ? plans.map((plan) =>
//             plan.planKey === editingPlanKey
//               ? payload
//               : { ...toPricingPayload(plan), isFeatured: payload.isFeatured ? false : plan.isFeatured }
//           )
//         : [
//             ...plans.map((plan) => ({
//               ...toPricingPayload(plan),
//               isFeatured: payload.isFeatured ? false : plan.isFeatured,
//             })),
//             payload,
//           ];
//       const sortedNextPlans = sortPlans(nextPlans).map((plan) => ({
//         ...plan,
//         planKey: String(plan.planKey).trim(),
//         name: String(plan.name).trim(),
//         note: String(plan.note).trim(),
//         description: String(plan.description).trim(),
//         ctaLabel: String(plan.ctaLabel).trim(),
//         ctaLink: String(plan.ctaLink).trim(),
//         features: plan.features
//           .map((feature) => String(feature).trim())
//           .filter((feature, index, list) =>
//             feature && list.findIndex((item) => item.toLowerCase() === feature.toLowerCase()) === index
//           ),
//       }));
//       await savePricingPlans(sortedNextPlans);
//       publishPricingUpdated();
//       const savedPlans = await getPricingPlans();
//       setPlans(sortPlans(savedPlans.map(normalizeApiPlan)));
//       setLoadError("");
//       setSavedSuccessfully(true);
//       toastSuccess(editingPlanKey ? "Pricing plan updated." : "Pricing plan created.");
//       cancelEdit();
//     } catch (error) {
//       const message = getApiErrorMessage(
//         error,
//         "Pricing plan could not be saved or refreshed."
//       );
//       setServerError(message);
//       toastError(message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const deletePlan = async (plan) => {
//     if (!window.confirm(`Delete the ${plan.name} plan? This cannot be undone.`)) {
//       return;
//     }

//     setDeletingPlanKey(plan.planKey);
//     try {
//       await savePricingPlans(
//         plans
//           .filter((existingPlan) => existingPlan.planKey !== plan.planKey)
//           .map(toPricingPayload)
//       );
//       publishPricingUpdated();
//       const savedPlans = await getPricingPlans();
//       setPlans(sortPlans(savedPlans.map(normalizeApiPlan)));
//       setLoadError("");
//       toastSuccess("Pricing plan deleted.");
//       setSavedSuccessfully(true);
//       if (editingPlanKey === plan.planKey) {
//         cancelEdit();
//       }
//     } catch (error) {
//       toastError(getApiErrorMessage(error, "Pricing plan could not be deleted."));
//     } finally {
//       setDeletingPlanKey("");
//     }
//   };

//   return (
//     <SettingsCard
//       title="Pricing plans"
//       description="Plans shown on the landing page pricing section"
//       className="super-admin-workspace-card"
//       meta={
//         <button type="button" className="super-admin-workspace-primary" onClick={startAdd}>
//           <FaPlus aria-hidden="true" /> Add plan
//         </button>
//       }
//     >
//       {savedSuccessfully && (
//         <a
//           className="super-admin-pricing-landing-link"
//           href="/#pricing"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           View on landing page
//         </a>
//       )}
//       <div className="super-admin-plan-table-wrap">
//         <table className="super-admin-plan-table">
//           <thead>
//             <tr>
//               <th>Order</th>
//               <th>Plan</th>
//               <th>Monthly</th>
//               <th>Annual</th>
//               <th>Featured</th>
//               <th>Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {loading ? (
//               <tr><td colSpan="6">Loading pricing plans...</td></tr>
//             ) : loadError ? (
//               <tr>
//                 <td colSpan="6">
//                   Pricing plans could not be loaded: {loadError}{" "}
//                   <button
//                     type="button"
//                     className="super-admin-plan-retry"
//                     onClick={() => {
//                       setLoading(true);
//                       setReloadVersion((version) => version + 1);
//                     }}
//                   >
//                     Retry
//                   </button>
//                 </td>
//               </tr>
//             ) : sortedPlans.length === 0 ? (
//               <tr><td colSpan="6">No pricing plans found.</td></tr>
//             ) : sortedPlans.map((plan) => (
//               <tr key={plan.planKey}>
//                 <td>{plan.displayOrder}</td>
//                 <td>
//                   <strong>{plan.name}</strong>
//                   <small>{plan.planKey}</small>
//                 </td>
//                 <td>{plan.monthlyPrice == null ? "Custom" : formatINR(plan.monthlyPrice)}</td>
//                 <td>{plan.annualPrice == null ? "Custom" : formatINR(plan.annualPrice)}</td>
//                 <td><span className={`super-admin-featured-pill ${plan.isFeatured ? "is-featured" : ""}`}>{plan.isFeatured ? "Yes" : "No"}</span></td>
//                 <td>
//                   <div className="super-admin-plan-actions">
//                     <button type="button" aria-label={`Edit ${plan.name}`} onClick={() => startEdit(plan)}><FaEdit aria-hidden="true" /></button>
//                     <button
//                       type="button"
//                       className="is-danger"
//                       aria-label={`Delete ${plan.name}`}
//                       disabled={deletingPlanKey === plan.planKey}
//                       onClick={() => deletePlan(plan)}
//                     >
//                       <FaTrash aria-hidden="true" />
//                     </button>
//                   </div>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//       {formOpen ? (
//         <form className="super-admin-plan-form" onSubmit={savePlan} noValidate>
//           <h4 className="super-admin-plan-form-title">
//             {editingPlanKey
//               ? `Edit plan: ${form.name || editingPlanKey}`
//               : "Add pricing plan"}
//           </h4>
//           <div className="super-admin-plan-form-grid">
//             {serverError && (
//               <p className="super-admin-pricing-error super-admin-plan-form-wide" role="alert">
//                 {serverError}
//               </p>
//             )}
//             <label className="settings-field">
//               <span className="settings-field-label">Plan key *</span>
//               <input
//                 className="settings-input"
//                 value={form.planKey}
//                 onChange={(event) => setForm((current) => ({ ...current, planKey: event.target.value }))}
//                 aria-invalid={Boolean(errors.planKey)}
//               />
//               {errors.planKey && <span className="settings-field-error">{errors.planKey}</span>}
//             </label>
//             <label className="settings-field">
//               <span className="settings-field-label">Name *</span>
//               <input
//                 className="settings-input"
//                 value={form.name}
//                 onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
//                 aria-invalid={Boolean(errors.name)}
//               />
//               {errors.name && <span className="settings-field-error">{errors.name}</span>}
//             </label>
//             <label className="settings-field">
//               <span className="settings-field-label">Monthly price (₹)</span>
//               <input
//                 className="settings-input"
//                 type="number"
//                 min="0"
//                 step="0.01"
//                 value={form.monthlyPrice}
//                 disabled={form.customPricing}
//                 onChange={(event) => setForm((current) => ({ ...current, monthlyPrice: event.target.value }))}
//                 aria-invalid={Boolean(errors.monthlyPrice)}
//               />
//               {errors.monthlyPrice && <span className="settings-field-error">{errors.monthlyPrice}</span>}
//             </label>
//             <label className="settings-field">
//               <span className="settings-field-label">Annual price (₹)</span>
//               <input
//                 className="settings-input"
//                 type="number"
//                 min="0"
//                 step="0.01"
//                 value={form.annualPrice}
//                 disabled={form.customPricing}
//                 onChange={(event) => setForm((current) => ({ ...current, annualPrice: event.target.value }))}
//                 aria-invalid={Boolean(errors.annualPrice)}
//               />
//               {errors.annualPrice && <span className="settings-field-error">{errors.annualPrice}</span>}
//             </label>
//             <label className="settings-field super-admin-plan-form-wide">
//               <span className="settings-field-label">
//                 <input
//                   type="checkbox"
//                   checked={form.customPricing}
//                   onChange={(event) =>
//                     setForm((current) => ({
//                       ...current,
//                       customPricing: event.target.checked,
//                       monthlyPrice: "",
//                       annualPrice: "",
//                     }))
//                   }
//                 />{" "}
//                 Custom pricing (no fixed price)
//               </span>
//             </label>
//             <label className="settings-field">
//               <span className="settings-field-label">Price note</span>
//               <input
//                 className="settings-input"
//                 value={form.note}
//                 onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
//               />
//             </label>
//             <label className="settings-field">
//               <span className="settings-field-label">Display order *</span>
//               <input
//                 className="settings-input"
//                 type="number"
//                 step="1"
//                 value={form.displayOrder}
//                 onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))}
//                 aria-invalid={Boolean(errors.displayOrder)}
//               />
//               {errors.displayOrder && <span className="settings-field-error">{errors.displayOrder}</span>}
//             </label>
//             <label className="settings-field super-admin-plan-form-wide">
//               <span className="settings-field-label">Description</span>
//               <textarea
//                 className="settings-textarea"
//                 rows="3"
//                 value={form.description}
//                 onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
//               />
//             </label>
//             <div className="settings-field super-admin-plan-form-wide">
//               <span className="settings-field-label">Features</span>
//               <div className="super-admin-feature-input">
//                 <input
//                   className="settings-input"
//                   value={featureDraft}
//                   onChange={(event) => setFeatureDraft(event.target.value)}
//                   onKeyDown={(event) => {
//                     if (event.key === "Enter") {
//                       event.preventDefault();
//                       addFeature();
//                     }
//                   }}
//                   placeholder="Type a feature and press Enter"
//                 />
//                 <button type="button" className="super-admin-workspace-secondary" onClick={addFeature}>
//                   <FaPlus aria-hidden="true" /> Add
//                 </button>
//               </div>
//               {form.features.length > 0 && (
//                 <div className="super-admin-feature-chips">
//                   {form.features.map((feature) => (
//                     <span className="super-admin-feature-chip" key={feature}>
//                       {feature}
//                       <button
//                         type="button"
//                         aria-label={`Remove ${feature}`}
//                         onClick={() => removeFeature(feature)}
//                       >
//                         <FaTimes aria-hidden="true" />
//                       </button>
//                     </span>
//                   ))}
//                 </div>
//               )}
//               {errors.features && <span className="settings-field-error">{errors.features}</span>}
//             </div>
//             <label className="settings-field">
//               <span className="settings-field-label">CTA label</span>
//               <input
//                 className="settings-input"
//                 value={form.ctaLabel}
//                 onChange={(event) => setForm((current) => ({ ...current, ctaLabel: event.target.value }))}
//               />
//             </label>
//             <label className="settings-field">
//               <span className="settings-field-label">CTA link *</span>
//               <input
//                 className="settings-input"
//                 value={form.ctaLink}
//                 onChange={(event) => setForm((current) => ({ ...current, ctaLink: event.target.value }))}
//                 aria-invalid={Boolean(errors.ctaLink)}
//               />
//               {errors.ctaLink && <span className="settings-field-error">{errors.ctaLink}</span>}
//             </label>
//             <label className="super-admin-featured-toggle">
//               <input
//                 type="checkbox"
//                 checked={Boolean(form.isFeatured)}
//                 onChange={(event) => {
//                   setForm((current) => ({ ...current, isFeatured: event.target.checked }));
//                   setErrors((current) => ({ ...current, isFeatured: "" }));
//                 }}
//               />
//               <span>Featured plan (turning this on unfeatures the other plan)</span>
//             </label>
//             {errors.isFeatured && <span className="settings-field-error">{errors.isFeatured}</span>}
//           </div>
//           <div className="super-admin-workspace-actions">
//             <button type="button" className="super-admin-workspace-secondary" onClick={cancelEdit} disabled={saving}>
//               Cancel
//             </button>
//             <button type="submit" className="super-admin-workspace-primary" disabled={saving}>
//               <FaCheck aria-hidden="true" /> {saving ? "Saving..." : "Save plan"}
//             </button>
//           </div>
//         </form>
//       ) : null}

//     </SettingsCard>
//   );
// }

// function LogoModule() {
//   const [currentLogo, setCurrentLogo] = useState("");
//   const [previewUrl, setPreviewUrl] = useState("");
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [dragging, setDragging] = useState(false);
//   const [error, setError] = useState("");
//   const fileInputRef = useRef(null);

//   useEffect(() => {
//     let active = true;

//     getSuperAdminLandingLogo()
//       .then((logoData) => {
//         if (active) {
//           const logoUrl = logoData.logoUrl || logoData.companyLogo || "";
//           const logo = resolveLogoUrl(
//             logoUrl,
//             logoData.updatedAt || logoData.lastUpdated || Date.now()
//           );
//           if (!logo) {
//             throw new Error("The branding response did not contain a company logo.");
//           }
//           return verifyLogoImage(logo).then(() => {
//             if (active) setCurrentLogo(logo);
//           });
//         }
//       })
//       .catch((requestError) => {
//         if (active) {
//           setError(getApiErrorMessage(requestError, "Current logo could not be loaded."));
//         }
//       })
//       .finally(() => {
//         if (active) setLoading(false);
//       });

//     return () => {
//       active = false;
//     };
//   }, []);

//   useEffect(
//     () => () => {
//       if (previewUrl) URL.revokeObjectURL(previewUrl);
//     },
//     [previewUrl]
//   );

//   const selectLogo = (file) => {
//     if (!file) return;

//     const hasAllowedExtension = ALLOWED_LOGO_EXTENSIONS.test(file.name);
//     const hasAllowedType =
//       !file.type || ["image/png", "image/svg+xml", "image/webp"].includes(file.type);

//     if (!hasAllowedExtension || !hasAllowedType) {
//       setError("Choose a PNG, SVG, or WebP image.");
//       if (fileInputRef.current) fileInputRef.current.value = "";
//       return;
//     }
//     if (file.size > MAX_LOGO_BYTES) {
//       setError("The logo must be no larger than 2 MB.");
//       if (fileInputRef.current) fileInputRef.current.value = "";
//       return;
//     }

//     setError("");
//     setSelectedFile(file);
//     setPreviewUrl(URL.createObjectURL(file));
//   };

//   const cancelUpload = () => {
//     setSelectedFile(null);
//     setPreviewUrl("");
//     setError("");
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   };

//   const refreshLogo = async (fallbackLogoUrl = "") => {
//     let logoData;

//     try {
//       logoData = await getSuperAdminLandingLogo();
//     } catch (error) {
//       if (!fallbackLogoUrl) throw error;
//       logoData = { logoUrl: fallbackLogoUrl };
//     }

//     const logoUrl = logoData.logoUrl || logoData.companyLogo || fallbackLogoUrl;
//     const logo = resolveLogoUrl(
//       logoUrl,
//       logoData.updatedAt || logoData.lastUpdated || Date.now()
//     );
//     if (!logo) {
//       throw new Error("The branding response did not contain a company logo.");
//     }

//     await verifyLogoImage(logo);
//     setCurrentLogo(logo);
//     setError("");
//     notifySuperAdminLogoUpdated();
//     return logo;
//   };

//   const saveLogo = async () => {
//     if (!selectedFile) {
//       setError("Choose a logo file before uploading.");
//       return;
//     }

//     setSaving(true);
//     setError("");
//     try {
//       const uploadResponse = await uploadSuperAdminLandingLogo(selectedFile);
//       const uploadedLogoUrl =
//         uploadResponse.data?.logoUrl ||
//         uploadResponse.data?.companyLogo ||
//         uploadResponse.data?.data?.logoUrl ||
//         uploadResponse.data?.data?.companyLogo ||
//         "";
//       try {
//         await refreshLogo(uploadedLogoUrl);
//         cancelUpload();
//         toastSuccess("Logo uploaded and verified.");
//       } catch (refreshError) {
//         const message = getApiErrorMessage(
//           refreshError,
//           "The upload request succeeded, but the saved logo could not be loaded."
//         );
//         setError(message);
//         toastError(message);
//       }
//     } catch (uploadError) {
//       const message = getApiErrorMessage(uploadError, "Logo could not be uploaded.");
//       setError(message);
//       toastError(message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <SettingsCard
//       title="Company logo"
//       description="Upload the logo used on the public landing page and Super Admin workspace."
//       className="super-admin-workspace-card"
//     >
//       <div className="super-admin-logo-preview-panel">
//         <h4>Current logo</h4>
//         {loading ? (
//           <p>Loading logo...</p>
//         ) : currentLogo ? (
//           <img
//             src={currentLogo}
//             alt="Current company logo"
//             onError={() => setError("The current logo URL could not be loaded.")}
//           />
//         ) : (
//           <p>No company logo is currently configured.</p>
//         )}
//       </div>

//       <div
//         className={`super-admin-logo-dropzone ${dragging ? "is-dragging" : ""}`}
//         role="button"
//         tabIndex={0}
//         onClick={(event) => {
//           if (event.target !== fileInputRef.current) {
//             fileInputRef.current?.click();
//           }
//         }}
//         onKeyDown={(event) => {
//           if (event.key === "Enter" || event.key === " ") {
//             event.preventDefault();
//             fileInputRef.current?.click();
//           }
//         }}
//         onDragOver={(event) => {
//           event.preventDefault();
//           setDragging(true);
//         }}
//         onDragLeave={() => setDragging(false)}
//         onDrop={(event) => {
//           event.preventDefault();
//           setDragging(false);
//           selectLogo(event.dataTransfer.files?.[0]);
//         }}
//       >
//         {previewUrl ? (
//           <>
//             <img src={previewUrl} alt="Selected logo preview" />
//             <span>{selectedFile?.name}</span>
//           </>
//         ) : (
//           <>
//             <FaUpload aria-hidden="true" />
//             <strong>Drop a logo here or click to choose</strong>
//             <span>PNG, SVG, or WebP. Maximum file size: 2 MB.</span>
//           </>
//         )}
//         <input
//           ref={fileInputRef}
//           type="file"
//           accept=".png,.svg,.webp,image/png,image/svg+xml,image/webp"
//           hidden
//           onChange={(event) => selectLogo(event.target.files?.[0])}
//         />
//       </div>

//       {error && <p className="super-admin-logo-error" role="alert">{error}</p>}

//       <div className="super-admin-workspace-actions">
//         <button
//           type="button"
//           className="super-admin-workspace-primary"
//           disabled={!selectedFile || saving}
//           onClick={saveLogo}
//         >
//           <FaUpload aria-hidden="true" /> {saving ? "Saving..." : "Upload and save"}
//         </button>
//         <button
//           type="button"
//           className="super-admin-workspace-secondary"
//           disabled={saving}
//           onClick={cancelUpload}
//         >
//           Cancel
//         </button>
//       </div>
//     </SettingsCard>
//   );
// }

// function SuperAdminSettingsWorkspace() {
//   const [activeModule, setActiveModule] = useState("pricing");
//   const modules = [
//     { key: "pricing", label: "Pricing", description: "Landing page plans", icon: FaCog },
//     { key: "logo", label: "Logo", description: "Company brand asset", icon: FaImage },
//     { key: "contact", label: "Contact Email", description: "Landing page contact address", icon: FaAt },
//     { key: "email", label: "Email Settings", description: "Demo reply & SMTP senders", icon: FaEnvelope },
//   ];
//   const activeDefinition = modules.find((module) => module.key === activeModule) || modules[0];

//   return (
//     <div className="settings-page super-admin-settings-workspace">
//       <div className="settings-hero app-surface">
//         <div className="settings-hero-copy">
//           <h1 className="settings-title">Settings Workspace</h1>
//           <p className="settings-subtitle">
//             Manage public pricing, brand assets, landing page contact details, and demo request email configuration from one Super Admin workspace.
//             Modules switch without reloading the page.
//           </p>
//         </div>
//         <div className="settings-hero-stats">
//           <SettingsStatPill label="Total Modules" value={String(modules.length)} tone="info" />
//           <SettingsStatPill label="Active Module" value={activeDefinition.label} tone="info" />
//           <SettingsStatPill label="Workspace" value="Super Admin" tone="info" />
//         </div>
//       </div>

//       <div className="settings-layout">
//         <aside className="settings-nav app-surface">
//           <div className="settings-nav-head">
//             <span className="settings-nav-eyebrow">Modules</span>
//             <h2>Settings Navigation</h2>
//             <p>Select the module you want to configure.</p>
//           </div>
//           <div className="settings-nav-list" role="tablist" aria-label="Super Admin settings">
//             {modules.map(({ key, label, description, icon }) => (
//               <button
//                 type="button"
//                 role="tab"
//                 aria-selected={activeModule === key}
//                 className={`settings-sidebar-item settings-nav-item ${activeModule === key ? "active" : ""}`}
//                 key={key}
//                 onClick={() => setActiveModule(key)}
//               >
//                 <span className="settings-sidebar-icon settings-nav-icon">
//                   {React.createElement(icon)}
//                 </span>
//                 <span className="settings-nav-copy">
//                   <strong>{label}</strong>
//                   <span>{description}</span>
//                 </span>
//               </button>
//             ))}
//           </div>
//         </aside>

//         <section className="settings-content" role="tabpanel">
//           {activeModule === "pricing" ? (
//             <PricingModule />
//           ) : activeModule === "logo" ? (
//             <LogoModule />
//           ) : activeModule === "contact" ? (
//             <ContactEmailSettings />
//           ) : activeModule === "email" ? (
//             <SuperAdminEmailSettings />
//           ) : null}
//         </section>
//       </div>
//     </div>
//   );
// }

// export default SuperAdminSettingsWorkspace;
