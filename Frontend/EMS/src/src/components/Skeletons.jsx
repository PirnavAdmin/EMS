import React from "react";
import "./Skeletons.css";

const cx = (...parts) => parts.filter(Boolean).join(" ");

const SkeletonBlock = ({
  as: Tag = "div",
  className = "",
  style,
  ...props
}) => (
  <Tag
    className={cx("ui-skeleton", className)}
    style={style}
    aria-hidden="true"
    {...props}
  />
);

const normalizeColumns = (columns, fallbackCount = 6) => {
  if (Array.isArray(columns) && columns.length > 0) {
    return columns.map((column, index) => {
      if (typeof column === "string") {
        return {
          width: column,
          type: index === columns.length - 1 ? "actions" : "text",
          headerWidth: index === 0 ? "58%" : "72%",
        };
      }

      if (typeof column === "number") {
        return {
          width: `${column}fr`,
          type: index === columns.length - 1 ? "actions" : "text",
          headerWidth: index === 0 ? "58%" : "72%",
        };
      }

      return {
        width:
          column?.width ||
          (index === 0
            ? "minmax(180px, 1.4fr)"
            : index === columns.length - 1
              ? "120px"
              : "1fr"),
        type:
          column?.type ||
          (index === columns.length - 1
            ? "actions"
            : index === 0
              ? "avatar"
              : "text"),
        align: column?.align || "left",
        headerWidth: column?.headerWidth || (index === 0 ? "58%" : "72%"),
      };
    });
  }

  const count =
    Number.isFinite(fallbackCount) && fallbackCount > 0 ? fallbackCount : 6;

  return Array.from({ length: count }, (_, index) => ({
    width:
      index === 0
        ? "minmax(180px, 1.4fr)"
        : index === count - 1
          ? "120px"
          : "1fr",
    type:
      index === count - 1 ? "actions" : index === 0 ? "avatar" : "text",
    align: "left",
    headerWidth: index === 0 ? "58%" : "72%",
  }));
};

