import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FaArrowRight,
  FaBriefcase,
  FaBuilding,
  FaCalendarAlt,
  FaChartBar,
  FaChartLine,
  FaCheck,
  FaCheckCircle,
  FaClipboardList,
  FaCloud,
  FaBell,
  FaFacebookF,
  FaFileAlt,
  FaGlobe,
  FaInstagram,
  FaLayerGroup,
  FaLinkedinIn,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaPhoneAlt,
  FaPlay,
  FaRocket,
  FaShieldAlt,
  FaStar,
  FaUserCheck,
  FaUsers,
  FaYoutube,
  FaRegClock,
  FaBox,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import pirnavLogo from "../../assets/pirnav4.png";
import { useSuperAdminLogo } from "../../utils/brandingLogo";
import DemoRequestSection from "./DemoRequestSection";
import LandingContactEmailLink from "./LandingContactEmailLink";
import ProductShowcase from "./ProductShowcase";
import {
  DEFAULT_PRICING_PLANS,
  getPricingPlans,
  PRICING_UPDATED_EVENT,
} from "../../api/pricingApi";
import { useLandingRevealObserver, useOnceInView } from "./landingMotion";
import "./LandingPage.css";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
  { label: "Request Demo", href: "#request-demo" },
];

const HERO_BENEFITS = [
  "14-Day Free Trial",
  "Cancel Anytime",
];

const DASHBOARD_METRICS = [
  {
    label: "Employees",
    value: "1,284",
    detail: "+18 this month",
    icon: FaUsers,
  },
  {
    label: "Attendance",
    value: "96.4%",
    detail: "Live tracking across teams",
    icon: FaRegClock,
  },
  {
    label: "Present",
    value: "1,212",
    detail: "Checked in today",
    icon: FaCheckCircle,
  },
  {
    label: "On Leave",
    value: "72",
    detail: "Approved requests",
    icon: FaCalendarAlt,
  },
];

const ATTENDANCE_BARS = [68, 82, 74, 91, 88, 96, 84];

const RECENT_ACTIVITIES = [
  {
    title: "Payroll run completed",
    meta: "Today, 09:42 AM",
    icon: FaMoneyBillWave,
  },
  {
    title: "Payslips generated successfully",
    meta: "Finance team",
    icon: FaFileAlt,
  },
  {
    title: "4 employees onboarded",
    meta: "Recruitment",
    icon: FaUsers,
  },
  {
    title: "Leave request approved",
    meta: "HR admin",
    icon: FaClipboardList,
  },
  {
    title: "Attendance report generated",
    meta: "Workforce analytics",
    icon: FaRegClock,
  },
];

const NOTIFICATIONS = [
  {
    title: "Attendance variance detected",
    meta: "Operations team",
    icon: FaBell,
  },
  {
    title: "Payslip generation completed",
    meta: "Payroll automation",
    icon: FaMoneyBillWave,
  },
  {
    title: "Leave approval pending",
    meta: "Manager action required",
    icon: FaRegClock,
  },
];

const LEAVE_REQUESTS = [
  {
    title: "2 pending approvals",
    meta: "Sick and casual leave",
    icon: FaClipboardList,
  },
  {
    title: "1 urgent request",
    meta: "Manager review required",
    icon: FaRegClock,
  },
];

const FEATURE_CARDS = [
  {
    title: "Employee Management",
    description:
      "Centralize employee records, department structures, and lifecycle details in one secure workspace.",
    icon: FaUsers,
  },
  {
    title: "Attendance",
    description:
      "Track shifts, punch-ins, and attendance patterns with live visibility across teams and locations.",
    icon: FaRegClock,
  },
  {
    title: "Leave",
    description:
      "Simplify leave planning, approvals, and balance tracking with flexible policies and reminders.",
    icon: FaClipboardList,
  },
  {
    title: "Payroll",
    description:
      "Run payroll confidently with automated calculations, deductions, and payslip distribution.",
    icon: FaMoneyBillWave,
  },
  {
    title: "Performance",
    description:
      "Support goal setting, feedback cycles, and employee growth with structured review workflows.",
    icon: FaChartLine,
  },
  {
    title: "Reports & Analytics",
    description:
      "Turn people data into actionable insights with clear dashboards and export-ready reports.",
    icon: FaChartBar,
  },
];

