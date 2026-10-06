"use client";

import { useEffect, useState } from "react";
import {
  FinancialStatusValue,
  FulfillmentStatusValue,
  CustomerOrderType,
  HaravanOrderStatus,
  OrderRecord,
} from "@/services/api/orders";
import {
  ConfirmationStatus,
  fulfillmentStatusText,
  haravanOrderStatusText,
  isConfirmed,
  money,
  orderCode,
  paymentStatusText,
  readableApiDate,
  statusText,
} from "./orders.utils";

interface OrdersTableProps {
  orders: OrderRecord[];
  locale: string;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string;
  confirmingOrder: string | null;
  confirmationFilters: ConfirmationStatus[];
  financialFilters: FinancialStatusValue[];
  fulfillmentFilters: FulfillmentStatusValue[];
  haravanStatusFilters: HaravanOrderStatus[];
  customerOrderFilters: CustomerOrderType[];
  createdFrom: string;
  createdTo: string;
  onConfirmationFiltersChange: (filters: ConfirmationStatus[]) => void;
  onFinancialFiltersChange: (filters: FinancialStatusValue[]) => void;
  onFulfillmentFiltersChange: (filters: FulfillmentStatusValue[]) => void;
  onHaravanStatusFiltersChange: (filters: HaravanOrderStatus[]) => void;
  onCustomerOrderFiltersChange: (filters: CustomerOrderType[]) => void;
  onDateRangeChange: (from: string, to: string) => void;
  onShowDetails: (order: OrderRecord) => void;
  onConfirmOrder: (order: OrderRecord) => void;
}

const statusOptions: Array<{ value: ConfirmationStatus; label: string }> = [
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "unconfirmed", label: "Chưa xác nhận" },
];

const financialOptions: Array<{ value: FinancialStatusValue; label: string }> = [
  { value: "pending", label: "Chờ thanh toán" },
  { value: "partially_paid", label: "Thanh toán một phần" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "partially_refunded", label: "Hoàn tiền một phần" },
  { value: "refunded", label: "Đã hoàn tiền" },
  { value: "voided", label: "Đã hủy thanh toán" },
];

const fulfillmentOptions: Array<{ value: FulfillmentStatusValue; label: string }> = [
  { value: "unshipped", label: "Chưa giao (unshipped)" },
  { value: "shipped", label: "Đã giao (shipped)" },
  { value: "partial", label: "Giao một phần" },
];

const orderStatusOptions: Array<{ value: HaravanOrderStatus; label: string }> = [
  { value: "open", label: "Đang mở (open)" },
  { value: "closed", label: "Đã đóng (closed)" },
  { value: "cancelled", label: "Đã hủy (cancelled)" },
];

const customerOrderOptions: Array<{ value: CustomerOrderType; label: string }> = [
  { value: "first", label: "Đơn đầu tiên của khách" },
  { value: "repeat", label: "Đơn sau của khách" },
];

type StatusFilterKey = "financial" | "fulfillment" | "order" | "confirmation" | "customerOrder";

interface StatusFilterHeaderProps<T extends string> {
  filterKey: StatusFilterKey;
  label: string;
  options: Array<{ value: T; label: string }>;
  selected: T[];
  allLabel?: string;
  openFilter: StatusFilterKey | "date" | null;
  alignRight?: boolean;
  onOpenFilterChange: (filter: StatusFilterKey | "date" | null) => void;
  onChange: (filters: T[]) => void;
}

