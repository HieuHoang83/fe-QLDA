"use client";

import {
  CancelOrderInput,
  CustomerAddress,
  OrderEvent,
  OrderRecord,
} from "@/services/api/orders";
import OrderActions, { OrderRefundInput } from "./OrderActions";
import {
  displayName,
  fulfillmentStatusText,
  money,
  orderCode,
  paymentStatusText,
  readableApiDate,
} from "./orders.utils";

interface OrderDetailDialogProps {
  order: OrderRecord;
  events: OrderEvent[];
  locale: string;
  loading: boolean;
  onClose: () => void;
  actionPending?: string | null;
  onCancelOrder?: (input: CancelOrderInput) => Promise<void>;
  onRefundOrder?: (input: OrderRefundInput) => Promise<void>;
  onCloseOrder?: () => Promise<void>;
  onOpenOrder?: () => Promise<void>;
}

function displayValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value) ?? String(value);
}

function metadataEntries(value: unknown): Array<{ label: string; value: string }> {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => {
      if (typeof entry === "object" && entry !== null) {
        const record = entry as Record<string, unknown>;
        const label = record.name ?? record.property ?? record.title;
        const detail = record.value ?? record.values;
        if (label !== undefined && detail !== undefined) {
          return [{ label: displayValue(label), value: displayValue(detail) }];
        }
      }
      const detail = displayValue(entry);
      return detail ? [{ label: `Thuộc tính ${index + 1}`, value: detail }] : [];
    });
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>).flatMap(([label, entry]) => {
      const detail = displayValue(entry);
      return detail ? [{ label, value: detail }] : [];
    });
  }

  return [];
}

function eventActionLabel(action: string) {
  const labels: Record<string, string> = {
    order_created: "Tạo đơn",
    order_updated: "Cập nhật đơn",
    order_confirmed: "Xác nhận đơn",
    order_confirm_requested: "Gửi yêu cầu xác nhận",
    order_confirm_failed: "Xác nhận không thành công",
    order_cancelled: "Đã hủy đơn",
    order_closed: "Đã đóng đơn",
    order_opened: "Mở lại đơn",
    order_refunded: "Hoàn tiền",
  };
  return labels[action] || action.replaceAll("_", " ");
}

function eventSourceLabel(source: OrderEvent["source"]) {
  const labels: Record<OrderEvent["source"], string> = {
    webhook: "Webhook",
    user: "Người dùng",
    system: "Hệ thống",
    api: "API",
    manual: "Thao tác thủ công",
  };
  return labels[source] || source;
}

