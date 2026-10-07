"use client";

import { useMemo, type ReactNode } from "react";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  width?: number;
  align?: "left" | "center" | "right";
  sticky?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string | number;
  page?: number;
  pageSize?: number;
  total?: number;
  loading?: boolean;
  error?: string;
  showIndex?: boolean;
  indexWidth?: number;
  minWidth?: number;
  rowAriaLabel?: (row: T) => string;
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyHint?: string;
  paginationLabel?: string;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

const HEADER_CELL =
  "sticky top-0 whitespace-nowrap border-b border-[#eeefe9] bg-[#fafbf8] px-4 py-4 dark:border-[#363b31] dark:bg-[#252923]";

const BODY_CELL =
  "border-b border-[#f0f1ec] px-4 py-3 align-middle dark:border-[#363b31]";

const STICKY_BODY_CELL =
  "sticky z-10 border-b border-[#f0f1ec] bg-white group-hover:bg-[#fcfcfa] dark:border-[#363b31] dark:bg-[#20231f] dark:group-hover:bg-[#252923]";

const ALIGN: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  page = 1,
  pageSize,
  total,
  loading = false,
  error = "",
  showIndex = true,
  indexWidth = 64,
  minWidth,
  rowAriaLabel,
  onRowClick,
  toolbar,
  emptyIcon = "pi-inbox",
  emptyTitle = "Không có dữ liệu",
  emptyHint,
  paginationLabel = "bản ghi",
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
}: DataTableProps<T>) {
  const size = pageSize ?? (rows.length || 10);
  const totalCount = total ?? rows.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / size));

  const prepared = useMemo(() => {
    let offset = showIndex ? indexWidth : 0;
    return columns.map((column) => {
      const sticky = Boolean(column.sticky);
      const left = sticky ? offset : undefined;
      if (sticky) offset += column.width ?? 160;
      return { column, sticky, left };
    });
  }, [columns, indexWidth, showIndex]);

  const pageNumbers = useMemo(
    () =>
      Array.from({ length: pageCount }, (_, index) => index + 1).filter(
        (number) =>
          number === 1 ||
          number === pageCount ||
          Math.abs(number - page) <= 1
      ),
    [page, pageCount]
  );

  const showFooter = Boolean(onPageChange || onPageSizeChange);
  const start = totalCount === 0 ? 0 : (page - 1) * size + 1;
  const end = Math.min(page * size, totalCount);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e8e9e2] bg-white shadow-[0_4px_24px_rgba(30,40,25,0.045)] dark:border-[#363b31] dark:bg-[#20231f]">
      {toolbar && (
        <div className="flex shrink-0 flex-col gap-3 border-b border-[#eeefe9] px-5 py-4 dark:border-[#363b31] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {toolbar}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="m-5 shrink-0 rounded-xl border border-[#f0d6d2] bg-[#fff7f5] px-4 py-3 text-sm text-[#aa382f] dark:border-[#54312d] dark:bg-[#382321] dark:text-[#ffb7af]"
        >
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <table
          className="w-full border-separate border-spacing-0 text-left"
          style={minWidth ? { minWidth } : undefined}
        >
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#848a7f] dark:text-[#aeb4a8]">
              {showIndex && (
                <th
                  className={`${HEADER_CELL} left-0 z-30`}
                  style={{ width: indexWidth, minWidth: indexWidth }}
                >
                  STT
                </th>
              )}
              {prepared.map(({ column, sticky, left }) => (
                <th
                  key={column.key}
                  className={`${HEADER_CELL} ${sticky ? "z-30" : "z-20"} ${
                    ALIGN[column.align ?? "left"]
                  }`}
                  style={{
                    left,
                    width: column.width,
                    minWidth: column.width,
                  }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm">
            {rows.map((row, index) => {
              const label = rowAriaLabel?.(row);
              return (
                <tr
                  key={rowKey(row, index)}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={label}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (
                            event.target === event.currentTarget &&
                            (event.key === "Enter" || event.key === " ")
                          ) {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  className={`group hover:bg-[#fcfcfa] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#7c9f70] dark:hover:bg-[#252923] ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                >
                  {showIndex && (
                    <td
                      className={`${STICKY_BODY_CELL} left-0 px-4 py-3 text-center text-xs font-semibold text-[#73796f] dark:text-[#b3b9ad]`}
                      style={{ width: indexWidth, minWidth: indexWidth }}
                    >
                      {(page - 1) * size + index + 1}
                    </td>
                  )}
                  {prepared.map(({ column, sticky, left }) => (
                    <td
                      key={column.key}
                      className={`${sticky ? STICKY_BODY_CELL : BODY_CELL} ${
                        ALIGN[column.align ?? "left"]
                      }`}
                      style={sticky ? { left } : undefined}
                    >
                      {column.cell(row, index)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && rows.length === 0 && !error && (
          <div className="px-6 py-16 text-center">
            <i
              className={`pi ${emptyIcon} text-3xl text-[#99a28f]`}
              aria-hidden="true"
            />
            <p className="mt-3 font-semibold">{emptyTitle}</p>
            {emptyHint && (
              <p className="mt-1 text-sm text-[#858a80]">{emptyHint}</p>
            )}
          </div>
        )}
        {loading && rows.length === 0 && (
          <div className="px-6 py-8 text-center text-sm text-[#858a80]">
            <i className="pi pi-spin pi-spinner mr-2" aria-hidden="true" />
            Đang tải danh sách...
          </div>
        )}
      </div>

      {showFooter && (
        <footer className="flex shrink-0 flex-col gap-3 border-t border-[#eeefe9] px-5 py-4 dark:border-[#363b31] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            {onPageSizeChange && (
              <label className="flex items-center gap-2 text-sm text-[#73796f] dark:text-[#b3b9ad]">
                <span>Hiển thị</span>
                <select
                  aria-label={`Số ${paginationLabel} mỗi trang`}
                  value={size}
                  onChange={(event) =>
                    onPageSizeChange(Number(event.target.value))
                  }
                  className="h-9 rounded-lg border border-[#e5e7df] bg-white px-2 text-sm text-[#20231f] outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18] dark:text-[#f4f5ef]"
                >
                  {pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <span>mỗi trang</span>
              </label>
            )}
            <p className="text-sm text-[#858a80] dark:text-[#aeb4a8]">
              {totalCount === 0
                ? `Không có ${paginationLabel}`
                : `Hiển thị ${start}–${end} trên ${totalCount} ${paginationLabel}`}
            </p>
          </div>
          {onPageChange && (
            <nav
              aria-label="Phân trang"
              className="flex items-center gap-1"
            >
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1 || loading}
                aria-label="Trang trước"
                className="grid h-9 w-9 place-items-center rounded-lg border border-[#e5e7df] text-sm disabled:opacity-40 dark:border-[#40453b]"
              >
                <i className="pi pi-angle-left" aria-hidden="true" />
              </button>
              {pageNumbers.map((number, index) => (
                <span key={number} className="contents">
                  {index > 0 && number - pageNumbers[index - 1] > 1 && (
                    <span className="px-1 text-[#92988d]">…</span>
                  )}
                  <button
                    type="button"
                    onClick={() => onPageChange(number)}
                    aria-current={page === number ? "page" : undefined}
                    className={`grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-semibold ${
                      page === number
                        ? "bg-[#527b49] text-white"
                        : "text-[#62685e] hover:bg-[#f5f6f2] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
                    }`}
                  >
                    {number}
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => onPageChange(Math.min(pageCount, page + 1))}
                disabled={page === pageCount || loading}
                aria-label="Trang sau"
                className="grid h-9 w-9 place-items-center rounded-lg border border-[#e5e7df] text-sm disabled:opacity-40 dark:border-[#40453b]"
              >
                <i className="pi pi-angle-right" aria-hidden="true" />
              </button>
            </nav>
          )}
        </footer>
      )}
    </section>
  );
}
