"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMoney } from "@/lib/haravan-format";
import {
  purchaseOrderRowStatus,
  purchaseOrderRows,
  purchaseOrderStatus,
  purchaseOrderStatusLabel,
  purchaseOrderSupplierName,
  purchaseOrderTotals,
  type PurchaseOrderDocument,
  type PurchaseOrderRow,
  type PurchaseOrderStatus,
} from "@/services/api/inventory-documents";

type DetailTab = "all" | "received" | "pending";

const tabLabels: Record<DetailTab, string> = {
  all: "Tất cả sản phẩm",
  received: "Sản phẩm đã nhập",
  pending: "Sản phẩm chờ nhập",
};

const statusStyles: Record<PurchaseOrderStatus, string> = {
  received: "bg-emerald-50 text-emerald-700",
  partial: "bg-amber-50 text-amber-700",
  pending: "bg-blue-50 text-blue-700",
  closed: "bg-[#f0f2f5] text-[#6b7280] dark:bg-[#2a2e27] dark:text-[#a9b0a2]",
};

function addressOf(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(", ") || "Chưa có địa chỉ";
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
}

export default function PurchaseOrderDetail({
  document,
  locale,
}: {
  document: PurchaseOrderDocument;
  locale: string;
}) {
  const [tab, setTab] = useState<DetailTab>("all");
  const totals = purchaseOrderTotals(document);
  const status = purchaseOrderStatus(document);
  const allRows = purchaseOrderRows(document);

  const rows: PurchaseOrderRow[] =
    tab === "received"
      ? allRows.filter((row) => row.receivedQuantity > 0)
      : tab === "pending"
        ? allRows.filter((row) => row.pendingQuantity > 0)
        : allRows;

  const supplier = typeof document.supplier === "object" ? document.supplier : null;
  const percent =
    totals.totalQuantity > 0
      ? Math.round((totals.receivedQuantity / totals.totalQuantity) * 100)
      : 0;

  const tabCounts: Record<DetailTab, number> = {
    all: allRows.length,
    received: allRows.filter((row) => row.receivedQuantity > 0).length,
    pending: allRows.filter((row) => row.pendingQuantity > 0).length,
  };

  return (
    <>
      <section className="rounded-2xl border border-[#e6e9df] bg-white p-5 dark:border-[#363b31] dark:bg-[#20231f]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Summary
            label="Mã đơn đặt hàng"
            value={document.purchase_number || document.ref_number || `#${document.id}`}
          />
          <Summary
            label="Ngày đặt hàng"
            value={document.tran_date ? new Date(document.tran_date).toLocaleDateString("vi-VN") : "—"}
          />
          <Summary label="Trạng thái" value={purchaseOrderStatusLabel[status]} badge={status} />
          <Summary label="Tổng giá trị đơn" value={formatMoney(totals.totalCost)} emphasis />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <PartyCard
          title="Nhà cung cấp"
          icon="pi-truck"
          name={purchaseOrderSupplierName(document) || "Chưa có nhà cung cấp"}
          address={addressOf([supplier?.address, supplier?.district, supplier?.province, supplier?.country])}
          phone={supplier?.phone}
          email={supplier?.email}
        />
        <PartyCard title="Kho nhập" icon="pi-box" name={document.location?.name || "Kho nhập"} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#e6e9df] bg-white dark:border-[#363b31] dark:bg-[#20231f]">
        <nav
          className="flex flex-wrap gap-1 border-b border-[#eef0ea] px-4 pt-3 dark:border-[#363b31]"
          aria-label="Chi tiết đơn đặt hàng"
        >
          {(["all", "received", "pending"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-t-lg px-4 py-3 text-sm font-semibold ${
                tab === key
                  ? "border-b-2 border-[#527b49] text-[#527b49]"
                  : "text-[#73796f] hover:bg-[#f8f9f6]"
              }`}
            >
              {tabLabels[key]}{" "}
              <span className="ml-1 text-xs text-[#858a80]">({tabCounts[key]})</span>
            </button>
          ))}
        </nav>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="bg-[#f8f9f6] text-left text-xs font-bold uppercase tracking-wide text-[#66705f] dark:bg-[#191c18] dark:text-[#c5cbbd]">
              <tr>
                <th className="px-5 py-3">Tên sản phẩm</th>
                <th className="px-4 py-3">SKU / Barcode</th>
                <th className="px-4 py-3 text-right">Tổng SL</th>
                <th className="px-4 py-3">Đã nhập / Tổng</th>
                <th className="px-4 py-3 text-right">Đơn giá</th>
                <th className="px-4 py-3 text-right">Thành tiền</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-5 py-3">Nhập gần nhất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef0ea] dark:divide-[#363b31]">
              {rows.map((line, index) => {
                const rowStatus = purchaseOrderRowStatus(line);
                const rowPercent =
                  line.totalQuantity > 0
                    ? Math.round((line.receivedQuantity / line.totalQuantity) * 100)
                    : 0;

                return (
                  <tr key={`${line.product_variant_id ?? line.product_id ?? "row"}-${index}`}>
                    <td className="px-5 py-4">
                      <p className="font-semibold">
                        {line.product_name || `Sản phẩm #${line.product_id ?? "—"}`}
                      </p>
                      {line.variant_title && (
                        <p className="mt-1 text-xs text-[#73796f] dark:text-[#b3b9ad]">
                          {line.variant_title}
                        </p>
                      )}
                      {line.receiveCount > 1 && (
                        <p className="mt-1 text-xs text-[#858a80]">Đã nhập {line.receiveCount} lần</p>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <p>{line.sku || "—"}</p>
                      <p className="mt-1 text-xs text-[#858a80]">{line.barcode || "—"}</p>
                    </td>

                    <td className="px-4 py-4 text-right tabular-nums font-semibold">
                      {line.totalQuantity.toLocaleString("vi-VN")}
                    </td>

                    <td className="px-4 py-4">
                      <p className="tabular-nums font-bold">
                        {line.receivedQuantity.toLocaleString("vi-VN")}
                        <span className="font-normal text-[#858a80]">
                          {" / "}
                          {line.totalQuantity.toLocaleString("vi-VN")}
                        </span>
                      </p>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#e8ebe3] dark:bg-[#2f342c]">
                        <div
                          className={`h-full rounded-full ${rowPercent >= 100 ? "bg-emerald-500" : rowPercent > 0 ? "bg-amber-500" : "bg-[#c9cec2]"}`}
                          style={{ width: `${Math.min(100, rowPercent)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[#858a80]">{rowPercent}%</p>
                    </td>

                    <td className="px-4 py-4 text-right tabular-nums">
                      {formatMoney(line.totalCost / (line.totalQuantity || 1))}
                    </td>

                    <td className="px-4 py-4 text-right tabular-nums">
                      {formatMoney(line.totalCost)}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[rowStatus]}`}
                      >
                        {purchaseOrderStatusLabel[rowStatus]}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs text-[#858a80]">
                      {formatDateTime(line.lastReceiveDate)}
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-[#858a80]">
                    {tab === "received"
                      ? "Chưa có sản phẩm nào được nhập cho đơn này."
                      : "Đã nhập đủ tất cả sản phẩm trong đơn."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-[#e6e9df] bg-white p-5 dark:border-[#363b31] dark:bg-[#20231f]">
          <h2 className="mb-4 font-bold">Thông tin thêm</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Summary label="Mã tham chiếu" value={document.ref_number || "—"} />
            <Summary label="Ngày tạo" value={formatDateTime(document.created_at)} />
            <Summary label="Cập nhật lần cuối" value={formatDateTime(document.updated_at)} />
            <Summary label="Ngày hoàn thành" value={formatDateTime(document.completed_at)} />
            <Summary label="Ngày đóng" value={formatDateTime(document.closed_at)} />
            <Summary label="Ghi chú" value={document.notes || "—"} />
          </div>
        </section>

        <section className="rounded-2xl border border-[#e6e9df] bg-white p-5 dark:border-[#363b31] dark:bg-[#20231f]">
          <h2 className="mb-4 font-bold">Giá trị đơn hàng</h2>
          <div className="space-y-3 text-sm">
            <SummaryRow
              label="Tổng số lượng"
              value={totals.totalQuantity.toLocaleString("vi-VN")}
            />
            <SummaryRow
              label="Đã nhập"
              value={`${totals.receivedQuantity.toLocaleString("vi-VN")} · ${formatMoney(totals.receivedCost)}`}
            />
            <SummaryRow
              label="Chờ nhập"
              value={`${totals.pendingQuantity.toLocaleString("vi-VN")} · ${formatMoney(totals.pendingCost)}`}
            />
            <div className="border-t border-[#eef0ea] pt-3 dark:border-[#363b31]">
              <SummaryRow label="Tổng tiền" value={formatMoney(totals.totalCost)} strong />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-[#858a80]">
              <span>Tỷ lệ đã nhập</span>
              <span className="font-bold text-[#20231f] dark:text-white">{percent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#e8ebe3] dark:bg-[#2f342c]">
              <div
                className={`h-full rounded-full ${percent >= 100 ? "bg-emerald-500" : "bg-[#527b49]"}`}
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>
          </div>

          {totals.pendingQuantity > 0 && (
            <Link
              href={`/${locale}/inventory/receives/new?purchase_order_id=${document.id}`}
              className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#527b49] text-sm font-bold text-white hover:bg-[#41643a]"
            >
              <i className="pi pi-download" /> Nhập hàng từ đơn này
            </Link>
          )}
        </section>
      </div>
    </>
  );
}

function Summary({
  label,
  value,
  emphasis = false,
  badge,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  badge?: PurchaseOrderStatus;
}) {
  return (
    <div className="rounded-xl bg-[#f8f9f6] px-4 py-3 dark:bg-[#191c18]">
      <span className="block text-xs font-semibold text-[#858a80]">{label}</span>
      {badge ? (
        <span
          className={`mt-1 inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[badge]}`}
        >
          {value}
        </span>
      ) : (
        <span
          className={`mt-1 block text-sm ${emphasis ? "font-extrabold text-[#a34b42]" : "font-semibold"}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        strong
          ? "font-bold text-[#20231f] dark:text-white"
          : "text-[#66705f] dark:text-[#c5cbbd]"
      }`}
    >
      <span>{label}</span>
      <span className="shrink-0 tabular-nums">{value}</span>
    </div>
  );
}

function PartyCard({
  title,
  icon,
  name,
  address,
  phone,
  email,
}: {
  title: string;
  icon: string;
  name: string;
  address?: string;
  phone?: string | null;
  email?: string | null;
}) {
  return (
    <section className="rounded-2xl border border-[#e6e9df] bg-white p-5 dark:border-[#363b31] dark:bg-[#20231f]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f3f5ef] text-[#71836a] dark:bg-[#30392c]">
          <i className={`pi ${icon}`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-[#858a80]">{title}</p>
          <h2 className="mt-1 font-extrabold">{name}</h2>
          {address && (
            <p className="mt-2 text-sm text-[#66705f] dark:text-[#c5cbbd]">{address}</p>
          )}
          {phone && (
            <p className="mt-1 text-sm text-[#66705f] dark:text-[#c5cbbd]">{phone}</p>
          )}
          {email && (
            <p className="mt-1 text-sm text-[#66705f] dark:text-[#c5cbbd]">{email}</p>
          )}
        </div>
      </div>
    </section>
  );
}
