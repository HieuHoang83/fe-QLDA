"use client";

import {
  CustomerAddress,
  OrderEvent,
  OrderRecord,
} from "@/services/api/orders";
import {
  displayName,
  fulfillmentStatusText,
  haravanOrderStatusText,
  money,
  orderCode,
  paymentStatusText,
  readableApiDate,
} from "./orders.utils";

export interface TransactionLocal {
  id?: number;
  order_id?: number;
  amount?: number;
  authorization?: string | null;
  created_at?: string;
  gateway?: string;
  kind?: string;
  status?: string;
  currency?: string;
}

export interface OrderDetailViewProps {
  order: OrderRecord;
  events: OrderEvent[];
  locale: string;
  loading?: boolean;
  actionPending?: string | null;
  transactions?: TransactionLocal[];
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
      return detail ? [{ label: "Thuộc tính " + (index + 1), value: detail }] : [];
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
    order_confirm_requested: "Gởi yêu cầu xác nhận",
    order_confirm_failed: "Xác nhận không thành công",
    order_cancelled: "Đã hủy đơn",
    order_closed: "Đã đóng đơn",
    order_opened: "Mở lại đơn",
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

function Row({ label, value, bold, accent }: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className={bold ? "font-bold" : "text-[#73796f] dark:text-[#b3b9ad]"}>{label}</dt>
      <dd className={"tabular-nums " + (bold ? "font-extrabold" : "font-medium") + " " + (accent ? "text-[#a55b00]" : "")}>
        {value}
      </dd>
    </div>
  );
}

function transactionKindLabel(kind: string | undefined) {
  const map: Record<string, string> = {
    pending: "Chờ thanh toán",
    authorization: "Ủy quyền",
    sale: "Thanh toán",
    capture: "Thanh toán",
    void: "Hủy giao dịch",
    refund: "Hoàn tiền",
  };
  return kind ? (map[kind.toLowerCase()] ?? kind) : "—";
}

function transactionStatusBadge(status: string | undefined) {
  if (status === "success") return "text-green-600 bg-green-50";
  if (status === "failure" || status === "error") return "text-red-600 bg-red-50";
  return "text-yellow-600 bg-yellow-50";
}

