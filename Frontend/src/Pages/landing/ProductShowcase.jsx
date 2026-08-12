import { useEffect, useRef, useState } from "react";
import {
  FaCalendarAlt,
  FaMoneyBillWave,
  FaRegClock,
  FaUser,
  FaUsers,
} from "react-icons/fa";
import employeeManagement from "../../assets/showcase/employee-management.png";
import attendance from "../../assets/showcase/attendance.png";
import payroll from "../../assets/showcase/payroll.png";
import leaveManagement from "../../assets/showcase/leave-management.png";
import employeeProfile from "../../assets/employee-profile.png";
import "./ProductShowcase.css";

const showcaseItems = [
  {
    id: "employee",
    title: "Employee Management",
    description: "Manage employees",
    image: employeeManagement,
    icon: FaUsers,
  },
  {
    id: "attendance",
    title: "Attendance",
    description: "Track attendance",
    image: attendance,
    icon: FaRegClock,
  },
  {
    id: "payroll",
    title: "Payroll",
    description: "Generate payroll",
    image: payroll,
    icon: FaMoneyBillWave,
  },
  {
    id: "leave",
    title: "Leave",
    description: "Manage leave",
    image: leaveManagement,
    icon: FaCalendarAlt,
  },
  {
    id: "employee-profile",
    title: "Employee Profile",
    description: "View profiles",
    image: employeeProfile,
    icon: FaUser,
  },
];

const PreviewImage = ({ feature, isVisible, labelledById }) => (
  <div
    className="showcase-preview landing-fade-up"
    role="tabpanel"
    id="showcase-panel"
    aria-labelledby={labelledById}
    aria-live="polite"
  >
    <img
      className={`showcase-preview-image ${isVisible ? "is-visible" : "is-hidden"}`}
      src={feature.image}
      alt={`Pirnav HRMS ${feature.title} screenshot`}
      loading="lazy"
      draggable="false"
    />
  </div>
);

const ProductShowcase = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [rotationResetKey, setRotationResetKey] = useState(0);
  const itemRefs = useRef([]);
  const autoRotateTimeoutRef = useRef(null);
  const previewTimeoutRef = useRef(null);
  const isInitialRenderRef = useRef(true);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const currentPreviewFeature = showcaseItems[previewIndex] ?? showcaseItems[0];
  const currentActiveFeature = showcaseItems[activeIndex] ?? showcaseItems[0];

  const clearAutoRotateTimeout = () => {
    if (autoRotateTimeoutRef.current) {
      window.clearTimeout(autoRotateTimeoutRef.current);
      autoRotateTimeoutRef.current = null;
    }
  };

  const clearPreviewTimeout = () => {
    if (previewTimeoutRef.current) {
      window.clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
  };

  useEffect(
    () => () => {
      clearAutoRotateTimeout();
      clearPreviewTimeout();
    },
    [],
  );

  useEffect(() => {
    clearAutoRotateTimeout();

    if (prefersReducedMotion) {
      setIsPreviewVisible(true);
      return undefined;
    }

    autoRotateTimeoutRef.current = window.setTimeout(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % showcaseItems.length);
    }, 3000);

    return clearAutoRotateTimeout;
  }, [activeIndex, rotationResetKey, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setPreviewIndex(activeIndex);
      setIsPreviewVisible(true);
      return undefined;
    }

    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      return undefined;
    }

    clearPreviewTimeout();
    setIsPreviewVisible(false);

    previewTimeoutRef.current = window.setTimeout(() => {
      setPreviewIndex(activeIndex);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setIsPreviewVisible(true);
        });
      });
    }, 150);

    return clearPreviewTimeout;
  }, [activeIndex, prefersReducedMotion]);

  const selectItem = (index, shouldFocus = false) => {
    const total = showcaseItems.length;
    const nextIndex = (index + total) % total;

    setActiveIndex(nextIndex);
    setRotationResetKey((value) => value + 1);

    if (shouldFocus) {
      itemRefs.current[nextIndex]?.focus();
    }
  };

  const handleKeyDown = (event) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();
        selectItem(activeIndex + 1, true);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();
        selectItem(activeIndex - 1, true);
        break;
      case "Home":
        event.preventDefault();
        selectItem(0, true);
        break;
      case "End":
        event.preventDefault();
        selectItem(showcaseItems.length - 1, true);
        break;
      default:
        break;
    }
  };

  return (
    <section className="landing-section product-showcase-section" id="showcase">
      <div className="product-showcase-shell">
        <div className="landing-section-heading product-showcase-heading landing-fade-up" style={{ "--reveal-delay": "80ms" }}>
          <p className="landing-page-label landing-section-eyebrow">Product Showcase</p>
          <h2 className="landing-heading-title landing-section-title">
            See Pirnav HRMS in Action
          </h2>
          <p className="landing-section-description product-showcase-description">
            Explore the modern Pirnav HRMS interface for employee management,
            attendance, payroll, leave management, and employee profiles, all
            from one intelligent platform.
          </p>
        </div>
        <div className="product-showcase-container">
          <div
            className="product-feature-list"
            role="tablist"
            aria-label="Pirnav HRMS product showcase features"
            onKeyDown={handleKeyDown}
          >
            {showcaseItems.map((feature, index) => {
              const isActive = index === activeIndex;
              const Icon = feature.icon;

              return (
                <button
                  key={feature.id}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  type="button"
                  id={`showcase-tab-${feature.id}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="showcase-panel"
                  tabIndex={isActive ? 0 : -1}
                  className="product-feature-card landing-fade-up"
                  style={{ "--reveal-delay": `${80 + index * 90}ms` }}
                  onClick={() => selectItem(index)}
                >
                  <span className="product-feature-icon" aria-hidden="true">
                    <Icon />
                  </span>

                  <span className="product-feature-copy">
                    <span className="product-feature-title">{feature.title}</span>
                    <span className="product-feature-description">
                      {feature.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <PreviewImage
            feature={currentPreviewFeature}
            isVisible={isPreviewVisible}
            labelledById={`showcase-tab-${currentActiveFeature.id}`}
          />
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;
