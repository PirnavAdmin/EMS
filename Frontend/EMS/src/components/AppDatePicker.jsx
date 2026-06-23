import React, { useEffect, useRef, useState } from "react";
import { flip, shift } from "@floating-ui/react";
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
        style={{
          minHeight: "18px",
          height: "18px",
          padding: "0px 4px",
          fontSize: "8px",
          borderRadius: "5px",
        }}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>{selectedLabel}</span>
 
        <span
          className="app-calendar-dropdown-chevron"
          aria-hidden="true"
          style={{
            width: "6px",
            height: "6px",
            borderWidth: "0 2px 2px 0",
          }}
        />
      </button>
 
      {open && (
        <div
          className="app-calendar-dropdown-menu"
          role="listbox"
          style={{
            maxHeight: "120px",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
 
            return (
              <button
                key={option.value}
                style={{
                  fontSize: "10px",
                  padding: "2px 6px",
                  minHeight: "18px",
                  lineHeight: "12px",
                }}
                ref={isSelected ? selectedOptionRef : null}
                type="button"
                className={`app-calendar-dropdown-option${isSelected ? " is-selected" : ""
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
 
  const { minYear, maxYear } = getCalendarYearBounds(
    minDate,
    maxDate
  );
 
  const currentMonth = date.getMonth();
  const currentYear = date.getFullYear();
 
  const monthOptions = APP_CALENDAR_MONTHS.map(
    (month, index) => ({
      value: index,
      label: month,
    })
  );
 
  const yearOptions = getCalendarYearOptions(
    minYear,
    maxYear
  ).map((year) => ({
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
          style={{
            width: "18px",
            height: "18px",
            minWidth: "18px",
            padding: "0px",
          }}
          aria-label="Previous month"
          onClick={() => {
            setOpenDropdown(null);
            decreaseMonth();
          }}
          disabled={prevMonthButtonDisabled}
        >
          <span
            aria-hidden="true"
            style={{
              width: "6px",
              height: "6px",
              display: "block",
            }}
          />
        </button>
 
        <div
          className="app-calendar-current-month"
          style={{
            fontSize: "11px",
            fontWeight: "700",
          }}
        >
          {APP_CALENDAR_MONTHS[currentMonth]} {currentYear}
        </div>
 
        <button
          type="button"
          className="app-calendar-nav-button app-calendar-nav-button-next"
          style={{
            width: "18px",
            height: "18px",
            minWidth: "18px",
            padding: "0px",
          }}
          aria-label="Next month"
          onClick={() => {
            setOpenDropdown(null);
            increaseMonth();
          }}
          disabled={nextMonthButtonDisabled}
        >
          <span
            aria-hidden="true"
            style={{
              width: "6px",
              height: "6px",
              display: "block",
            }}
          />
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
      onInputClick={() => { }}
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
      disabled={disabled}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      fixedHeight
      popperPlacement="bottom-start"
 
      formatWeekDay={(nameOfDay) => (
        <span
          style={{
            fontSize: "9px",
            fontWeight: "600",
          }}
        >
          {nameOfDay.slice(0, 2)}
        </span>
      )}
 
      popperModifiers={[
        flip({
          padding: 12,
          fallbackPlacements: ["top-start"],
        }),
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
 
 