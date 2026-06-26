import React, { useEffect, useRef, useState } from "react";
import { shift } from "@floating-ui/react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./AppDatePicker.css";

import { getInputDateValue, parseDate } from "../utils/date";

import {
  APP_CALENDAR_MONTHS,
  getCalendarYearBounds,
  getCalendarYearOptions,
} from "./calendarConfig";

function CalendarDropdown({
  label,
  value,
  options,
  open,
  onToggle,
  onSelect,
  className = "",
}) {
  const selectedOptionRef = useRef(null);

  const selectedLabel =
    options.find((option) => option.value === value)?.label ??
    String(value);

  useEffect(() => {
    if (open) {
      selectedOptionRef.current?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [open]);

  return (
    <div className={`app-calendar-dropdown ${className}`.trim()}>
      <button
        type="button"
        className="app-calendar-dropdown-button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>{selectedLabel}</span>
        <span className="app-calendar-dropdown-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="app-calendar-dropdown-menu"
          role="listbox"
          aria-label={label}
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                ref={isSelected ? selectedOptionRef : null}
                type="button"
                className={`app-calendar-dropdown-option${
                  isSelected ? " is-selected" : ""
                }`}
                role="option"
                aria-selected={isSelected}
                onClick={() => onSelect(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CalendarHeader({
  date,
  changeYear,
  changeMonth,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
  minDate,
  maxDate,
}) {
  const [openDropdown, setOpenDropdown] = useState(null);

  const { minYear, maxYear } = getCalendarYearBounds(minDate, maxDate);

  const currentMonth = date.getMonth();
  const currentYear = date.getFullYear();

  const monthOptions = APP_CALENDAR_MONTHS.map((month, index) => ({
    value: index,
    label: month,
  }));

  const yearOptions = getCalendarYearOptions(minYear, maxYear).map((year) => ({
    value: year,
    label: String(year),
  }));

  const toggleDropdown = (dropdownName) => {
    setOpenDropdown((current) =>
      current === dropdownName ? null : dropdownName
    );
  };

  return (
    <div className="app-calendar-header">
      <div className="app-calendar-header-top">
        <button
          type="button"
          className="app-calendar-nav-button"
          aria-label="Previous month"
          onClick={() => {
            setOpenDropdown(null);
            decreaseMonth();
          }}
          disabled={prevMonthButtonDisabled}
        >
          <span aria-hidden="true" />
        </button>

        <div className="app-calendar-current-month">
          {APP_CALENDAR_MONTHS[currentMonth]} {currentYear}
        </div>

        <button
          type="button"
          className="app-calendar-nav-button app-calendar-nav-button-next"
          aria-label="Next month"
          onClick={() => {
            setOpenDropdown(null);
            increaseMonth();
          }}
          disabled={nextMonthButtonDisabled}
        >
          <span aria-hidden="true" />
        </button>
      </div>

      <div className="app-calendar-dropdown-row">
        <CalendarDropdown
          label="Select month"
          value={currentMonth}
          options={monthOptions}
          open={openDropdown === "month"}
          onToggle={() => toggleDropdown("month")}
          onSelect={(month) => {
            changeMonth(month);
            setOpenDropdown(null);
          }}
        />

        <CalendarDropdown
          label="Select year"
          value={currentYear}
          options={yearOptions}
          open={openDropdown === "year"}
          onToggle={() => toggleDropdown("year")}
          onSelect={(year) => {
            changeYear(year);
            setOpenDropdown(null);
          }}
          className="app-calendar-year-dropdown"
        />
      </div>
    </div>
  );
}

function AppDatePicker({
  id,
  name,
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Select date",
  disabled = false,
  className = "",
  wrapperClassName = "",
  ariaDescribedBy,
  ariaInvalid = false,
  dateFormat = "dd/MM/yyyy",
}) {
  const selectedDate = parseDate(value);
  const minimumDate = parseDate(minDate);
  const maximumDate = parseDate(maxDate);

  return (
    <DatePicker
      id={id}
      name={name}
      selected={selectedDate}
      onChange={(date) => {
        const nextValue = getInputDateValue(date);

        if (typeof onChange === "function") {
          onChange({
            target: {
              name,
              value: nextValue,
            },
          });
        }
      }}
      openOnFocus
      preventOpenOnFocus={false}
      shouldCloseOnSelect
      closeOnScroll
      minDate={minimumDate || undefined}
      maxDate={maximumDate || undefined}
      placeholderText={placeholder}
      dateFormat={dateFormat}
      renderCustomHeader={(headerProps) => (
        <CalendarHeader
          {...headerProps}
          minDate={minimumDate}
          maxDate={maximumDate}
        />
      )}
      autoComplete="off"
      className={`app-date-input ${className}`.trim()}
      wrapperClassName={`app-date-input-wrapper ${wrapperClassName}`.trim()}
      calendarClassName="app-date-calendar"
      popperClassName="app-date-popper"
      portalId="app-datepicker-portal"
      disabled={disabled}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      fixedHeight
      popperPlacement="bottom-start"
      formatWeekDay={(nameOfDay) => nameOfDay.slice(0, 2)}
      popperModifiers={[
        shift({
          padding: 12,
          crossAxis: true,
        }),
      ]}
      showPopperArrow
    />
  );
}

export default AppDatePicker;
