import React, { useEffect, useRef, useState } from "react";
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
  FaEnvelope,
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
} from "react-icons/fa";
import { Link } from "react-router-dom";
import pirnavLogo from "../../assets/pirnav.png";
import DemoRequestSection from "./DemoRequestSection";
import ProductShowcase from "./ProductShowcase";
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

const PRICING_PLANS = [
  {
    name: "Starter",
    price: 2499,
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
    to: "/register",
    icon: FaRocket,
  },
  {
    name: "Growth",
    price: 4999,
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
    to: "/register",
    featured: true,
    icon: FaStar,
  },
  {
    name: "Enterprise",
    price: "Custom",
    note: "Tailored pricing",
    description:
      "Built for larger organizations that need advanced controls, integrations, and onboarding.",
    features: [
      "Custom workflows",
      "SSO and permissions",
      "Dedicated onboarding",
      "API integrations",
    ],
    ctaLabel: "Contact Pirnav",
    href: "mailto:contact@pirnav.com?subject=Pirnav%20HRMS%20Enterprise%20Inquiry",
    icon: FaBuilding,
  },
];

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const getPricingDetails = (plan, isAnnual) => {
  if (typeof plan.price !== "number") {
    return {
      note: plan.note,
      currentPrice: plan.price,
      currentSuffix: "",
      originalPrice: null,
      originalSuffix: "",
    };
  }

  if (!isAnnual) {
    return {
      note: "Per month",
      currentPrice: formatINR(plan.price),
      currentSuffix: "/month",
      originalPrice: null,
      originalSuffix: "",
    };
  }

  const annualPrice = Math.round(plan.price * 12 * 0.8);

  return {
    note: "Per year",
    currentPrice: formatINR(annualPrice),
    currentSuffix: "/year",
    originalPrice: formatINR(plan.price),
    originalSuffix: "/month",
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
  { label: "Privacy Policy", href: "#privacy" },
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
    className={`landing-section-heading landing-fade-up landing-section-heading--${size} ${
      align === "left" ? "landing-section-heading--left" : ""
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
      setDisplayValue(value);
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
          Manage Your Workforce with Pirnav
        </h1>

        <p className="landing-hero-description">
          Pirnav HRMS helps businesses manage employees, attendance, payroll, leave,
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
        description="From employee records and approvals to analytics and payroll, Pirnav HRMS brings your core people operations into one streamlined workspace."
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
        eyebrow="Why Choose Pirnav HRMS"
        title="Why Choose Pirnav HRMS"
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
        description="The numbers below reflect how Pirnav HRMS helps teams keep operations organized, visible, and dependable."
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

const PricingSection = () => {
  const [billing, setBilling] = useState("monthly");
  const isAnnual = billing === "annual";

  return (
    <section className="landing-section landing-section--alt" id="pricing">
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
          {PRICING_PLANS.map((plan, index) => {
            const pricing = getPricingDetails(plan, isAnnual);

            return (
              <article
                className={`landing-card landing-pricing-card landing-fade-up ${
                  plan.featured ? "is-featured" : ""
                }`}
                key={plan.name}
                style={{ "--reveal-delay": `${90 + index * 90}ms` }}
              >
                <div className="landing-pricing-badge-row">
                  <span
                    className={`landing-pricing-badge ${
                      plan.featured ? "" : "landing-pricing-badge--placeholder"
                    }`}
                  >
                    Most Popular
                  </span>
                </div>

                <div className="landing-pricing-head">
                  <span className="landing-pricing-icon" aria-hidden="true">
                    <plan.icon />
                  </span>
                  <div>
                    <h3 className="landing-pricing-name">{plan.name}</h3>
                    <p className="landing-pricing-note">{pricing.note}</p>
                  </div>
                  <div
                    className="landing-pricing-price-panel"
                    key={`${plan.name}-${billing}`}
                    aria-live="polite"
                  >
                    {pricing.originalPrice ? (
                      <p className="landing-pricing-price-original">
                        <span className="landing-pricing-price-original-value">
                          {pricing.originalPrice}
                        </span>
                        <span className="landing-pricing-price-original-period">
                          {pricing.originalSuffix}
                        </span>
                      </p>
                    ) : null}

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
                  {plan.features.map((feature) => (
                    <li className="landing-pricing-item" key={feature}>
                      <FaCheck aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.to ? (
                  <Link className="landing-primary-action landing-pricing-action" to={plan.to}>
                    {plan.ctaLabel}
                    <FaArrowRight aria-hidden="true" />
                  </Link>
                ) : (
                  <a className="landing-secondary-action landing-pricing-action" href={plan.href}>
                    {plan.ctaLabel}
                  </a>
                )}
              </article>
            );
          })}
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

const FooterSection = () => (
  <footer className="landing-footer">
    <div className="landing-shell">
      <div className="landing-footer-grid landing-fade-up" style={{ "--reveal-delay": "100ms" }}>
        <div className="landing-footer-brand landing-fade-up" style={{ "--reveal-delay": "80ms" }}>
          <div className="landing-footer-logo">
            <img src={pirnavLogo} alt="Pirnav" className="landing-footer-mark" />
          </div>

          <div className="landing-footer-brand-copy">
            <h3 className="landing-footer-brand-name">Pirnav HRMS</h3>

            <p className="landing-footer-brand-tagline">Intelligent people operations.</p>
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

        <div className="landing-footer-links-group landing-fade-up" style={{ "--reveal-delay": "260ms" }}>
          <h3 className="landing-footer-title">Contact</h3>
          <div className="landing-footer-contact">
            <a className="landing-footer-contact-link" href="mailto:contact@pirnav.com">
              <FaEnvelope aria-hidden="true" />
              <span>contact@pirnav.com</span>
            </a>
            <a
              className="landing-footer-contact-link"
              href="mailto:contact@pirnav.com"
            >
              <FaEnvelope aria-hidden="true" />
              <span>contact@pirnav.com</span>
            </a>
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
          {"\u00A9"} 2026 Pirnav. All rights reserved.
        </p>
        <nav className="landing-footer-bottom-links" aria-label="Footer policy links">
          {FOOTER_POLICY_LINKS.map((link) => (
            <a className="landing-footer-bottom-link" href={link.href} key={link.label}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  </footer>
);

const LandingNavbar = () => (
  <header className="landing-navbar">
    <div className="landing-shell landing-navbar-inner">
      <Link className="landing-brand" to="/">
        <div className="landing-brand-mark">
          <img src={pirnavLogo} alt="Pirnav logo" />
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
