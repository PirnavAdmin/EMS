import React from "react";
import "./SalaryStructureCard.css";

import {
  SALARY_MAX,
  SALARY_MIN,
  formatCurrency,
} from "../utils/salaryStructure";

function SalaryStructureCard({
  idPrefix,
  ctcValue,
  disabled = false,
  onCtcChange,
  sliderRef = null,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [dropdownSearch, setDropdownSearch] = React.useState("");
  const dropdownRef = React.useRef(null);
  const searchInputRef = React.useRef(null);

  const parsedCtcValue = Number(ctcValue);
  const currentValue = Number.isFinite(parsedCtcValue)
    ? parsedCtcValue
    : SALARY_MIN;

  const sliderProgress = Math.max(
    0,
    Math.min(
      100,
      ((currentValue - SALARY_MIN) / (SALARY_MAX - SALARY_MIN)) * 100
    )
  );

  const salaryOptions = Array.from(
    { length: ((SALARY_MAX - SALARY_MIN) / 50000) + 1 },
    (_, index) => SALARY_MIN + (index * 50000)
  );

  const hasExactDropdownValue = salaryOptions.includes(currentValue);
  const dropdownOptions = hasExactDropdownValue
    ? salaryOptions
    : [currentValue, ...salaryOptions];

  const normalizedSearchQuery = dropdownSearch.trim().toLowerCase();
  const numericSearchQuery = normalizedSearchQuery.replace(/\D/g, "");

  const filteredSalaryOptions = dropdownOptions.filter((amount, index, options) => {
    if (options.indexOf(amount) !== index) {
      return false;
    }

    if (!normalizedSearchQuery) {
      return true;
    }

    const formattedAmount = formatCurrency(amount).toLowerCase();

    return (
      formattedAmount.includes(normalizedSearchQuery) ||
      (numericSearchQuery && String(amount).includes(numericSearchQuery))
    );
  });

  const dropdownId = `${idPrefix || "salary"}-dropdown-options`;
  const dropdownSearchId = `${idPrefix || "salary"}-dropdown-search`;

  React.useEffect(() => {
    if (!isDropdownOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsDropdownOpen(false);
        setDropdownSearch("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isDropdownOpen]);

  React.useEffect(() => {
    if (isDropdownOpen) {
      searchInputRef.current?.focus();
    }
  }, [isDropdownOpen]);

  const updateSalary = (amount) => {
    if (typeof onCtcChange !== "function") {
      return;
    }

    onCtcChange((previousValue) => {
      const safePreviousValue = Number.isFinite(Number(previousValue))
        ? Number(previousValue)
        : SALARY_MIN;

      const updatedValue = safePreviousValue + Number(amount);

      return Math.max(
        SALARY_MIN,
        Math.min(SALARY_MAX, updatedValue)
      );
    });
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
    setDropdownSearch("");
  };

  return (
    <div className="salary-structure-card">
      <div className="salary-structure-slider-head">
        <div>
          <p className="salary-structure-slider-title">Salary Range</p>
          <p className="salary-structure-slider-note">
            Use the buttons, dropdown, or slider to fine-tune the annual CTC.
          </p>
        </div>
      </div>

      <div className="salary-structure-ctc-controls">
        <button
          type="button"
          className="salary-ctc-btn"
          onClick={() => updateSalary(-10000)}
          disabled={disabled}
        >
          -10K
        </button>

        <div className="salary-ctc-value">
          {formatCurrency(currentValue)}
        </div>

        <button
          type="button"
          className="salary-ctc-btn"
          onClick={() => updateSalary(10000)}
          disabled={disabled}
        >
          +10K
        </button>
      </div>

      <div className="salary-quick-buttons">
        <button
          type="button"
          className="salary-small-btn"
          onClick={() => updateSalary(-1000)}
          disabled={disabled}
        >
          -1000
        </button>

        <button
          type="button"
          className="salary-small-btn"
          onClick={() => updateSalary(1000)}
          disabled={disabled}
        >
          +1000
        </button>

        <button
          type="button"
          className="salary-small-btn"
          onClick={() => updateSalary(-100)}
          disabled={disabled}
        >
          -100
        </button>

        <button
          type="button"
          className="salary-small-btn"
          onClick={() => updateSalary(100)}
          disabled={disabled}
        >
          +100
        </button>

        <button
          type="button"
          className="salary-small-btn"
          onClick={() => updateSalary(-1)}
          disabled={disabled}
        >
          -1
        </button>

        <button
          type="button"
          className="salary-small-btn"
          onClick={() => updateSalary(1)}
          disabled={disabled}
        >
          +1
        </button>
      </div>

      <div
        className="salary-dropdown-wrapper"
        ref={dropdownRef}
        onBlur={(event) => {
          const nextFocusedElement = event.relatedTarget;

          if (!event.currentTarget.contains(nextFocusedElement)) {
            closeDropdown();
          }
        }}
      >
        <button
          type="button"
          className={`salary-dropdown${isDropdownOpen ? " is-open" : ""}`}
          onClick={() => {
            if (disabled) {
              return;
            }

            if (isDropdownOpen) {
              closeDropdown();
              return;
            }

            setIsDropdownOpen(true);
          }}
          onKeyDown={(event) => {
            if (disabled) {
              return;
            }

            if ([" ", "Enter", "ArrowDown"].includes(event.key)) {
              event.preventDefault();
              setIsDropdownOpen(true);
            }

            if (event.key === "Escape") {
              closeDropdown();
            }
          }}
          aria-expanded={isDropdownOpen}
          aria-haspopup="listbox"
          aria-controls={dropdownId}
          disabled={disabled}
        >
          <span className="salary-dropdown-label">
            {formatCurrency(currentValue)}
          </span>
          <span className="salary-dropdown-chevron" aria-hidden="true" />
        </button>

        {isDropdownOpen && (
          <div className="salary-dropdown-panel">
            <input
              id={dropdownSearchId}
              ref={searchInputRef}
              type="text"
              className="salary-dropdown-search"
              placeholder="Search salary"
              value={dropdownSearch}
              onChange={(event) => setDropdownSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  closeDropdown();
                }
              }}
              autoComplete="off"
            />

            <div
              id={dropdownId}
              className="salary-dropdown-options"
              role="listbox"
              aria-labelledby={dropdownSearchId}
            >
              {filteredSalaryOptions.length > 0 ? (
                filteredSalaryOptions.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    role="option"
                    className={`salary-dropdown-option${
                      amount === currentValue ? " is-selected" : ""
                    }`}
                    aria-selected={amount === currentValue}
                    onClick={() => {
                      if (typeof onCtcChange === "function") {
                        onCtcChange(Number(amount));
                      }

                      closeDropdown();
                    }}
                  >
                    {formatCurrency(amount)}
                  </button>
                ))
              ) : (
                <div className="salary-dropdown-empty">
                  No matching salary found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <input
        id={`${idPrefix}-ctc-slider`}
        ref={sliderRef}
        type="range"
        min={SALARY_MIN}
        max={SALARY_MAX}
        step={1}
        value={currentValue}
        onChange={(event) => {
          if (typeof onCtcChange === "function") {
            onCtcChange(Number(event.target.value));
          }
        }}
        disabled={disabled}
        className="salary-structure-slider"
        style={{
          "--range-progress": `${sliderProgress}%`,
        }}
      />

      <div className="salary-slider-labels">
        <span>{formatCurrency(SALARY_MIN)}</span>
        <span>{formatCurrency(SALARY_MAX)}</span>
      </div>
    </div>
  );
}

export default SalaryStructureCard;