const WHY_CARDS = [
  {
    title: "Easy to Use",
    description:
      "Simple workflows and a clean interface help teams get productive quickly without a long learning curve.",
    icon: FaPlay,
  },
  {
    title: "Secure & Reliable",
    description:
      "Role-based access, audit-friendly controls, and consistent performance keep your HR data protected.",
    icon: FaShieldAlt,
  },
  {
    title: "Cloud Based",
    description:
      "Access HR operations from anywhere with a responsive cloud platform that scales with your growth.",
    icon: FaCloud,
  },
];

const STAT_CARDS = [
  {
    value: 1284,
    suffix: "",
    label: "Employees Managed",
    detail: "Centralize HR records, teams, and workforce operations in one intelligent system.",
    icon: FaUsers,
  },
  {
    value: 96.4,
    suffix: "%",
    label: "Attendance Visibility",
    detail: "Live insights into check-ins, leaves, and workforce presence across locations.",
    icon: FaRegClock,
  },
  {
    value: 99.9,
    suffix: "%",
    label: "Platform Reliability",
    detail: "Designed for dependable HR operations and consistent daily performance.",
    icon: FaGlobe,
  },
  {
    value: 24,
    suffix: "/7",
    label: "HR Operations",
    detail: "Access payroll, attendance, leave, and reports around the clock.",
    icon: FaPhoneAlt,
  },
];