export function CardSkeleton({
  count = 1,
  variant = "metric",
  className = "",
  style,
}) {
  const items = Array.from({ length: Math.max(1, count) }, (_, index) => index);

  return (
    <div
      className={cx("skeleton-grid", `skeleton-grid-${variant}`, className)}
      style={style}
      aria-busy="true"
      aria-live="polite"
    >
      {items.map((index) => {
        if (variant === "panel") {
          return (
            <section key={index} className="skeleton-card skeleton-card-panel">
              <SkeletonBlock
                className="skeleton-line skeleton-title"
                style={{ width: `${52 - (index % 2) * 6}%` }}
              />

              <div className="skeleton-panel-lines">
                <SkeletonBlock
                  className="skeleton-line"
                  style={{ width: "92%" }}
                />
                <SkeletonBlock
                  className="skeleton-line"
                  style={{ width: "84%" }}
                />
                <SkeletonBlock
                  className="skeleton-line"
                  style={{ width: "76%" }}
                />
              </div>

              <div className="skeleton-panel-footer">
                <SkeletonBlock
                  className="skeleton-pill"
                  style={{ width: "88px" }}
                />
                <SkeletonBlock
                  className="skeleton-pill"
                  style={{ width: "64px" }}
                />
              </div>
            </section>
          );
        }

        return (
          <section key={index} className="skeleton-card skeleton-card-metric">
            <div className="skeleton-card-icon">
              <SkeletonBlock className="skeleton-circle" />
            </div>

            <div className="skeleton-card-copy">
              <SkeletonBlock
                className="skeleton-line skeleton-title"
                style={{ width: `${60 - (index % 3) * 7}%` }}
              />
              <SkeletonBlock
                className="skeleton-line skeleton-value"
                style={{ width: `${82 - (index % 2) * 8}%` }}
              />
              <SkeletonBlock
                className="skeleton-line skeleton-subtext"
                style={{ width: `${42 + (index % 2) * 10}%` }}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function FormSkeleton({
  fields = 6,
  columns = 2,
  className = "",
  style,
}) {
  const columnCount = Math.max(1, Number(columns) || 1);
  const fieldCount = Math.max(1, Number(fields) || 1);
  const variants = ["input", "input", "dropdown", "date", "textarea"];

  return (
    <div
      className={cx("form-skeleton", className)}
      style={{
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        ...style,
      }}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: fieldCount }, (_, index) => {
        const variant = variants[index % variants.length];
        const isTextarea = variant === "textarea";
        const isDropdown = variant === "dropdown";
        const isDate = variant === "date";

        return (
          <div key={index} className="form-skeleton-field">
            <SkeletonBlock
              className="skeleton-label"
              style={{ width: `${46 + (index % 3) * 8}%` }}
            />

            <div
              className={cx(
                "form-skeleton-control",
                isDropdown && "is-dropdown",
                isDate && "is-date",
                isTextarea && "is-textarea"
              )}
            >
              <SkeletonBlock
                className={cx(
                  "skeleton-input",
                  isTextarea && "is-textarea"
                )}
                style={{ height: isTextarea ? "88px" : "44px" }}
              />

              {isDropdown && (
                <SkeletonBlock className="skeleton-control-icon" />
              )}

              {isDate && (
                <SkeletonBlock className="skeleton-control-icon is-date" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TableSkeleton({
  rows = 10,
  columns = 6,
  className = "",
  style,
  showHeader = true,
}) {
  const columnDefs = normalizeColumns(columns, 6);
  const rowCount = Math.max(1, Number(rows) || 1);
  const gridTemplateColumns = columnDefs
    .map((column) => column.width)
    .join(" ");

  const renderCell = (column, rowIndex, columnIndex) => {
    const baseWidth =
      column.type === "avatar"
        ? "72%"
        : column.type === "status"
          ? "72px"
          : column.type === "actions"
            ? "100%"
            : column.headerWidth || (columnIndex === 0 ? "76%" : "60%");

    if (column.type === "avatar") {
      return (
        <div className="table-skeleton-avatar-cell">
          <SkeletonBlock className="table-skeleton-avatar" />

          <div className="table-skeleton-stack">
            <SkeletonBlock
              className="skeleton-line"
              style={{ width: "72%" }}
            />
            <SkeletonBlock
              className="skeleton-line"
              style={{ width: "56%" }}
            />
          </div>
        </div>
      );
    }

    if (column.type === "status") {
      return (
        <SkeletonBlock
          className="skeleton-pill table-skeleton-pill"
          style={{ width: baseWidth }}
        />
      );
    }

    if (column.type === "actions") {
      return (
        <div className="table-skeleton-actions">
          <SkeletonBlock className="table-skeleton-chip" />
          <SkeletonBlock className="table-skeleton-chip" />
        </div>
      );
    }

    if (column.type === "stacked") {
      return (
        <div className="table-skeleton-stack">
          <SkeletonBlock
            className="skeleton-line"
            style={{ width: "84%" }}
          />
          <SkeletonBlock
            className="skeleton-line"
            style={{ width: "64%" }}
          />
        </div>
      );
    }

    return (
      <SkeletonBlock
        className="skeleton-line table-skeleton-line"
        style={{ width: baseWidth }}
      />
    );
  };

  return (
    <div
      className={cx("table-skeleton-wrap", className)}
      style={style}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="table-skeleton-scroll">
        <div
          className="table-skeleton"
          style={{ gridTemplateColumns }}
        >
          {showHeader && (
            <div className="table-skeleton-row table-skeleton-head">
              {columnDefs.map((column, index) => (
                <div
                  key={`head-${index}`}
                  className={cx(
                    "table-skeleton-cell",
                    column.align && `is-${column.align}`
                  )}
                >
                  <SkeletonBlock
                    className="skeleton-line table-skeleton-head-line"
                    style={{ width: column.headerWidth || "72%" }}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="table-skeleton-body">
            {Array.from({ length: rowCount }, (_, rowIndex) => (
              <div key={rowIndex} className="table-skeleton-row">
                {columnDefs.map((column, columnIndex) => (
                  <div
                    key={`${rowIndex}-${columnIndex}`}
                    className={cx(
                      "table-skeleton-cell",
                      column.align && `is-${column.align}`
                    )}
                  >
                    {renderCell(column, rowIndex, columnIndex)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton({
  variant = "dashboard",
  className = "",
  titleWidth = "32%",
  subtitleWidth = "48%",
  cardCount = 4,
  formFields = 8,
  formColumns = 2,
  tableRows = 10,
  tableColumns = 6,
}) {
  return (
    <div
      className={cx("page-skeleton", `page-skeleton-${variant}`, className)}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="page-skeleton-hero">
        <SkeletonBlock
          className="page-skeleton-title"
          style={{ width: titleWidth }}
        />
        <SkeletonBlock
          className="page-skeleton-subtitle"
          style={{ width: subtitleWidth }}
        />
        {variant === "form" && (
          <SkeletonBlock
            className="page-skeleton-alert"
            style={{ width: "min(100%, 420px)" }}
          />
        )}
      </div>

      {variant === "form" ? (
        <FormSkeleton fields={formFields} columns={formColumns} />
      ) : variant === "table" ? (
        <TableSkeleton rows={tableRows} columns={tableColumns} />
      ) : variant === "cards" ? (
        <CardSkeleton count={cardCount} />
      ) : (
        <>
          <CardSkeleton count={cardCount} />

          <div className="page-skeleton-panels">
            <CardSkeleton count={1} variant="panel" />
            <CardSkeleton count={1} variant="panel" />
          </div>

          <TableSkeleton rows={Math.min(tableRows, 6)} columns={tableColumns} />
        </>
      )}
    </div>
  );
}

export { SkeletonBlock };