function StatusFilterHeader<T extends string>({
  filterKey,
  label,
  options,
  selected,
  allLabel = "Tất cả trạng thái",
  openFilter,
  alignRight = false,
  onOpenFilterChange,
  onChange,
}: StatusFilterHeaderProps<T>) {
  const isOpen = openFilter === filterKey;
  const toggleStatus = (status: T) => {
    onChange(
      selected.includes(status)
        ? selected.filter((current) => current !== status)
        : [...selected, status]
    );
  };

  return (
    <div data-order-filter className="relative flex items-center gap-2">
      <span>{label}</span>
      <button
        type="button"
        aria-label={`Lọc trạng thái ${label.toLowerCase()}`}
        aria-expanded={isOpen}
        onClick={() => onOpenFilterChange(isOpen ? null : filterKey)}
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg normal-case tracking-normal transition ${
          selected.length
            ? "bg-[#e8f4e9] text-[#26733c] dark:bg-[#30392c] dark:text-[#c4dfa9]"
            : "text-[#73796f] hover:bg-[#edf0e9] dark:text-[#c4c9bf] dark:hover:bg-[#30342e]"
        }`}
      >
        <i className="pi pi-filter text-sm" aria-hidden="true" />
      </button>
      {isOpen && (
        <div className={`absolute top-full z-50 mt-2 w-64 rounded-xl border border-[#e1e5dc] bg-white p-4 normal-case tracking-normal text-[#20231f] shadow-xl dark:border-[#40453b] dark:bg-[#20231f] dark:text-[#f4f5ef] ${alignRight ? "right-0" : "left-0"}`}>
          <p className="mb-3 text-sm font-bold">{label}</p>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-[#f5f6f2] dark:hover:bg-[#30342e]">
            <input
              type="checkbox"
              checked={selected.length === 0}
              onChange={() => onChange([])}
              className="accent-[#527b49]"
            />
            {allLabel}
          </label>
          {options.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-[#f5f6f2] dark:hover:bg-[#30342e]">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggleStatus(option.value)}
                className="accent-[#527b49]"
              />
              {option.label}
            </label>
          ))}
          <p className="mt-2 text-xs text-[#858a80]">Có thể chọn đồng thời nhiều trạng thái.</p>
        </div>
      )}
    </div>
  );
}

