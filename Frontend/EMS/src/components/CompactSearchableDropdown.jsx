import React, {
  memo,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FaCheck,
  FaChevronDown,
  FaSearch,
  FaTimes,
} from "react-icons/fa";

function normalizeOption(option) {
  if (typeof option === "string") {
    return {
      value: option,
      label: option,
      disabled: false,
    };
  }

  return {
    value: option.value,
    label: option.label ?? String(option.value ?? ""),
    disabled: Boolean(option.disabled),
  };
}

function CompactSearchableDropdown({
  label,
  value,
  onChange,
  groups = [],
  placeholder = "Select option",
  searchPlaceholder = "Search...",
  disabled = false,
  className = "",
  menuMaxHeight = 180,
  helperText = "",
  error = "",
  id,
}) {
  const dropdownId = useId();
  const baseId = id || dropdownId;
  const wrapperRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionRefs = useRef(new Map());

  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const normalizedGroups = useMemo(
    () =>
      groups.map((group) => ({
        label: group.label,
        options: (group.options || []).map(normalizeOption),
      })),
    [groups]
  );

  const flatOptions = useMemo(
    () =>
      normalizedGroups.flatMap((group) =>
        group.options.map((option) => ({
          ...option,
          groupLabel: group.label,
        }))
      ),
    [normalizedGroups]
  );

  const selectedOption = useMemo(
    () => flatOptions.find((option) => option.value === value) || null,
    [flatOptions, value]
  );

  const filteredGroups = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    if (!normalizedSearch) {
      return normalizedGroups;
    }

    return normalizedGroups
      .map((group) => {
        const groupLabel = String(group.label || "").toLowerCase();
        const options = group.options.filter((option) => {
          const optionLabel = String(option.label || "").toLowerCase();
          const optionValue = String(option.value || "").toLowerCase();

          return (
            groupLabel.includes(normalizedSearch) ||
            optionLabel.includes(normalizedSearch) ||
            optionValue.includes(normalizedSearch)
          );
        });

        return {
          ...group,
          options,
        };
      })
      .filter((group) => group.options.length > 0);
  }, [normalizedGroups, searchValue]);

  const filteredFlatOptions = useMemo(
    () =>
      filteredGroups.flatMap((group) =>
        group.options.map((option) => ({
          ...option,
          groupLabel: group.label,
        }))
      ),
    [filteredGroups]
  );

  const findNextEnabledIndex = (startIndex, direction) => {
    if (!filteredFlatOptions.length) {
      return -1;
    }

    let nextIndex = startIndex;

    for (let attempts = 0; attempts < filteredFlatOptions.length; attempts += 1) {
      nextIndex += direction;

      if (nextIndex < 0) {
        nextIndex = filteredFlatOptions.length - 1;
      } else if (nextIndex >= filteredFlatOptions.length) {
        nextIndex = 0;
      }

      if (!filteredFlatOptions[nextIndex]?.disabled) {
        return nextIndex;
      }
    }

    return -1;
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setSearchValue("");
    setActiveIndex(0);
  };

  const openDropdown = () => {
    if (disabled) {
      return;
    }

    setIsOpen(true);
    setSearchValue("");

    const selectedIndex = flatOptions.findIndex(
      (option) => option.value === value && !option.disabled
    );

    if (selectedIndex >= 0) {
      setActiveIndex(selectedIndex);
      return;
    }

    const firstEnabledIndex = filteredFlatOptions.findIndex(
      (option) => !option.disabled
    );

    setActiveIndex(firstEnabledIndex >= 0 ? firstEnabledIndex : 0);
  };

  const toggleDropdown = () => {
    if (isOpen) {
      closeDropdown();
      return;
    }

    openDropdown();
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        closeDropdown();
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeDropdown();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  const safeActiveIndex = filteredFlatOptions.length
    ? (() => {
        const clampedIndex = Math.max(
          0,
          Math.min(activeIndex, filteredFlatOptions.length - 1)
        );

        if (!filteredFlatOptions[clampedIndex]?.disabled) {
          return clampedIndex;
        }

        const nextIndex = findNextEnabledIndex(clampedIndex, 1);

        if (nextIndex >= 0) {
          return nextIndex;
        }

        const previousIndex = findNextEnabledIndex(clampedIndex, -1);

        return previousIndex >= 0 ? previousIndex : clampedIndex;
      })()
    : 0;

  useEffect(() => {
    if (!isOpen || !filteredFlatOptions.length) {
      return;
    }

    const activeOption = filteredFlatOptions[safeActiveIndex];

    if (!activeOption) {
      return;
    }

    const activeOptionId = `${baseId}-option-${safeActiveIndex}`;
    const activeOptionElement = optionRefs.current.get(activeOptionId);

    activeOptionElement?.scrollIntoView({
      block: "nearest",
    });
  }, [baseId, filteredFlatOptions, isOpen, safeActiveIndex]);

  const handleSelection = (option) => {
    if (!option || option.disabled) {
      return;
    }

    onChange?.(option.value);
    closeDropdown();
  };

  const handleTriggerKeyDown = (event) => {
    if (disabled) {
      return;
    }

    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      openDropdown();
      return;
    }

    if (event.key === "Escape") {
      closeDropdown();
    }
  };

  const handleSearchKeyDown = (event) => {
    if (!filteredFlatOptions.length) {
      if (event.key === "Escape") {
        closeDropdown();
      }

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => {
        const nextIndex = findNextEnabledIndex(current, 1);
        return nextIndex >= 0 ? nextIndex : current;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => {
        const previousIndex = findNextEnabledIndex(current, -1);
        return previousIndex >= 0 ? previousIndex : current;
      });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      handleSelection(filteredFlatOptions[safeActiveIndex]);
    }
  };

  const handleClearSearch = () => {
    setSearchValue("");
    searchInputRef.current?.focus();
  };

  return (
    <div
      className={`ems-compact-dropdown ${className}`.trim()}
      ref={wrapperRef}
    >
      {label && <label className="ems-compact-dropdown-label">{label}</label>}

      <button
        type="button"
        className={`compact-dropdown-trigger${isOpen ? " is-open" : ""}${
          error ? " is-invalid" : ""
        }`.trim()}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${baseId}-menu`}
        disabled={disabled}
        onClick={toggleDropdown}
        onKeyDown={handleTriggerKeyDown}
      >
        <span
          className={`compact-dropdown-value${
            selectedOption ? "" : " is-placeholder"
          }`}
        >
          {selectedOption?.label || placeholder}
        </span>

        <FaChevronDown
          className={`compact-dropdown-chevron${isOpen ? " is-open" : ""}`}
          aria-hidden="true"
        />
      </button>

      {(helperText || error) && (
        <p className={`compact-dropdown-helper${error ? " is-error" : ""}`}>
          {error || helperText}
        </p>
      )}

      {isOpen && (
        <div
          id={`${baseId}-menu`}
          className="compact-dropdown-menu"
          role="listbox"
          aria-label={label || placeholder}
        >
          <div className="compact-dropdown-search">
            <FaSearch className="compact-dropdown-search-icon" aria-hidden="true" />

            <input
              ref={searchInputRef}
              type="text"
              value={searchValue}
              placeholder={searchPlaceholder}
              onChange={(event) => {
                setSearchValue(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              aria-label={searchPlaceholder}
            />

            {searchValue && (
              <button
                type="button"
                className="compact-dropdown-clear"
                onClick={handleClearSearch}
                aria-label="Clear search"
              >
                <FaTimes aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            className="compact-dropdown-options"
            style={{ maxHeight: `${menuMaxHeight}px` }}
          >
            {filteredGroups.length === 0 ? (
              <div className="compact-dropdown-empty">
                No matching options
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div className="compact-dropdown-group" key={group.label}>
                  <div className="compact-dropdown-group-label">
                    {group.label}
                  </div>

                  {group.options.map((option) => {
                    const optionIndex = filteredFlatOptions.findIndex(
                      (item) => item.value === option.value
                    );
                    const isSelected = option.value === value;
                    const isActive = optionIndex === safeActiveIndex;
                    const optionId = `${baseId}-option-${optionIndex}`;

                    return (
                      <button
                        key={option.value}
                        ref={(node) => {
                          if (node) {
                            optionRefs.current.set(optionId, node);
                          } else {
                            optionRefs.current.delete(optionId);
                          }
                        }}
                        id={optionId}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`compact-dropdown-option${
                          isSelected ? " is-selected" : ""
                        }${isActive ? " is-active" : ""}${
                          option.disabled ? " is-disabled" : ""
                        }`.trim()}
                        aria-disabled={option.disabled}
                        disabled={option.disabled}
                        onMouseEnter={() => {
                          if (!option.disabled) {
                            setActiveIndex(optionIndex);
                          }
                        }}
                        onClick={() => handleSelection(option)}
                      >
                        <span className="compact-dropdown-option-label">
                          {option.label}
                        </span>

                        {isSelected && (
                          <FaCheck
                            className="compact-dropdown-option-check"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(CompactSearchableDropdown);