const normalizeFeatures = (features, fallback = []) => {
  const source = Array.isArray(features) ? features : fallback;
  const seen = new Set();

  return source
    .map((feature) => String(feature ?? "").trim())
    .filter((feature) => {
      const key = feature.toLowerCase();
      if (!feature || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const mergePricingPlans = (apiPlans) => {
  const iconByPlanKey = {
    starter: FaRocket,
    growth: FaStar,
    enterprise: FaBuilding,
  };
  return apiPlans
    .map((apiPlan = {}, index) => {
      const planKey =
        typeof apiPlan.planKey === "string" && apiPlan.planKey.trim()
          ? apiPlan.planKey.trim()
          : `plan-${index + 1}`;
      const ctaLink =
        typeof apiPlan.ctaLink === "string" && apiPlan.ctaLink.trim()
          ? apiPlan.ctaLink.trim()
          : "#request-demo";
      const isInternalLink =
        ctaLink.startsWith("/") && !ctaLink.startsWith("//");
      const isSecureExternalLink = /^https:\/\//i.test(ctaLink);
      const isDemoAnchor = ctaLink.startsWith("#");
      const safeCtaLink =
        isInternalLink || isSecureExternalLink || isDemoAnchor
          ? ctaLink
          : "#request-demo";

      return {
        ...apiPlan,
        planKey,
        name: String(apiPlan.name ?? "Plan"),
        description: String(apiPlan.description ?? ""),
        price:
          apiPlan.monthlyPrice === null
            ? null
            : Number.isFinite(Number(apiPlan.monthlyPrice))
              ? Number(apiPlan.monthlyPrice)
              : null,
        monthlyPrice:
          apiPlan.monthlyPrice === null
            ? null
            : Number.isFinite(Number(apiPlan.monthlyPrice))
              ? Number(apiPlan.monthlyPrice)
              : null,
        annualPrice:
          apiPlan.annualPrice === null
            ? null
            : Number.isFinite(Number(apiPlan.annualPrice))
              ? Number(apiPlan.annualPrice)
              : null,
        features: normalizeFeatures(apiPlan.features),
        note: String(apiPlan.note ?? ""),
        ctaLabel: String(apiPlan.ctaLabel ?? "Learn more"),
        displayOrder: Number.isFinite(Number(apiPlan.displayOrder))
          ? Number(apiPlan.displayOrder)
          : index,
        icon: iconByPlanKey[planKey] || FaBox,
        featured: Boolean(apiPlan.isFeatured),
        to: isInternalLink ? safeCtaLink : undefined,
        href: isInternalLink ? undefined : safeCtaLink,
        external: isSecureExternalLink,
        demoAnchor: isDemoAnchor,
      };
    })
    .sort(
      (first, second) =>
        Number(first.displayOrder ?? 0) - Number(second.displayOrder ?? 0) ||
        String(first.name).localeCompare(String(second.name))
    );
};

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const getPricingDetails = (plan, isAnnual) => {
  const selectedPrice = isAnnual ? plan.annualPrice : plan.price;

  if (
    plan.monthlyPrice === null ||
    plan.annualPrice === null ||
    selectedPrice === null ||
    typeof selectedPrice !== "number" ||
    !Number.isFinite(selectedPrice)
  ) {
    return {
      note: plan.note,
      currentPrice: "Custom",
      currentSuffix: "",
    };
  }

  return {
    note: plan.note || (isAnnual ? "Per year" : "Per month"),
    currentPrice: formatINR(selectedPrice),
    currentSuffix: isAnnual ? "/year" : "/month",
  };
};

const SOCIAL_LINKS = [
  { label: "LinkedIn", icon: FaLinkedinIn },
  { label: "Facebook", icon: FaFacebookF },
  { label: "Instagram", icon: FaInstagram },
  { label: "YouTube", icon: FaYoutube },
];

const FOOTER_LINKS = {
  quick: [
    { label: "Home", href: "#home" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Request Demo", href: "#request-demo" },
  ],
  company: [
    { label: "About", href: "#home" },
    { label: "Security", href: "#features" },
    { label: "Careers", href: "#pricing" },
    { label: "Contact", href: "#contact" },
  ],
  resources: [
    { label: "Help Center", href: "#contact" },
    { label: "Documentation", href: "#features" },
    { label: "Security", href: "#features" },
    { label: "FAQ", href: "#contact" },
  ],
};

const FOOTER_POLICY_LINKS = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "#terms" },
  { label: "Cookie Policy", href: "#cookies" },
];

const SectionHeading = ({
  align = "center",
  eyebrow,
  title,
  description,
  size = "default",
  style,
}) => (
  <div
    className={`landing-section-heading landing-fade-up landing-section-heading--${size} ${align === "left" ? "landing-section-heading--left" : ""
      }`}
    style={style}
  >
    {eyebrow ? (
      <p className="landing-page-label landing-section-eyebrow">{eyebrow}</p>
    ) : null}
    <h2 className="landing-heading-title landing-section-title">{title}</h2>
    {description ? (
      <p className="landing-section-description">{description}</p>
    ) : null}
  </div>
);

const DashboardPanel = ({ icon, title, subtitle, children }) => (
  <section className="landing-dashboard-panel">
    <div className="landing-dashboard-panel-title">
      <div className="landing-dashboard-panel-heading">
        <span className="landing-dashboard-panel-icon" aria-hidden="true">
          {React.createElement(icon)}
        </span>
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
    </div>
    {children}
  </section>
);

const AnimatedStat = ({ icon, value, suffix, label, detail, delay }) => {
  const statRef = useRef(null);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [displayValue, setDisplayValue] = useState(() =>
    prefersReducedMotion ? value : 0
  );
  const isVisible = useOnceInView(statRef, { threshold: 0.3 });

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    if (prefersReducedMotion) {
      return undefined;
    }

    let frameId;
    const start = window.performance.now();
    const duration = 1100;

    const tick = (timestamp) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * eased);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [value, prefersReducedMotion, isVisible]);

  const animatedValue = prefersReducedMotion ? value : displayValue;
  const formattedValue = Number.isInteger(value)
    ? Math.round(animatedValue)
    : animatedValue.toFixed(1);

  return (
    <article
      ref={statRef}
      className="landing-stat-card landing-card landing-fade-up"
      style={{ "--reveal-delay": delay }}
    >
      <span className="landing-stat-icon" aria-hidden="true">
        {React.createElement(icon)}
      </span>
      <div className="landing-stat-value">
        {formattedValue}
        {suffix}
      </div>
      <h3 className="landing-stat-label">{label}</h3>
      <p className="landing-stat-detail">{detail}</p>
    </article>
  );
};

const HeroSection = () => (
  <section className="landing-section landing-hero-section" id="home">
    <div
      className="landing-shell landing-hero-grid landing-fade-up"
      style={{ "--reveal-delay": "40ms" }}
    >
      <div className="landing-hero-copy">
        <div className="landing-kicker">
          <FaStar aria-hidden="true" />
          <span>Modern HR Platform</span>
        </div>

        <h1 className="landing-heading-title landing-hero-title">
          Manage Your Workforce with Peoplehrsync
        </h1>

        <p className="landing-hero-description">
          Peoplehrsync helps businesses manage employees, attendance, payroll, leave,
          recruitment, onboarding, performance, documents, and reports from one
          intelligent platform.
        </p>

        <div className="landing-hero-actions">
          <Link className="landing-primary-action landing-hero-action" to="/register">
            Get Started
            <FaArrowRight aria-hidden="true" />
          </Link>

          <a className="landing-secondary-action landing-hero-action" href="#request-demo">
            Book Demo
          </a>
        </div>

        <div className="landing-hero-meta">
          {HERO_BENEFITS.map((benefit) => (
            <span className="landing-meta-item" key={benefit}>
              <FaCheck aria-hidden="true" />
              <span>{benefit}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="landing-dashboard landing-hero-visual">
        <div className="landing-dashboard-topbar">
          <div className="landing-dashboard-brand">
            <span className="landing-dashboard-brand-icon" aria-hidden="true">
              <FaLayerGroup />
            </span>
            <div>
              <p className="landing-dashboard-brand-title">Live Overview</p>
              <p className="landing-dashboard-brand-subtitle">Product snapshot</p>
            </div>
          </div>

          <div className="landing-dashboard-chip-group">
            <span className="landing-dashboard-chip">Employees</span>
            <span className="landing-dashboard-chip">Attendance</span>
            <span className="landing-dashboard-chip">Payroll</span>
          </div>
        </div>

        <div className="landing-dashboard-metrics">
          {DASHBOARD_METRICS.map(({ label, value, detail, icon }) => (
            <article className="landing-dashboard-metric" key={label}>
              <div className="landing-dashboard-metric-top">
                <span className="landing-dashboard-metric-label">{label}</span>
                <span className="landing-dashboard-metric-icon" aria-hidden="true">
                  {React.createElement(icon)}
                </span>
              </div>
              <p className="landing-dashboard-metric-value">{value}</p>
              <p className="landing-dashboard-metric-detail">{detail}</p>
            </article>
          ))}
        </div>

        <div className="landing-dashboard-grid">
          <DashboardPanel
            icon={FaChartLine}
            title="Attendance Graph"
            subtitle="Weekly attendance trends"
          >
            <div className="landing-chart">
              <div className="landing-chart-bars">
                {ATTENDANCE_BARS.map((barValue, index) => (
                  <div className="landing-chart-bar" key={`${barValue}-${index}`}>
                    <div className="landing-chart-bar-track">
                      <span
                        className="landing-chart-bar-fill"
                        style={{ height: `${barValue}%` }}
                        aria-hidden="true"
                      />
                    </div>
                    <span className="landing-chart-bar-label">
                      {["M", "T", "W", "T", "F", "S", "S"][index]}
                    </span>
                  </div>
                ))}
              </div>

              <div className="landing-chart-footnote">
                <span>
                  <FaCheckCircle aria-hidden="true" />
                  <span>96.4% average attendance</span>
                </span>
                <span>
                  <FaRegClock aria-hidden="true" />
                  <span>2 late check-ins</span>
                </span>
              </div>
            </div>
          </DashboardPanel>

          <div className="landing-dashboard-sidebar">
            <DashboardPanel icon={FaFileAlt} title="Recent Activities" subtitle="What happened today">
              <div className="landing-list">
                {RECENT_ACTIVITIES.map(({ title, meta, icon }) => (
                  <div className="landing-list-item" key={title}>
                    <span className="landing-list-icon" aria-hidden="true">
                      {React.createElement(icon)}
                    </span>
                    <div className="landing-list-copy">
                      <p className="landing-list-title">{title}</p>
                      <p className="landing-list-meta">{meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardPanel>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const FeaturesSection = () => (
  <section className="landing-section" id="features">
    <div className="landing-shell">
      <SectionHeading
        eyebrow="Features"
        title="Everything You Need to Run HR"
        description="From employee records and approvals to analytics and payroll, Peoplehrsync brings your core people operations into one streamlined workspace."
      />

      <div className="landing-feature-grid">
        {FEATURE_CARDS.map(({ title, description, icon }, index) => (
          <article
            className="landing-card landing-feature-card landing-fade-up"
            key={title}
            style={{ "--reveal-delay": `${80 + index * 90}ms` }}
          >
            <span className="landing-card-icon" aria-hidden="true">
              {React.createElement(icon)}
            </span>
            <h3 className="landing-card-title">{title}</h3>
            <p className="landing-card-copy">{description}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

const WhyChooseSection = () => (
  <section className="landing-section landing-section--alt" id="why-choose">
    <div className="landing-shell">
      <SectionHeading
        eyebrow="Why Choose Peoplehrsync "
        title="Why Choose Peoplehrsync "
        description="Give HR, operations, and leadership a shared platform that is easy to adopt, secure to use, and ready to grow with the business."
      />

      <div className="landing-why-grid">
        {WHY_CARDS.map(({ title, description, icon }, index) => (
          <article
            className="landing-card landing-why-card landing-fade-up"
            key={title}
            style={{ "--reveal-delay": `${90 + index * 90}ms` }}
          >
            <span className="landing-card-icon landing-card-icon--accent" aria-hidden="true">
              {React.createElement(icon)}
            </span>
            <h3 className="landing-card-title">{title}</h3>
            <p className="landing-card-copy">{description}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

const StatisticsSection = () => (
  <section className="landing-section" id="statistics">
    <div className="landing-shell">
      <SectionHeading
        eyebrow="Statistics"
        title="Results That Matter"
        description="The numbers below reflect how Peoplehrsync HRMS helps teams keep operations organized, visible, and dependable."
        size="stats"
      />

      <div className="landing-stat-grid">
        {STAT_CARDS.map((card, index) => (
          <AnimatedStat
            key={card.label}
            delay={`${80 + index * 90}ms`}
            {...card}
          />
        ))}
      </div>
    </div>
  </section>
);

class PricingCardsErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(previousProps) {
    if (
      this.state.hasError &&
      previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="landing-pricing-status" role="alert">
          Pricing plans could not be displayed.
          <button type="button" className="landing-pricing-retry" onClick={this.props.onRetry}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const PricingSection = () => {
  const [billing, setBilling] = useState("monthly");
  const [pricingPlans, setPricingPlans] = useState([]);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState("");
  const [renderRevision, setRenderRevision] = useState(0);
  const sectionRef = useRef(null);
  const isVisibleRef = useRef(false);
  const requestIdRef = useRef(0);
  const isAnnual = billing === "annual";

  const fetchPricing = useCallback(async (showLoading = false) => {
    const requestId = ++requestIdRef.current;
    if (showLoading) setPricingLoading(true);

    try {
      const plans = await getPricingPlans();
      if (requestId !== requestIdRef.current) return;
      setPricingPlans(mergePricingPlans(plans));
      setPricingError("");
      setRenderRevision((revision) => revision + 1);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setPricingPlans(mergePricingPlans(DEFAULT_PRICING_PLANS));
      setPricingError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load pricing plans."
      );
      setRenderRevision((revision) => revision + 1);
    } finally {
      if (requestId === requestIdRef.current) {
        setPricingLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchPricing(true);
    return () => {
      requestIdRef.current += 1;
    };
  }, [fetchPricing]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { rootMargin: "200px" }
    );
    observer.observe(section);

    const onFocus = () => {
      if (document.visibilityState === "visible") void fetchPricing();
    };
    const onStorage = (event) => {
      if (event.key === PRICING_UPDATED_EVENT) void fetchPricing();
    };
    let channel;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(PRICING_UPDATED_EVENT);
        channel.onmessage = (event) => {
          if (event.data?.type === PRICING_UPDATED_EVENT) void fetchPricing();
        };
      }
    } catch (error) {
      console.error("Could not listen for pricing updates.", error);
    }

    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    const intervalId = window.setInterval(() => {
      if (isVisibleRef.current && document.visibilityState === "visible") {
        void fetchPricing();
      }
    }, 60_000);

    return () => {
      observer.disconnect();
      channel?.close();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(intervalId);
    };
  }, [fetchPricing]);

  return (
    <section className="landing-section landing-section--alt" id="pricing" ref={sectionRef}>
      <div className="landing-shell">
        <SectionHeading
          eyebrow="Pricing"
          title="Flexible Plans for Every Stage of Growth"
          description="Choose a package that fits your team today and scale up whenever you need more automation, visibility, or support."
        />

        <div className="pricing-toggle-container" role="group" aria-label="Billing period">
          <button
            type="button"
            className={`pricing-toggle-option ${!isAnnual ? "is-active" : ""}`}
            onClick={() => setBilling("monthly")}
            aria-pressed={!isAnnual}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`pricing-toggle-option ${isAnnual ? "is-active" : ""}`}
            onClick={() => setBilling("annual")}
            aria-pressed={isAnnual}
          >
            Annual
          </button>
        </div>

        <div className="landing-pricing-grid">
          <PricingCardsErrorBoundary
            resetKey={renderRevision}
            onRetry={() => void fetchPricing(true)}
          >
            <>
          {pricingLoading ? (
            Array.from({ length: 3 }, (_, index) => (
              <article
                className="landing-card landing-pricing-skeleton"
                key={`pricing-skeleton-${index}`}
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
                <span />
              </article>
            ))
          ) : pricingError ? (
            <div className="landing-pricing-status" role="alert">
              <p>
                Unable to load the latest pricing plans. Showing default plans.
                {" "}{pricingError}
              </p>
              <button
                type="button"
                className="landing-pricing-retry"
                onClick={() => {
                  void fetchPricing(true);
                }}
              >
                Try again
              </button>
            </div>
          ) : pricingPlans.length === 0 ? (
            <p className="landing-pricing-status" role="status">
              Pricing will be available soon
            </p>
          ) : null}
          {!pricingLoading && pricingPlans.map((plan) => {
            const pricing = getPricingDetails(plan, isAnnual);

            return (
              <article
                className={`landing-card landing-pricing-card ${plan.featured ? "is-featured" : ""
                  }`}
                key={plan.planKey}
              >
                {plan.featured && (
                  <div className="landing-pricing-badge-row">
                    <span className="landing-pricing-badge">Most Popular</span>
                  </div>
                )}

                <div className="landing-pricing-head">
                  <span className="landing-pricing-icon" aria-hidden="true">
                    {React.createElement(plan.icon || FaBox)}
                  </span>
                  <div className="landing-pricing-plan-copy">
                    <h3 className="landing-pricing-name">{plan.name}</h3>
                    <p className="landing-pricing-note">{pricing.note}</p>
                  </div>
                  <div
                    className="landing-pricing-price-panel"
                    key={`${plan.name}-${billing}`}
                    aria-live="polite"
                  >
                    <div className="landing-pricing-price-row">
                      <p className="landing-pricing-price">{pricing.currentPrice}</p>
                      {pricing.currentSuffix ? (
                        <span className="landing-pricing-price-period">{pricing.currentSuffix}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <p className="landing-pricing-description">{plan.description}</p>

                <ul className="landing-pricing-list">
                  {plan.features.map((feature, featureIndex) => (
                    <li className="landing-pricing-item" key={`${feature}-${featureIndex}`}>
                      <FaCheck aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.to ? (
                  <Link
                    className={`${plan.monthlyPrice == null || plan.annualPrice == null ? "landing-secondary-action is-custom" : "landing-primary-action"} landing-pricing-action`}
                    to={plan.to}
                  >
                    {plan.ctaLabel}
                    {plan.monthlyPrice != null && plan.annualPrice != null && (
                      <FaArrowRight aria-hidden="true" />
                    )}
                  </Link>
                ) : (
                  <a
                    className={`${plan.monthlyPrice == null || plan.annualPrice == null ? "landing-secondary-action is-custom" : "landing-primary-action"} landing-pricing-action`}
                    href={plan.href}
                    target={plan.external ? "_blank" : undefined}
                    rel={plan.external ? "noopener noreferrer" : undefined}
                    onClick={(event) => {
                      if (plan.demoAnchor) {
                        event.preventDefault();
                        document
                          .getElementById(plan.href.slice(1))
                          ?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }
                    }}
                  >
                    {plan.ctaLabel}
                    {plan.monthlyPrice != null && plan.annualPrice != null && (
                      <FaArrowRight aria-hidden="true" />
                    )}
                  </a>
                )}
              </article>
            );
          })}
            </>
          </PricingCardsErrorBoundary>
        </div>
      </div>
    </section>
  );
};

const CtaSection = () => (
  <section className="landing-section landing-cta-section" id="contact">
    <div className="landing-shell">
      <div className="landing-cta-card landing-fade-up" style={{ "--reveal-delay": "90ms" }}>
        <div className="landing-cta-copy">
          <p className="landing-page-label landing-cta-eyebrow">
            Ready to Simplify HR Management?
          </p>
          <h2 className="landing-heading-title landing-cta-title">
            Ready to Simplify HR Management?
          </h2>
          <p className="landing-cta-description">
            Give your team a modern HR platform that keeps attendance, payroll,
            leave, recruitment, and reporting in one reliable place.
          </p>
        </div>

        <div className="landing-cta-actions">
          <Link className="landing-cta-primary" to="/register">
            Start Free Trial
            <FaArrowRight aria-hidden="true" />
          </Link>
          <a className="landing-cta-secondary" href="#request-demo">
            Book Demo
          </a>
        </div>
      </div>
    </div>
  </section>
);

const FooterSection = () => {
  const { logoSrc } = useSuperAdminLogo();
  const displayedLogo = logoSrc || pirnavLogo;

  return (
  <footer className="landing-footer">
    <div className="landing-shell">
      <div className="landing-footer-grid landing-fade-up" style={{ "--reveal-delay": "100ms" }}>
        <div className="landing-footer-brand landing-fade-up" style={{ "--reveal-delay": "80ms" }}>
          <div className="landing-footer-logo">
            {displayedLogo && (
              <img src={displayedLogo} alt="Pirnav" className="landing-footer-mark" />
            )}
          </div>

       

          <p className="landing-footer-copy">
            A modern HRMS platform for smarter employee management, attendance, payroll, leave, and workforce operations.
          </p>

          <div className="landing-footer-socials" aria-label="Social links">
            {SOCIAL_LINKS.map(({ label, icon }) => (
              <a className="landing-social-link" href="#contact" aria-label={label} key={label}>
                {React.createElement(icon, { "aria-hidden": true })}
              </a>
            ))}
          </div>
        </div>

        <div className="landing-footer-links-group landing-fade-up" style={{ "--reveal-delay": "140ms" }}>
          <h3 className="landing-footer-title">Quick Links</h3>
          <div className="landing-footer-links">
            {FOOTER_LINKS.quick.map((link) => (
              <a className="landing-footer-link" href={link.href} key={link.label}>
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="landing-footer-links-group landing-fade-up" style={{ "--reveal-delay": "180ms" }}>
          <h3 className="landing-footer-title">Company</h3>
          <div className="landing-footer-links">
            {FOOTER_LINKS.company.map((link) => (
              <a className="landing-footer-link" href={link.href} key={link.label}>
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="landing-footer-links-group landing-fade-up" style={{ "--reveal-delay": "220ms" }}>
          <h3 className="landing-footer-title">Resources</h3>
          <div className="landing-footer-links">
            {FOOTER_LINKS.resources.map((link) => (
              <a className="landing-footer-link" href={link.href} key={link.label}>
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="landing-footer-links-group landing-footer-links-group--contact landing-fade-up" style={{ "--reveal-delay": "260ms" }}>
          <h3 className="landing-footer-title">Contact</h3>
          <div className="landing-footer-contact">
            <LandingContactEmailLink />
          
            <div className="landing-footer-contact-link landing-footer-contact-link--static">
              <FaMapMarkerAlt aria-hidden="true" />
              <span>India</span>
            </div>
          </div>
        </div>
      </div>

      <div className="landing-footer-divider" aria-hidden="true" />

      <div className="landing-footer-bottom landing-fade-up" style={{ "--reveal-delay": "300ms" }}>
        <p className="landing-footer-bottom-copy">
          {"\u00A9"} 2026 Peoplehrsync. All rights reserved.
        </p>
        <nav className="landing-footer-bottom-links" aria-label="Footer policy links">
          {FOOTER_POLICY_LINKS.map((link) => (
            <Link
              className="landing-footer-bottom-link"
              to={link.href}
              key={link.label}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  </footer>
  );
};

const LandingNavbar = () => {
  const { logoSrc } = useSuperAdminLogo();
  const displayedLogo = logoSrc || pirnavLogo;

  return (
  <header className="landing-navbar">
    <div className="landing-shell landing-navbar-inner">
      <Link className="landing-brand" to="/">
        <div className="landing-brand-mark">
          {displayedLogo && <img src={displayedLogo} alt="Pirnav logo" />}
        </div>
      </Link>

      <nav className="landing-nav" aria-label="Primary">
        {NAV_LINKS.map((link) => (
          <a className="landing-nav-link" href={link.href} key={link.label}>
            {link.label}
          </a>
        ))}
      </nav>

      <div className="landing-nav-actions">
        <Link className="landing-secondary-action landing-nav-action" to="/login">
          Login
        </Link>
        <Link className="landing-primary-action landing-nav-action" to="/register">
          Get Started
        </Link>
      </div>
    </div>
  </header>
  );
};

function LandingPage() {
  const landingRootRef = useRef(null);

  useLandingRevealObserver(landingRootRef);

  return (
    <div className="landing-page" ref={landingRootRef}>
      <LandingNavbar />
      <main className="landing-main">
        <HeroSection />
        <DemoRequestSection />
        <FeaturesSection />
        <ProductShowcase />
        <WhyChooseSection />
        <StatisticsSection />
        <PricingSection />
        <CtaSection />
      </main>
      <FooterSection />
    </div>
  );
}

export default LandingPage;













