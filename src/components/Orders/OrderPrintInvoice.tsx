"use client";

import {
  CustomerAddress,
  OrderLineItem,
  OrderRecord,
} from "@/services/api/orders";
import { money, orderCode } from "./orders.utils";
import { OrderBarcode } from "./OrderBarcode";

export interface InvoiceShopInfo {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
}

const HEADING = "mb-2 border-b-2 border-[#1f4e9c] pb-1 text-[12px] font-bold text-[#1f4e9c]";

function numeric(value: number | string | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return 0;
}

function addressLines(address?: CustomerAddress | null): string[] {
  if (!address) return [];
  const name = address.name || [address.first_name, address.last_name].filter(Boolean).join(" ");
  return [
    name,
    address.company,
    address.address1,
    address.address2,
    [address.ward, address.district, address.province, address.city]
      .filter(Boolean)
      .join(", "),
    address.country,
    address.phone,
  ].map((line) => (line ?? "").trim()).filter(Boolean);
}

function gatewayLabel(gateway?: string | null): string {
  if (!gateway) return "Chưa có thông tin";
  const value = gateway.toLowerCase();
  if (value.includes("cod") || value.includes("cash_on_delivery")) {
    return "Thanh toán khi giao hàng (COD)";
  }
  if (value.includes("bank")) return "Chuyển khoản ngân hàng";
  if (value.includes("card")) return "Thẻ tín dụng";
  return gateway;
}

function shippingLabel(order: OrderRecord): string {
  const lines = order.payload?.shipping_lines ?? [];
  const titles = lines
    .map((line) => line.title || line.code)
    .filter(Boolean) as string[];
  return titles.length ? titles.join(", ") : "Chưa có thông tin";
}

function itemName(item: OrderLineItem): string {
  const title = item.title || item.name || "Sản phẩm";
  return item.variant_title ? `${title} / ${item.variant_title}` : title;
}

export function OrderPrintInvoice({
  order,
  locale,
  shop,
  className = "",
}: {
  order: OrderRecord;
  locale: string;
  shop: InvoiceShopInfo;
  className?: string;
}) {
  const code = orderCode(order);
  const dateFormat = locale === "vi" ? "vi-VN" : "en-US";
  const created = order.createdAt ? new Date(order.createdAt) : new Date();
  const clock = created.toLocaleTimeString(dateFormat, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const day = created.toLocaleDateString(dateFormat);

  const items = order.lineItems ?? [];
  const lineTotal = items.reduce(
    (sum, item) => sum + numeric(item.price) * (item.quantity ?? 0),
    0
  );
  const subtotal = order.subtotalPrice ?? lineTotal;
  const discount = order.totalDiscounts ?? 0;
  const shipping =
    order.payload?.shipping_lines?.reduce(
      (sum, line) => sum + numeric(line.price),
      0
    ) ?? 0;
  const total = order.totalPrice ?? subtotal - discount + shipping;
  const paid = numeric(order.payload?.total_paid);
  const remaining = total - paid;

  const discountNames = (order.payload?.discount_codes ?? [])
    .map((codeItem) => codeItem.code || codeItem.type)
    .filter(Boolean)
    .join(", ");
  const discountLabel = discountNames ? `Khuyến mãi "${discountNames}"` : "Khuyến mãi";
  const currency = order.currency ?? "VND";
  const format = (value: number) => money(value, currency, locale);

  return (
    <article
      className={`print-invoice-page box-border min-h-[297mm] w-full max-w-[210mm] bg-white p-6 text-[12px] leading-relaxed text-black print:min-h-0 ${className}`}
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <header className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-[11px] text-black">{`${clock} ${day}`}</p>
          <h1 className="mt-1 text-[15px] font-bold">{shop.name}</h1>
          <p className="text-[11px]">
            <span className="font-bold">Địa chỉ:</span> {shop.address || "—"}
          </p>
          <p className="text-[11px]">
            <span className="font-bold">Điện thoại:</span> {shop.phone || "—"}
          </p>
          <p className="text-[11px]">
            <span className="font-bold">Website:</span> {shop.website || "—"}
          </p>
          <p className="text-[11px]">
            <span className="font-bold">Email:</span> {shop.email || "—"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px]">Ngày đặt hàng: {day}</p>
          <OrderBarcode value={code} className="ml-auto mt-1" />
          <p className="mt-1 text-[13px] font-bold">{code}</p>
        </div>
      </header>

      <div className="mt-8 flex flex-wrap gap-6">
        <div className="min-w-0 flex-[3]">
          <h2 className={HEADING}>Chi tiết đơn hàng</h2>
          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="border-b border-black/70">
                <th className="py-1 pr-2 text-left font-bold">Mã sản phẩm</th>
                <th className="py-1 pr-2 text-left font-bold">Sản phẩm</th>
                <th className="py-1 pr-2 text-center font-bold">Số lượng</th>
                <th className="py-1 text-right font-bold">Giá</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id ?? index} className="align-top">
                  <td className="py-1 pr-2">{item.sku || "—"}</td>
                  <td className="py-1 pr-2">{itemName(item)}</td>
                  <td className="py-1 pr-2 text-center">{item.quantity ?? 0}</td>
                  <td className="py-1 text-right tabular-nums">
                    {format(numeric(item.price) * (item.quantity ?? 0))}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-2 text-center text-black/60">
                    Đơn hàng chưa có sản phẩm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <h2 className={`${HEADING} mt-8`}>Thông tin thanh toán</h2>
          <dl className="space-y-1.5 text-[11.5px]">
            <Row label="Tổng giá sản phẩm:" value={format(subtotal)} />
            <Row label={`${discountLabel}:`} value={format(discount)} />
            <Row label="Phí vận chuyển:" value={format(shipping)} />
            <Row label="Tổng tiền:" value={format(total)} strong />
            <Row label="Số tiền đã trả:" value={format(paid)} />
            <Row label="Tổng tiền phải trả:" value={format(remaining)} strong />
          </dl>
        </div>

        <div className="min-w-[240px] flex-[2]">
          <h2 className={HEADING}>Thông tin đơn hàng</h2>
          <dl className="space-y-2 border border-[#b9b9b9] p-3 text-[11.5px]">
            <div>
              <dt className="font-bold">Mã đơn hàng:</dt>
              <dd>{code}</dd>
            </div>
            <div>
              <dt className="font-bold">Ngày đặt hàng:</dt>
              <dd>{day}</dd>
            </div>
            <div>
              <dt className="font-bold">Phương thức thanh toán:</dt>
              <dd>{gatewayLabel(order.gateway)}</dd>
            </div>
            <div>
              <dt className="font-bold">Phương thức vận chuyển:</dt>
              <dd>{shippingLabel(order)}</dd>
            </div>
          </dl>

          <h2 className={`${HEADING} mt-8`}>Thông tin mua hàng</h2>
          <div className="border border-[#b9b9b9] p-3 text-[11.5px]">
            {addressLines(order.shippingAddress).map((line, index) => (
              <p key={index}>{line}</p>
            ))}
            {addressLines(order.shippingAddress).length === 0 && (
              <p className="text-black/60">Chưa có địa chỉ nhận hàng.</p>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-10 text-[11px]">
        Nếu bạn có thắc mắc, vui lòng liên hệ chủ tịch quản email{" "}
        {shop.email || "—"} hoặc {shop.phone || "—"}
      </footer>
    </article>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0">{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-bold" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