export default function OrderDetailView({
  order,
  events,
  locale,
  loading,
  actionPending,
  transactions,
}: OrderDetailViewProps) {
  loading = loading ?? false;
  actionPending = actionPending ?? null;
  transactions = transactions ?? [];
  
  const itemCount = order.itemCount
    ?? order.lineItems?.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
    ?? 0;
  const discountCount = order.payload?.discount_codes?.length
    ?? order.payload?.discount_applications?.length
    ?? 0;
  const paidAmount = numericValue(order.payload?.total_paid);
  const refundedAmount = numericValue(order.payload?.total_refunded);
  const receivedAmount = numericValue(order.payload?.total_received);
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
  const shippingCost = order.payload?.shipping_lines?.reduce(
    (sum, line) => sum + (numericValue(line.price) ?? 0),
    0
  ) ?? 0;

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#e6e9df] bg-white px-5 py-16 text-center text-sm text-[#858a80] dark:border-[#363b31] dark:bg-[#20231f]">
        <i className="pi pi-spin pi-spinner mr-2" aria-hidden="true" />
        Đang tải chi tiết đơn...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#e6e9df] bg-white p-5 dark:border-[#363b31] dark:bg-[#20231f]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Info label="Mã đơn" value={orderCode(order)} emphasis />
          <Info label="Haravan ID" value={String(order.haravanOrderId)} />
          <Info label="Ngày đặt hàng" value={readableApiDate(order.createdAt, locale)} />
          <Info label="Cửa hàng" value={"Shop " + order.orgId} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge>{paymentStatusText(order.financialStatus)}</Badge>
          <Badge>{fulfillmentStatusText(order.fulfillmentStatus)}</Badge>
          <Badge>{haravanOrderStatusText(order.haravanStatus ?? order.payload?.status)}</Badge>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e6e9df] bg-white p-5 dark:border-[#363b31] dark:bg-[#20231f]">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[#858a80]">Khách hàng</h2>
        <p className="mt-1 text-lg font-extrabold">{displayName(order)}</p>
        <p className="text-sm text-[#73796f] dark:text-[#b3b9ad]">
          {order.customer?.phone || order.phone || order.customer?.email || order.email || "—"}
        </p>
        <div className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Số đơn hàng"
            value={customerOrderCount === undefined ? "Chưa có dữ liệu" : String(customerOrderCount)}
          />
          <Field
            label="Tổng chi tiêu"
            value={customerSpent === undefined ? "Chưa có dữ liệu" : money(customerSpent, order.currency, locale)}
          />
          <Field label="Email" value={order.customer?.email ?? order.email ?? "—"} />
          <Field label="Địa chỉ" value={customerAddress || "Chưa có địa chỉ khách hàng"} />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e6e9df] bg-white dark:border-[#363b31] dark:bg-[#20231f]">
        <div className="flex items-center justify-between gap-3 border-b border-[#eef0ea] px-5 py-4 dark:border-[#363b31]">
          <h2 className="font-bold">Sản phẩm trong đơn</h2>
          <span className="text-sm text-[#73796f] dark:text-[#b3b9ad]">{itemCount} sản phẩm</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-[#f8f9f6] text-left text-xs font-bold uppercase tracking-wide text-[#66705f] dark:bg-[#191c18] dark:text-[#c5cbbd]">
              <tr>
                <th className="px-5 py-3">Sản phẩm</th>
                <th className="px-4 py-3 text-right">Số lượng</th>
                <th className="px-4 py-3 text-right">Giá</th>
                <th className="px-5 py-3 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef0ea] dark:divide-[#363b31]">
              {(order.lineItems || []).map((item, index) => {
                const quantity = item.quantity ?? 0;
                const unitPrice =
                  item.price_promotion && item.price_promotion > 0
                    ? item.price_promotion
                    : item.price ?? 0;
                const lineTotal = unitPrice * quantity - (item.total_discount ?? 0);
                const properties = metadataEntries(item.properties);

                return (
                  <tr key={String(item.id ?? item.name ?? item.title ?? "item") + "-" + index}>
                    <td className="px-5 py-4">
                      <p className="font-semibold">{item.title || item.name || "Sản phẩm"}</p>
                      {item.variant_title && (
                        <p className="mt-0.5 text-xs text-[#73796f] dark:text-[#b3b9ad]">{item.variant_title}</p>
                      )}
                      {item.sku && <p className="mt-0.5 text-xs text-[#858a80]">SKU: {item.sku}</p>}
                      {!!item.total_discount && (
                        <p className="mt-1 text-xs font-medium text-[#a55b00]">
                          Đã giảm {money(item.total_discount, order.currency, locale)}
                        </p>
                      )}
                      {properties.length > 0 && (
                        <p className="mt-1 text-xs text-[#858a80]">
                          {properties.map((p) => p.label + ": " + p.value).join(" · ")}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums">{quantity}</td>
                    <td className="px-4 py-4 text-right tabular-nums">{money(unitPrice, order.currency, locale)}</td>
                    <td className="px-5 py-4 text-right font-semibold tabular-nums">
                      {money(lineTotal, order.currency, locale)}
                    </td>
                  </tr>
                );
              })}
              {!(order.lineItems?.length) && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-[#858a80]">
                    Không có thông tin sản phẩm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#e6e9df] bg-white p-5 dark:border-[#363b31] dark:bg-[#20231f]">
          <h2 className="font-bold">Ghi chú đơn hàng</h2>
          <p className="mt-2 min-h-12 whitespace-pre-wrap text-sm text-[#555b51] dark:text-[#d0d4ca]">
            {order.note || order.payload?.note || "Không có ghi chú cho đơn hàng này."}
          </p>
          {metadataEntries(order.payload?.note_attributes).length > 0 && (
            <dl className="mt-3 space-y-2 border-t border-[#e6e9df] pt-3 text-sm dark:border-[#363b31]">
              {metadataEntries(order.payload?.note_attributes).map((attribute, index) => (
                <div key={attribute.label + "-" + index} className="flex flex-wrap gap-1">
                  <dt className="font-semibold">{attribute.label}:</dt>
                  <dd className="break-words text-[#73796f] dark:text-[#b3b9ad]">{attribute.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section className="rounded-2xl border border-[#e6e9df] bg-white p-5 dark:border-[#363b31] dark:bg-[#20231f]">
          <h2 className="font-bold">Tổng kết thanh toán</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <Row label="Số lượng sản phẩm" value={itemCount} />
            <Row label="Tổng tiền hàng" value={money(subtotal, order.currency, locale)} />
            <Row
              label={"Giảm giá" + (discountCount ? " (" + discountCount + ")" : "")}
              value={"−" + money(order.totalDiscounts, order.currency, locale)}
              accent
            />
            <Row label="Vận chuyển" value={money(shippingCost, order.currency, locale)} />
            <div className="border-t border-[#e2e5dc] pt-3 text-base dark:border-[#363b31]">
              <Row label="Tổng giá trị đơn hàng" value={money(order.totalPrice, order.currency, locale)} bold />
            </div>
            <Row label={gatewayLabel(order.gateway)} value={money(order.totalPrice, order.currency, locale)} />
            {order.totalTax !== undefined && order.totalTax > 0 && (
              <Row label="Thuế" value={money(order.totalTax, order.currency, locale)} />
            )}
            <Row
              label="Đã thanh toán"
              value={paidAmount === undefined ? "—" : money(paidAmount, order.currency, locale)}
            />
            <Row
              label="Đã hoàn trả"
              value={refundedAmount === undefined ? "—" : money(refundedAmount, order.currency, locale)}
            />
            <div className="border-t border-[#e2e5dc] pt-2 dark:border-[#363b31]">
              <Row
                label="Thực nhận"
                bold
                value={receivedAmount === undefined ? "—" : money(receivedAmount, order.currency, locale)}
              />
            </div>
          </dl>
        </section>
      </div>

      {(order.payload?.discount_codes?.length || order.payload?.discount_applications?.length) ? (
        <section className="rounded-2xl border border-[#f0e6d2] bg-[#fffaf0] p-5 text-sm dark:border-[#51432a] dark:bg-[#30291d]">
          <h2 className="font-bold">Chương trình giảm giá</h2>
          <div className="mt-2 space-y-1">
            {order.payload?.discount_codes?.map((discount, index) => (
              <p key={"code-" + index} className="flex flex-wrap gap-1">
                <span className="font-semibold">{discount.code || discount.type || "Mã giảm giá"}</span>
                <span className="text-[#8a5a17]">{discount.amount}</span>
              </p>
            ))}
            {order.payload?.discount_applications?.map((discount, index) => (
              <p key={"app-" + index} className="flex flex-wrap gap-1">
                <span className="font-semibold">{discount.title || discount.code}</span>
                <span className="text-[#8a5a17]">
                  {discount.value}
                  {discount.value_type === "percentage" ? "%" : ""}
                </span>
                {discount.allocation_method && <span>· phân bổ {discount.allocation_method}</span>}
              </p>
            ))}
          </div>
        </section>
      ) : order.totalDiscounts ? (
        <p className="rounded-xl bg-[#fff8eb] p-4 text-sm text-[#8a5a17] dark:bg-[#30291d] dark:text-[#f0c77f]">
          API không trả chi tiết chương trình hoặc mã giảm giá.
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-[#e6e9df] bg-white dark:border-[#363b31] dark:bg-[#20231f]">
        <div className="flex items-center justify-between gap-3 border-b border-[#eef0ea] px-5 py-4 dark:border-[#363b31]">
          <h2 className="font-bold">Lịch sử giao dịch</h2>
          <span className="text-sm text-[#73796f] dark:text-[#b3b9ad]">{transactions.length} giao dịch</span>
        </div>
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8f9f6] text-xs text-[#73796f] dark:bg-[#191c18] dark:text-[#b3b9ad]">
                <tr>
                  <th className="px-5 py-3 font-semibold text-left">Thời gian</th>
                  <th className="px-4 py-3 font-semibold text-left">Loại</th>
                  <th className="px-4 py-3 font-semibold text-left">Cổng thanh toán</th>
                  <th className="px-4 py-3 font-semibold text-right">Số tiền</th>
                  <th className="px-5 py-3 font-semibold text-left">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef0ea] dark:divide-[#363b31]">
                {transactions.map((t, index) => (
                  <tr key={String(t.id ?? index)}>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-[#73796f] dark:text-[#b3b9ad]">
                      {t.created_at ? readableApiDate(t.created_at, locale) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {transactionKindLabel(t.kind)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#555b51] dark:text-[#d0d4ca]">
                      {t.gateway || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
                      {t.amount ? money(t.amount, t.currency || order.currency, locale) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-semibold " + transactionStatusBadge(t.status)}>
                        {t.status || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-6 text-sm text-[#858a80]">Chưa có giao dịch nào.</p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e6e9df] bg-white dark:border-[#363b31] dark:bg-[#20231f]">
        <h2 className="px-5 pt-4 font-bold">Nhật ký sự kiện đơn hàng</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-[#f8f9f6] text-xs text-[#73796f] dark:bg-[#191c18] dark:text-[#b3b9ad]">
              <tr>
                <th className="px-5 py-3 font-semibold">Thời gian</th>
                <th className="px-4 py-3 font-semibold">Nguồn</th>
                <th className="px-4 py-3 font-semibold">Hành động</th>
                <th className="px-5 py-3 font-semibold">Nội dung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef0ea] dark:divide-[#363b31]">
              {events.map((event, index) => (
                <tr key={event.action + "-" + event.createdAt + "-" + index} className="align-top">
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-[#73796f] dark:text-[#b3b9ad]">
                    {readableApiDate(event.createdAt, locale)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="inline-flex rounded-full bg-[#edf2e9] px-2.5 py-1 text-xs font-semibold text-[#527b49] dark:bg-[#30392c] dark:text-[#c4dfa9]">
                      {eventSourceLabel(event.source)}
                    </span>
                    {event.actor && <span className="mt-1 block text-xs text-[#858a80]">{event.actor}</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">{eventActionLabel(event.action)}</td>
                  <td className="px-5 py-3">
                    <p>{event.description}</p>
                    {event.topic && <p className="mt-1 text-xs text-[#858a80]">{event.topic}</p>}
                    {event.changedFields.length > 0 && (
                      <p className="mt-1 break-words text-xs text-[#73796f] dark:text-[#b3b9ad]">
                        Trường thay đổi: {event.changedFields.join(", ")}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm text-[#858a80]">
                    Chưa có sự kiện được ghi nhận.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="rounded-xl bg-[#f8f9f6] px-4 py-3 dark:bg-[#191c18]">
      <span className="block text-xs font-semibold text-[#858a80]">{label}</span>
      <span className={"mt-1 block text-sm " + (emphasis ? "font-extrabold" : "font-semibold")}>{value}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-[#858a80]">{label}: </span>
      <span className="font-medium">{value}</span>
    </p>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf2e9] px-3 py-1.5 text-xs font-semibold text-[#527b49] dark:bg-[#30392c] dark:text-[#c4dfa9]">
      {children}
    </span>
  );
}