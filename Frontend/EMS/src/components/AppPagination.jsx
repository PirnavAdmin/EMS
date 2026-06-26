import React, { useMemo } from "react";

const buildPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = [1];
  const leftSibling = Math.max(2, currentPage - 1);
  const rightSibling = Math.min(totalPages - 1, currentPage + 1);

  if (leftSibling > 2) {
    items.push("left-ellipsis");
  }

  for (let page = leftSibling; page <= rightSibling; page += 1) {
    items.push(page);
  }

  if (rightSibling < totalPages - 1) {
    items.push("right-ellipsis");
  }

  items.push(totalPages);
  return items;
};

function AppPagination({
  totalItems,
  currentPage,
  pageSize = 30,
  onPageChange,
  className = "",
  itemLabel = "records",
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(safeCurrentPage * pageSize, totalItems);

  const pageItems = useMemo(
    () => buildPaginationItems(safeCurrentPage, totalPages),
    [safeCurrentPage, totalPages]
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
