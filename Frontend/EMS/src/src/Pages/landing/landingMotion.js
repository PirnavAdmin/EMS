import { useEffect, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const useLandingRevealObserver = (rootRef) => {
  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return undefined;
    }

    const targets = Array.from(root.querySelectorAll(".landing-fade-up"));

    if (targets.length === 0) {
      return undefined;
    }

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      targets.forEach((element) => {
        element.classList.add("is-visible");
      });

      return undefined;
    }

    const visibleElements = new WeakSet();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || visibleElements.has(entry.target)) {
            return;
          }

          visibleElements.add(entry.target);
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    targets.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [rootRef]);
};

export const useOnceInView = (ref, options = {}) => {
  const { threshold = 0.25, rootMargin = "0px 0px -10% 0px" } = options;
  const [isVisible, setIsVisible] = useState(() => prefersReducedMotion());

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return undefined;
    }

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [ref, threshold, rootMargin]);

  return isVisible;
};
