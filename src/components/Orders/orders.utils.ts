import { OrderRecord } from "@/services/api/orders";

export type ConfirmationStatus = "confirmed" | "unconfirmed";

export function money(
  value: number | undefined,
  currency: string | undefined,
  locale: string
) {
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
    style: "currency",
    currency: currency || "VND",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function displayName(order: OrderRecord) {
  return (
    order.customerName ||
    order.customer?.fullName ||
    order.customer?.phone ||
    order.phone ||
    order.customer?.email ||
    order.email ||
    "Khách lẻ"
  );
}

export function orderCode(order: OrderRecord) {
  return order.orderName || order.orderNumber || order.name || String(order.haravanOrderId);
}

export function isConfirmed(order: OrderRecord) {
  if (order.payload) {
    return order.payload.confirmed_status?.toLowerCase() === "confirmed";
  }
  return order.confirmedStatus?.toLowerCase() === "confirmed";
}

export function statusText(order: OrderRecord) {
  if (isConfirmed(order)) return "Đã xác nhận";
  return "Chưa xác nhận";
}

export function paymentStatusText(status: string | null | undefined) {
  const statuses: Record<string, string> = {
    pending: "Chờ thanh toán",
    authorized: "Đã xác thực",
    partially_paid: "Thanh toán một phần",
    paid: "Đã thanh toán",
    partially_refunded: "Hoàn tiền một phần",
    refunded: "Đã hoàn tiền",
    voided: "Đã hủy thanh toán",
  };
  return status ? statuses[status.toLowerCase()] || status : "Chưa có dữ liệu";
}

export function fulfillmentStatusText(status: string | null | undefined) {
  const statuses: Record<string, string> = {
    fulfilled: "Đã giao",
    shipped: "Đã giao",
    notfulfilled: "Chưa giao",
    unfulfilled: "Chưa giao",
    unshipped: "Chưa giao",
    partial: "Giao một phần",
  };
  return status ? statuses[status.toLowerCase()] || status : "Chưa giao";
}

export function haravanOrderStatusText(status: string | null | undefined) {
  const statuses: Record<string, string> = {
    open: "Đang mở",
    closed: "Đã đóng",
    cancelled: "Đã hủy",
  };
  return status ? statuses[status.toLowerCase()] || status : "Chưa có dữ liệu";
}

export function readableApiDate(value: string | undefined, locale: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