function numericValue(value: number | string | null | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function gatewayLabel(gateway: string | null | undefined) {
  if (!gateway) return "Chưa có thông tin";
  const normalized = gateway.toLowerCase();
  if (normalized === "cash_on_delivery" || normalized === "cod") {
    return "Thanh toán khi giao hàng (COD)";
  }
  return gateway;
}

function customerAddressText(address: CustomerAddress | null | undefined) {
  if (!address) return "";
  return [
    address.address1,
    address.address2,
    address.ward,
    address.district,
    address.city,
    address.province,
    address.zip,
    address.country,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join(", ");
}

export default function OrderDetailDialog({
  order,
  events,
  locale,
  loading,
  onClose,
  actionPending = null,
  onCancelOrder,
  onRefundOrder,
  onCloseOrder,
  onOpenOrder,
}: OrderDetailDialogProps) {
  const itemCount = order.itemCount
    ?? order.lineItems?.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
    ?? 0;
  const discountCount = order.payload?.discount_codes?.length
    || order.payload?.discount_applications?.length
    || 0;
  const financialStatus = order.financialStatus?.toLowerCase() ?? "";
  const paidAmount = numericValue(order.payload?.total_paid)
    ?? (["pending", "authorized", "voided"].includes(financialStatus) ? 0 : undefined);
  const refundedAmount = numericValue(order.payload?.total_refunded)
    ?? (["pending", "authorized", "voided", "paid"].includes(financialStatus) ? 0 : undefined);
  const receivedAmount = numericValue(order.payload?.total_received)
    ?? (paidAmount !== undefined && refundedAmount !== undefined ? paidAmount - refundedAmount : undefined);
  const subtotal = order.subtotalPrice
    ?? order.lineItems?.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 0), 0)
    ?? 0;
  const customerAddress = customerAddressText(
    order.payload?.customer?.default_address ?? order.shippingAddress
  );
  const customerOrderCount = order.customer?.ordersCount
    ?? order.customerOrderNumber
    ?? (order.processing?.priorOrderCount !== undefined
      ? order.processing.priorOrderCount + 1
      : undefined);
  const customerSpent = order.customer?.totalSpent ?? order.customer?.totalPaid;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-title"
        className="flex h-[94vh] max-h-[1100px] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#20231f]"
      >
        <header className="shrink-0 border-b border-[#eef0ea] bg-white px-5 py-4 dark:border-[#363b31] dark:bg-[#20231f] sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#71836a]">Chi tiết đơn hàng</p>
              <h2 id="order-detail-title" className="mt-1 text-2xl font-extrabold">{orderCode(order)}</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Đóng chi tiết" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-[#f1f3ee] dark:hover:bg-[#30342e]">
              <i className="pi pi-times" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-[#858a80]">
              Haravan ID {order.haravanOrderId} · Shop {order.orgId}
              {order.customerOrderNumber ? ` · Đơn thứ ${order.customerOrderNumber} của khách` : ""}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf2e9] px-3 py-1.5 text-xs font-semibold text-[#527b49] dark:bg-[#30392c] dark:text-[#c4dfa9]">
              <span className="text-[#73796f] dark:text-[#b3b9ad]">Thanh toán:</span>
              {financialStatus === "pending" ? "Thanh toán chờ xử lý" : paymentStatusText(order.financialStatus)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef3fb] px-3 py-1.5 text-xs font-semibold text-[#42689a] dark:bg-[#263346] dark:text-[#b8d2f4]">
              <span className="text-[#73796f] dark:text-[#b3b9ad]">Giao hàng:</span>
              {fulfillmentStatusText(order.fulfillmentStatus)}
            </span>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 sm:py-6">
        {loading ? (
          <div className="py-12 text-center text-sm text-[#858a80]">
            <i className="pi pi-spin pi-spinner mr-2" aria-hidden="true" />
            Đang tải chi tiết đơn...
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eef0ea] bg-[#fafbf9] px-4 py-3 dark:border-[#363b31] dark:bg-[#191c18]">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#858a80]">Khách hàng</p>
                <p className="mt-1 font-semibold">{displayName(order)}</p>
                <p className="text-sm text-[#73796f] dark:text-[#b3b9ad]">
                  {order.customer?.phone || order.phone || order.customer?.email || order.email || "—"}
                </p>
                <div className="mt-3 grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-[#858a80]">Số đơn hàng: </span>
                    <span className="font-medium">{customerOrderCount ?? "Chưa có dữ liệu"}</span>
                  </p>
                  <p>
                    <span className="text-[#858a80]">Tổng chi tiêu: </span>
                    <span className="font-medium">
                      {customerSpent === undefined ? "Chưa có dữ liệu" : money(customerSpent, order.currency, locale)}
                    </span>
                  </p>
                </div>
                <p className="mt-2 text-sm">
                  <span className="text-[#858a80]">Địa chỉ: </span>
                  <span>{customerAddress || "Chưa có địa chỉ khách hàng"}</span>
                </p>
              </div>
            </div>

            <section className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-bold">Sản phẩm trong đơn</h3>
                <span className="text-sm text-[#73796f] dark:text-[#b3b9ad]">
                  {itemCount} sản phẩm
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-[#e8ebe3] dark:border-[#363b31]">
                <div className="grid grid-cols-[minmax(0,1fr)_48px_80px_88px] gap-2 bg-[#f7f8f5] px-3 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#73796f] dark:bg-[#191c18] dark:text-[#b3b9ad] sm:grid-cols-[minmax(0,1fr)_80px_132px_132px] sm:gap-3 sm:px-4 sm:text-xs">
                  <span>Sản phẩm</span>
                  <span className="text-center">Số lượng</span>
                  <span className="text-right">Giá</span>
                  <span className="text-right">Thành tiền</span>
                </div>
                <div className="divide-y divide-[#eef0ea] dark:divide-[#363b31]">
                  {(order.lineItems || []).map((item, index) => {
                    const quantity = item.quantity ?? 0;
                    const unitPrice = item.price_promotion && item.price_promotion > 0
                      ? item.price_promotion
                      : item.price ?? 0;
                    const lineTotal = unitPrice * quantity - (item.total_discount ?? 0);
                    const properties = metadataEntries(item.properties);

                    return (
                      <div key={`${item.id ?? item.name ?? item.title ?? "item"}-${index}`} className="grid grid-cols-[minmax(0,1fr)_48px_80px_88px] items-center gap-2 px-3 py-4 text-xs sm:grid-cols-[minmax(0,1fr)_80px_132px_132px] sm:gap-3 sm:px-4 sm:text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{item.title || item.name || "Sản phẩm"}</p>
                          {item.variant_title && <p className="mt-0.5 text-xs text-[#73796f] dark:text-[#b3b9ad]">{item.variant_title}</p>}
                          {item.sku && <p className="mt-0.5 text-xs text-[#858a80]">SKU: {item.sku}</p>}
                          {!!item.total_discount && <p className="mt-1 text-xs font-medium text-[#a55b00]">Đã giảm {money(item.total_discount, order.currency, locale)}</p>}
                          {properties.length > 0 && (
                            <p className="mt-1 truncate text-xs text-[#858a80]">
                              {properties.map((property) => `${property.label}: ${property.value}`).join(" · ")}
                            </p>
                          )}
                        </div>
                        <span className="text-center tabular-nums">{quantity}</span>
                        <span className="text-right tabular-nums">{money(unitPrice, order.currency, locale)}</span>
                        <span className="text-right font-semibold tabular-nums">{money(lineTotal, order.currency, locale)}</span>
                      </div>
                    );
                  })}
                  {!order.lineItems?.length && <p className="px-4 py-5 text-sm text-[#858a80]">Không có thông tin sản phẩm.</p>}
                </div>
              </div>
            </section>

            <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
              <section className="rounded-xl border border-[#e8ebe3] p-4 dark:border-[#363b31]">
                <h3 className="font-bold">Ghi chú đơn hàng</h3>
                <p className="mt-2 min-h-12 whitespace-pre-wrap text-sm text-[#555b51] dark:text-[#d0d4ca]">
                  {order.note || order.payload?.note || "Không có ghi chú cho đơn hàng này."}
                </p>
                {metadataEntries(order.payload?.note_attributes).length > 0 && (
                  <dl className="mt-3 space-y-2 border-t border-[#e6e9df] pt-3 text-sm dark:border-[#363b31]">
                    {metadataEntries(order.payload?.note_attributes).map((attribute, index) => (
                      <div key={`${attribute.label}-${index}`} className="flex flex-wrap gap-1">
                        <dt className="font-semibold">{attribute.label}:</dt>
                        <dd className="break-words text-[#73796f] dark:text-[#b3b9ad]">{attribute.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>

              <section className="rounded-xl bg-[#f7f8f5] p-4 dark:bg-[#191c18]">
                <h3 className="font-bold">Tổng kết thanh toán</h3>
                <dl className="mt-3 space-y-2.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#73796f] dark:text-[#b3b9ad]">Số lượng sản phẩm</dt>
                    <dd className="font-medium tabular-nums">{itemCount}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#73796f] dark:text-[#b3b9ad]">Tổng tiền hàng</dt>
                    <dd className="font-medium tabular-nums">{money(subtotal, order.currency, locale)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#73796f] dark:text-[#b3b9ad]">
                      Giảm giá{discountCount ? ` (${discountCount})` : ""}
                    </dt>
                    <dd className="font-medium text-[#a55b00] tabular-nums">−{money(order.totalDiscounts, order.currency, locale)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#73796f] dark:text-[#b3b9ad]">Vận chuyển</dt>
                    <dd className="font-medium tabular-nums">
                      {money(
                        order.payload?.shipping_lines?.reduce((sum, line) => sum + (numericValue(line.price) ?? 0), 0) ?? 0,
                        order.currency,
                        locale
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-[#e2e5dc] pt-3 text-base dark:border-[#363b31]">
                    <dt className="font-bold">Tổng giá trị đơn hàng</dt>
                    <dd className="font-extrabold tabular-nums">{money(order.totalPrice, order.currency, locale)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 pt-1">
                    <dt className="text-[#73796f] dark:text-[#b3b9ad]">{gatewayLabel(order.gateway)}</dt>
                    <dd className="font-medium tabular-nums">{money(order.totalPrice, order.currency, locale)}</dd>
                  </div>
                  {order.totalTax !== undefined && order.totalTax > 0 && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#73796f] dark:text-[#b3b9ad]">Thuế</dt>
                      <dd className="font-medium tabular-nums">{money(order.totalTax, order.currency, locale)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#73796f] dark:text-[#b3b9ad]">Đã thanh toán</dt>
                    <dd className="font-medium tabular-nums">{paidAmount === undefined ? "—" : money(paidAmount, order.currency, locale)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#73796f] dark:text-[#b3b9ad]">Đã hoàn trả</dt>
                    <dd className="font-medium tabular-nums">{refundedAmount === undefined ? "—" : money(refundedAmount, order.currency, locale)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-[#e2e5dc] pt-2 dark:border-[#363b31]">
                    <dt className="font-semibold">Thực nhận</dt>
                    <dd className="font-bold tabular-nums">{receivedAmount === undefined ? "—" : money(receivedAmount, order.currency, locale)}</dd>
                  </div>
                </dl>
              </section>
            </div>

            {(order.payload?.discount_codes?.length || order.payload?.discount_applications?.length) ? (
              <section className="mt-4 rounded-xl border border-[#f0e6d2] bg-[#fffaf0] p-4 text-sm dark:border-[#51432a] dark:bg-[#30291d]">
                <h3 className="font-bold text-[#8a5a17] dark:text-[#f0c77f]">Chi tiết giảm giá</h3>
                <div className="mt-2 space-y-1.5 text-[#73796f] dark:text-[#d6c9ad]">
                  {order.payload?.discount_codes?.map((discount, index) => (
                    <p key={`${discount.code || "discount"}-${index}`}>
                      Mã giảm giá {discount.code || "không tên"}: {discount.amount !== undefined
                        ? discount.type === "percentage"
                          ? `${discount.amount}%`
                          : money(Number(discount.amount), order.currency, locale)
                        : "Không có số tiền"}
                      {discount.type ? ` · ${discount.type}` : ""}
                    </p>
                  ))}
                  {order.payload?.discount_applications?.map((discount, index) => (
                    <p key={`${discount.code || discount.title || "application"}-${index}`}>
                      {discount.title || discount.code || "Ưu đãi"}
                      {discount.value !== undefined ? ` · ${discount.value}${discount.value_type === "percentage" ? "%" : ""}` : ""}
                      {discount.value_type && discount.value_type !== "percentage" ? ` · ${discount.value_type}` : ""}
                      {discount.allocation_method ? ` · phân bổ ${discount.allocation_method}` : ""}
                    </p>
                  ))}
                </div>
              </section>
            ) : order.totalDiscounts ? (
              <p className="mt-4 rounded-xl bg-[#fff8eb] p-4 text-sm text-[#8a5a17] dark:bg-[#30291d] dark:text-[#f0c77f]">
                API không trả chi tiết chương trình hoặc mã giảm giá.
              </p>
            ) : null}

            <h3 className="mt-6 font-bold">Nhật ký sự kiện đơn hàng</h3>
            <div className="mt-3 overflow-x-auto rounded-xl border border-[#eef0ea] dark:border-[#363b31]">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-[#f7f8f5] text-xs text-[#73796f] dark:bg-[#191c18] dark:text-[#b3b9ad]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Thời gian</th>
                    <th className="px-4 py-3 font-semibold">Nguồn</th>
                    <th className="px-4 py-3 font-semibold">Hành động</th>
                    <th className="px-4 py-3 font-semibold">Nội dung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef0ea] dark:divide-[#363b31]">
                  {events.map((event, index) => (
                    <tr key={`${event.action}-${event.createdAt}-${index}`} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[#73796f] dark:text-[#b3b9ad]">{readableApiDate(event.createdAt, locale)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex rounded-full bg-[#edf2e9] px-2.5 py-1 text-xs font-semibold text-[#527b49] dark:bg-[#30392c] dark:text-[#c4dfa9]">
                          {eventSourceLabel(event.source)}
                        </span>
                        {event.actor && <span className="mt-1 block text-xs text-[#858a80]">{event.actor}</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold">{eventActionLabel(event.action)}</td>
                      <td className="px-4 py-3">
                        <p>{event.description}</p>
                        {event.topic && <p className="mt-1 text-xs text-[#858a80]">{event.topic}</p>}
                        {event.changedFields.length > 0 && <p className="mt-1 break-words text-xs text-[#73796f] dark:text-[#b3b9ad]">Trường thay đổi: {event.changedFields.join(", ")}</p>}
                      </td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-[#858a80]">Chưa có sự kiện được ghi nhận.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {onCancelOrder && onRefundOrder && onCloseOrder && onOpenOrder && (
              <OrderActions
                order={order}
                locale={locale}
                pending={actionPending}
                onCancel={onCancelOrder}
                onRefund={onRefundOrder}
                onCloseOrder={onCloseOrder}
                onOpenOrder={onOpenOrder}
              />
            )}
          </>
        )}
        </div>
      </section>
    </div>
  );
}