export default function OrdersTable({
  orders,
  locale,
  page,
  pageSize,
  loading,
  error,
  confirmingOrder,
  confirmationFilters,
  financialFilters,
  fulfillmentFilters,
  haravanStatusFilters,
  customerOrderFilters,
  createdFrom,
  createdTo,
  onConfirmationFiltersChange,
  onFinancialFiltersChange,
  onFulfillmentFiltersChange,
  onHaravanStatusFiltersChange,
  onCustomerOrderFiltersChange,
  onDateRangeChange,
  onShowDetails,
  onConfirmOrder,
}: OrdersTableProps) {
  const [openFilter, setOpenFilter] = useState<StatusFilterKey | "date" | null>(null);
  const [draftFrom, setDraftFrom] = useState(createdFrom);
  const [draftTo, setDraftTo] = useState(createdTo);

  useEffect(() => {
    setDraftFrom(createdFrom);
    setDraftTo(createdTo);
  }, [createdFrom, createdTo]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!(event.target instanceof Element) || !event.target.closest("[data-order-filter]")) {
        setOpenFilter(null);
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <>
      {error && (
        <div role="alert" className="m-5 rounded-xl border border-[#f0d6d2] bg-[#fff7f5] px-4 py-3 text-sm text-[#aa382f] dark:border-[#54312d] dark:bg-[#382321] dark:text-[#ffb7af]">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[1900px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#848a7f] dark:text-[#aeb4a8]">
              <th className="sticky left-0 top-0 z-30 w-16 whitespace-nowrap border-b border-[#eeefe9] bg-[#fafbf8] px-4 py-4 dark:border-[#363b31] dark:bg-[#252923]">
                STT
              </th>
              <th className="sticky top-0 z-20 min-w-[140px] whitespace-nowrap border-b border-[#eeefe9] bg-[#fafbf8] px-6 py-4 dark:border-[#363b31] dark:bg-[#252923]">Mã đơn</th>
              <th className="sticky top-0 z-20 min-w-[180px] whitespace-nowrap border-b border-[#eeefe9] bg-[#fafbf8] px-5 py-4 dark:border-[#363b31] dark:bg-[#252923]">Khách hàng</th>
              <th className="sticky top-0 z-20 min-w-[180px] whitespace-nowrap border-b border-[#eeefe9] bg-[#fafbf8] px-5 py-3 dark:border-[#363b31] dark:bg-[#252923]">
                <StatusFilterHeader
                  filterKey="customerOrder"
                  label="Đơn của khách"
                  options={customerOrderOptions}
                  selected={customerOrderFilters}
                  openFilter={openFilter}
                  onOpenFilterChange={setOpenFilter}
                  onChange={onCustomerOrderFiltersChange}
                />
              </th>
              <th className="sticky top-0 z-20 min-w-[190px] whitespace-nowrap border-b border-[#eeefe9] bg-[#fafbf8] px-5 py-4 dark:border-[#363b31] dark:bg-[#252923]">Sản phẩm</th>
              <th className="sticky top-0 z-20 w-[200px] min-w-[200px] whitespace-nowrap border-b border-[#eeefe9] bg-[#fafbf8] px-5 py-3 dark:border-[#363b31] dark:bg-[#252923]">
                <div data-order-filter className="relative flex flex-nowrap items-center gap-2">
                  <span>Ngày tạo</span>
                  <button
                    type="button"
                    aria-label="Lọc theo thời gian đơn hàng"
                    aria-expanded={openFilter === "date"}
                    onClick={() => setOpenFilter(openFilter === "date" ? null : "date")}
                    className={`grid h-7 w-7 place-items-center rounded-lg normal-case tracking-normal transition ${
                      createdFrom || createdTo
                        ? "bg-[#e8f4e9] text-[#26733c] dark:bg-[#30392c] dark:text-[#c4dfa9]"
                        : "text-[#73796f] hover:bg-[#edf0e9] dark:text-[#c4c9bf] dark:hover:bg-[#30342e]"
                    }`}
                  >
                    <i className="pi pi-calendar text-sm" aria-hidden="true" />
                  </button>
                  {openFilter === "date" && (
                    <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-[#e1e5dc] bg-white p-4 normal-case tracking-normal text-[#20231f] shadow-xl dark:border-[#40453b] dark:bg-[#20231f] dark:text-[#f4f5ef]">
                      <p className="mb-3 text-sm font-bold">Thời gian tạo đơn</p>
                      <label className="mb-3 block text-xs font-semibold">
                        Từ ngày
                        <input
                          type="date"
                          value={draftFrom}
                          max={draftTo || undefined}
                          onChange={(event) => setDraftFrom(event.target.value)}
                          className="mt-1.5 h-10 w-full rounded-lg border border-[#e1e5dc] bg-white px-3 text-sm font-normal dark:border-[#40453b] dark:bg-[#191c18]"
                        />
                      </label>
                      <label className="block text-xs font-semibold">
                        Đến ngày
                        <input
                          type="date"
                          value={draftTo}
                          min={draftFrom || undefined}
                          onChange={(event) => setDraftTo(event.target.value)}
                          className="mt-1.5 h-10 w-full rounded-lg border border-[#e1e5dc] bg-white px-3 text-sm font-normal dark:border-[#40453b] dark:bg-[#191c18]"
                        />
                      </label>
                      <div className="mt-4 flex justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDraftFrom("");
                            setDraftTo("");
                            onDateRangeChange("", "");
                            setOpenFilter(null);
                          }}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-[#73796f] hover:bg-[#f5f6f2] dark:hover:bg-[#30342e]"
                        >
                          Xóa lọc
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDateRangeChange(draftFrom, draftTo);
                            setOpenFilter(null);
                          }}
                          className="rounded-lg bg-[#527b49] px-3 py-2 text-xs font-bold text-white hover:bg-[#41643a]"
                        >
                          Áp dụng
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </th>
              <th className="sticky top-0 z-20 min-w-[140px] whitespace-nowrap border-b border-[#eeefe9] bg-[#fafbf8] px-5 py-4 dark:border-[#363b31] dark:bg-[#252923]">Tổng tiền</th>
              <th className="sticky top-0 z-20 min-w-[175px] whitespace-nowrap border-b border-[#eeefe9] bg-[#fafbf8] px-5 py-3 dark:border-[#363b31] dark:bg-[#252923]">
                <StatusFilterHeader
                  filterKey="financial"
                  label="Thanh toán"
                  options={financialOptions}
                  selected={financialFilters}
                  openFilter={openFilter}
                  onOpenFilterChange={setOpenFilter}
                  onChange={onFinancialFiltersChange}
                />
              </th>
              <th className="sticky top-0 z-20 min-w-[165px] whitespace-nowrap border-b border-[#eeefe9] bg-[#fafbf8] px-5 py-3 dark:border-[#363b31] dark:bg-[#252923]">
                <StatusFilterHeader
                  filterKey="fulfillment"
                  label="Giao hàng"
                  options={fulfillmentOptions}
                  selected={fulfillmentFilters}
                  openFilter={openFilter}
                  onOpenFilterChange={setOpenFilter}
                  onChange={onFulfillmentFiltersChange}
                />
              </th>
              <th className="sticky top-0 z-20 min-w-[220px] whitespace-nowrap border-b border-[#eeefe9] bg-[#fafbf8] px-5 py-3 dark:border-[#363b31] dark:bg-[#252923]">
                <StatusFilterHeader
                  filterKey="order"
                  label="Trạng thái đơn hàng"
                  allLabel="Tất cả (any)"
                  options={orderStatusOptions}
                  selected={haravanStatusFilters}
                  openFilter={openFilter}
                  onOpenFilterChange={setOpenFilter}
                  onChange={onHaravanStatusFiltersChange}
                />
              </th>
              <th className="sticky top-0 z-20 min-w-[210px] whitespace-nowrap border-b border-[#eeefe9] bg-[#fafbf8] px-5 py-3 dark:border-[#363b31] dark:bg-[#252923]">
                <StatusFilterHeader
                  filterKey="confirmation"
                  label="Trạng thái xác nhận"
                  options={statusOptions}
                  selected={confirmationFilters}
                  openFilter={openFilter}
                  alignRight
                  onOpenFilterChange={setOpenFilter}
                  onChange={onConfirmationFiltersChange}
                />
              </th>
              <th className="sticky top-0 z-20 min-w-[150px] whitespace-nowrap border-b border-[#eeefe9] bg-[#fafbf8] px-6 py-4 text-right dark:border-[#363b31] dark:bg-[#252923]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {orders.map((order, index) => {
              const key = `${order.orgId}:${order.haravanOrderId}`;
              const confirmed = isConfirmed(order);
              const cancelled = order.haravanStatus === "cancelled"
                || order.payload?.status?.toLowerCase() === "cancelled"
                || order.status === "cancelled";
              const payloadStatus = order.payload?.status?.toLowerCase();
              const cancelledStatus = order.payload?.cancelled_status?.toLowerCase();
              const closedStatus = order.payload?.closed_status?.toLowerCase();
              const haravanStatus = ["open", "closed", "cancelled"].includes(payloadStatus || "")
                ? payloadStatus
                : cancelledStatus === "cancelled" || cancelledStatus === "true" || order.payload?.cancelled_at
                  ? "cancelled"
                  : closedStatus === "closed" || closedStatus === "true" || order.payload?.closed_at
                    ? "closed"
                    : cancelledStatus === "uncancelled" && closedStatus === "unclosed"
                      ? "open"
                    : (cancelledStatus === "false" || closedStatus === "false")
                      ? ""
                      : order.haravanStatus || "";
              return (
                <tr
                  key={key}
                  tabIndex={0}
                  aria-label={`Mở chi tiết đơn hàng ${orderCode(order)}`}
                  onClick={() => onShowDetails(order)}
                  onKeyDown={(event) => {
                    if (
                      event.target === event.currentTarget
                      && (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      onShowDetails(order);
                    }
                  }}
                  className="group cursor-pointer hover:bg-[#fcfcfa] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#7c9f70] dark:hover:bg-[#252923]"
                >
                  <td className="sticky left-0 z-10 border-b border-[#f0f1ec] bg-white px-4 py-4 text-xs font-semibold text-[#73796f] group-hover:bg-[#fcfcfa] dark:border-[#363b31] dark:bg-[#20231f] dark:text-[#b3b9ad] dark:group-hover:bg-[#252923]">
                    {(page - 1) * pageSize + index + 1}
                  </td>
                  <td className="whitespace-nowrap border-b border-[#f0f1ec] px-6 py-4 dark:border-[#363b31]">
                    <span className="font-bold text-[#466d40] group-hover:underline dark:text-[#b7d7a5]">
                      {orderCode(order)}
                    </span>
                    <span className="mt-1 block text-xs text-[#969b91]">ID: {order.haravanOrderId}</span>
                  </td>
                  <td className="whitespace-nowrap border-b border-[#f0f1ec] px-5 py-4 dark:border-[#363b31]">
                    <span className="block font-medium">{order.customerName || order.customer?.fullName || order.customer?.phone || order.phone || order.customer?.email || order.email || "Khách lẻ"}</span>
                    {(order.customer?.phone || order.phone) && <span className="mt-1 block text-xs text-[#969b91]">{order.customer?.phone || order.phone}</span>}
                  </td>
                  <td className="whitespace-nowrap border-b border-[#f0f1ec] px-5 py-4 dark:border-[#363b31]">
                    {order.customerOrderNumber ? (
                      <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
                        order.customerOrderNumber === 1
                          ? "bg-[#e8f4e9] text-[#26733c] dark:bg-[#30392c] dark:text-[#c4dfa9]"
                          : "bg-[#eef3fb] text-[#42689a] dark:bg-[#263346] dark:text-[#b8d2f4]"
                      }`}>
                        {order.customerOrderNumber === 1
                          ? "Đơn đầu tiên"
                          : `Đơn thứ ${order.customerOrderNumber}`}
                      </span>
                    ) : (
                      <span className="text-xs text-[#969b91]">Chưa xác định</span>
                    )}
                  </td>
                  <td className="border-b border-[#f0f1ec] px-5 py-4 dark:border-[#363b31]">
                    <span className="block max-w-[240px] truncate">
                      {order.lineItems?.slice(0, 2).map((item) => item.title || item.name).filter(Boolean).join(", ") || "—"}
                    </span>
                    <span className="mt-1 block text-xs text-[#969b91]">{order.itemCount ?? 0} sản phẩm</span>
                  </td>
                  <td className="whitespace-nowrap border-b border-[#f0f1ec] px-5 py-4 text-[#70766c] dark:border-[#363b31] dark:text-[#c0c6ba]">
                    {readableApiDate(order.createdAt, locale)}
                  </td>
                  <td className="whitespace-nowrap border-b border-[#f0f1ec] px-5 py-4 font-bold dark:border-[#363b31]">
                    {money(order.totalPrice, order.currency, locale)}
                  </td>
                  <td className="whitespace-nowrap border-b border-[#f0f1ec] px-5 py-4 dark:border-[#363b31]">
                    <span className="inline-flex rounded-full bg-[#edf2e9] px-3 py-1.5 text-xs font-semibold text-[#527b49] dark:bg-[#30392c] dark:text-[#c4dfa9]">
                      {paymentStatusText(order.financialStatus)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b border-[#f0f1ec] px-5 py-4 dark:border-[#363b31]">
                    <span className="inline-flex rounded-full bg-[#eef3fb] px-3 py-1.5 text-xs font-semibold text-[#42689a] dark:bg-[#263346] dark:text-[#b8d2f4]">
                      {fulfillmentStatusText(order.fulfillmentStatus)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b border-[#f0f1ec] px-5 py-4 dark:border-[#363b31]">
                    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
                      haravanStatus === "cancelled"
                        ? "bg-[#fde9e7] text-[#b33c32]"
                        : haravanStatus === "open"
                          ? "bg-[#e8f4e9] text-[#26733c] dark:bg-[#30392c] dark:text-[#c4dfa9]"
                          : "bg-[#f1f2ef] text-[#62685e] dark:bg-[#30342e] dark:text-[#d3d8ce]"
                    }`}>
                      {haravanOrderStatusText(haravanStatus)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b border-[#f0f1ec] px-5 py-4 dark:border-[#363b31]">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      cancelled ? "bg-[#fde9e7] text-[#b33c32]" : confirmed ? "bg-[#e8f4e9] text-[#26733c]" : "bg-[#fff2df] text-[#a55b00]"
                    }`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {statusText(order)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b border-[#f0f1ec] px-6 py-4 text-right dark:border-[#363b31]">
                    {cancelled || confirmed ? (
                      <span className="text-xs font-medium text-[#92988d]">{cancelled ? "Đơn đã hủy" : "Đã tiếp nhận"}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onConfirmOrder(order);
                        }}
                        disabled={confirmingOrder === key}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#527b49] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#41643a] disabled:cursor-wait disabled:opacity-60"
                      >
                        {confirmingOrder === key ? <i className="pi pi-spin pi-spinner" aria-hidden="true" /> : <i className="pi pi-check" aria-hidden="true" />}
                        Xác nhận
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && orders.length === 0 && !error && (
          <div className="px-6 py-16 text-center">
            <i className="pi pi-inbox text-3xl text-[#99a28f]" aria-hidden="true" />
            <p className="mt-3 font-semibold">Không tìm thấy đơn hàng</p>
            <p className="mt-1 text-sm text-[#858a80]">Thử thay đổi mã đơn hoặc bộ lọc.</p>
          </div>
        )}
        {loading && (
          <div className="px-6 py-8 text-center text-sm text-[#858a80]">
            <i className="pi pi-spin pi-spinner mr-2" aria-hidden="true" />
            Đang tải danh sách...
          </div>
        )}
      </div>
    </>
  );
}
