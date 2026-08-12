import React, { useMemo } from "react";

const buildPaginationItems = (currentPage, totalPages, pageNumberDisplay) => {
  if (pageNumberDisplay === "first-and-current") {
    if (totalPages <= 1 || currentPage === 1) {
      return [1];
    }

    return [1, currentPage];
  }

  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const compactPage = currentPage > 1 ? currentPage : totalPages;

  return [1, "ellipsis", compactPage];
};

function AppPagination({
  totalItems,
  currentPage,
  pageSize = 30,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [],
  className = "",
  itemLabel = "records",
  pageSizeLabel = "Rows per page",
  pageNumberDisplay = "compact",
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(safeCurrentPage * pageSize, totalItems);
  const showPageSizeSelector =
    typeof onPageSizeChange === "function" && pageSizeOptions.length > 0;

  const pageItems = useMemo(
    () => buildPaginationItems(safeCurrentPage, totalPages, pageNumberDisplay),
    [safeCurrentPage, totalPages, pageNumberDisplay]
  );

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || typeof onPageChange !== "function") {
      return;
    }

    onPageChange(nextPage);
  };

  return (
    <div className={`app-pagination-bar ${className}`.trim()}>
      <div className="app-pagination-info">
        Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of{" "}
        <strong>{totalItems}</strong> {itemLabel}
      </div>

      <div className="app-pagination-controls">
        {showPageSizeSelector && (
          <label className="app-pagination-page-size-group">
            <span className="app-pagination-page-size-label">{pageSizeLabel}:</span>
            <select
              className="app-pagination-page-size"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              aria-label={pageSizeLabel}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          className="pagination-btn app-pagination-button"
          onClick={() => handlePageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1 || totalItems === 0}
          aria-label="Previous page"
        >
          Prev
        </button>

        {pageItems.map((item) => {
          if (typeof item === "string") {
            return (
              <span key={item} className="app-pagination-dots" aria-hidden="true">
                ...
              </span>
            );
          }

          return (
            <button
              key={item}
              type="button"
              className={`pagination-btn app-pagination-button ${safeCurrentPage === item ? "active" : ""}`}
              onClick={() => handlePageChange(item)}
              aria-current={safeCurrentPage === item ? "page" : undefined}
            >
              {item}
            </button>
          );
        })}

        <button
          type="button"
          className="pagination-btn app-pagination-button"
          onClick={() => handlePageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages || totalItems === 0}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default AppPagination;
