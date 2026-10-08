"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import HaravanShell from "@/components/haravan/HaravanShell";
import { useShop } from "@/context/ShopContext";
import { formatMoney } from "@/lib/haravan-format";
import { getPurchaseReceive, type HaravanPurchaseReceive } from "@/services/api/purchase-receives";

type DetailTab = "products" | "payments" | "returns";

function address(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(", ") || "Chưa có địa chỉ";
}

function value(money?: number) {
  return formatMoney(money ?? 0);
}

export default function PurchaseReceiveDetailPage() {
  const params = useParams<{ id: string }>();
  const locale = useLocale();
  const id = Number(params.id);
  const { data: session } = useSession();
  const { currentShop } = useShop();
  const token = session?.access_token;
  const [receive, setReceive] = useState<HaravanPurchaseReceive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<DetailTab>("products");
  const [action, setAction] = useState<"return" | "payment" | null>(null);

  useEffect(() => {
    if (!token || !Number.isSafeInteger(id) || id <= 0) return;
    let cancelled = false;
    setLoading(true);
    getPurchaseReceive(token, currentShop.orgId, id)
      .then((result) => { if (!cancelled) setReceive(result.purchase_receive ?? null); })
      .catch((requestError) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Không tải được phiếu nhập."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, currentShop.orgId, id]);

  const lines = receive?.line_items
    ? Array.isArray(receive.line_items) ? receive.line_items : [receive.line_items]
    : [];
  const supplierName = receive?.supplier?.supplier_name || receive?.supplier?.name || "Chưa có nhà cung cấp";
  const supplierAddress = address([
    receive?.supplier?.address,
    receive?.supplier?.district,
    receive?.supplier?.province,
    receive?.supplier?.country,
  ]);
  const locationAddress = address([
    receive?.location?.address1,
    receive?.location?.address2,
    receive?.location?.district,
    receive?.location?.province,
    receive?.location?.country,
  ]);
  const createdAt = receive?.received_at || receive?.created_at;

  return <HaravanShell title="Chi tiết phiếu nhập">
    <div className="mx-auto w-full max-w-[1350px] space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/${locale}/inventory/receives`} className="inline-flex items-center gap-2 text-sm font-semibold text-[#527b49] hover:text-[#41643a]"><i className="pi pi-arrow-left" /> Danh sách nhập hàng</Link>
          <h1 className="mt-2 text-2xl font-extrabold">{receive?.receive_number || `Phiếu nhập #${id}`}</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setAction("return")} disabled={!receive || receive.status === "Đã hủy"} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e1e5dc] bg-white px-4 text-sm font-bold text-[#a34b42] hover:bg-[#fff5f3] disabled:opacity-50"><i className="pi pi-replay" /> Trả hàng</button>
          <button type="button" onClick={() => setAction("payment")} disabled={!receive || receive.status === "Đã hủy"} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#527b49] px-4 text-sm font-bold text-white hover:bg-[#41643a] disabled:opacity-50"><i className="pi pi-wallet" /> Thanh toán</button>
        </div>
      </div>

      {loading ? <div className="rounded-2xl border border-[#e6e9df] bg-white px-5 py-16 text-center text-sm text-[#858a80] dark:border-[#363b31] dark:bg-[#20231f]">Đang tải chi tiết phiếu nhập...</div> : error ? <div role="alert" className="rounded-xl bg-[#fff0ee] p-4 text-sm text-[#aa382f]">{error}</div> : receive ? <>
        <section className="rounded-2xl border border-[#e6e9df] bg-white p-5 dark:border-[#363b31] dark:bg-[#20231f]">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Summary label="Mã phiếu nhập hàng" value={receive.receive_number || `#${receive.id}`} />
            <Summary label="Ngày nhập hàng" value={createdAt ? new Date(createdAt).toLocaleString("vi-VN") : "—"} />
            <Summary label="Trạng thái" value={receive.status || "—"} />
            <Summary label="Tổng giá trị phiếu" value={value(receive.total_cost)} emphasis />
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
          <PartyCard title="Nhà cung cấp" icon="pi-truck" name={supplierName} address={supplierAddress} phone={receive.supplier?.phone} id={receive.supplier?.id} linkLabel="Xem nhà cung cấp" />
          <PartyCard title="Kho nhập" icon="pi-box" name={receive.location?.name || "Kho nhập"} address={locationAddress} phone={receive.location?.phone} id={receive.location?.id} linkLabel="Xem kho" />
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#e6e9df] bg-white dark:border-[#363b31] dark:bg-[#20231f]">
          <nav className="flex gap-1 border-b border-[#eef0ea] px-4 pt-3 dark:border-[#363b31]" aria-label="Chi tiết phiếu nhập">
            {([ ["products", "Sản phẩm"], ["payments", "Lịch sử thanh toán"], ["returns", "Lịch sử trả hàng"] ] as const).map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-t-lg px-4 py-3 text-sm font-semibold ${tab === key ? "border-b-2 border-[#527b49] text-[#527b49]" : "text-[#73796f] hover:bg-[#f8f9f6]"}`}>{label}</button>)}
          </nav>
          {tab === "products" ? <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead className="bg-[#f8f9f6] text-left text-xs font-bold uppercase text-[#66705f] dark:bg-[#191c18] dark:text-[#c5cbbd]"><tr><th className="px-5 py-3">Tên sản phẩm</th><th className="px-4 py-3 text-right">Số lượng nhập</th><th className="px-4 py-3 text-right">Đơn giá</th><th className="px-4 py-3 text-right">Giảm giá</th><th className="px-5 py-3 text-right">Thành tiền</th></tr></thead><tbody className="divide-y divide-[#eef0ea] dark:divide-[#363b31]">{lines.map((line, index) => <tr key={line.id ?? index}><td className="px-5 py-4"><p className="font-semibold">{line.product_name || line.name || line.title || `Sản phẩm #${line.product_id ?? "—"}`}</p><p className="mt-1 text-xs text-[#73796f]">{line.variant_title || ""}</p><p className="mt-1 text-xs text-[#858a80]">SKU: {line.sku || "—"}</p></td><td className="px-4 py-4 text-right tabular-nums">{line.quantity ?? 0}</td><td className="px-4 py-4 text-right tabular-nums">{value(line.original_cost ?? line.cost ?? line.price)}</td><td className="px-4 py-4 text-right tabular-nums">{value(line.discount_amount)}</td><td className="px-5 py-4 text-right font-semibold tabular-nums">{value(line.total_cost ?? (line.quantity ?? 0) * (line.cost ?? line.price ?? 0))}</td></tr>)}{lines.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#858a80]">Haravan không trả chi tiết sản phẩm cho phiếu này.</td></tr>}</tbody></table></div> : tab === "payments" ? <div className="p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Lịch sử thanh toán</h2><p className="mt-1 text-xs text-[#858a80]">Thông tin thanh toán hiện chưa được API Purchase Receive trả về.</p></div><button type="button" onClick={() => setAction("payment")} className="rounded-lg border border-[#e1e5dc] px-3 py-2 text-xs font-bold text-[#527b49]">Thêm thanh toán</button></div><div className="rounded-xl bg-[#f8f9f6] px-4 py-8 text-center text-sm text-[#858a80] dark:bg-[#191c18]">Chưa có dữ liệu lịch sử thanh toán.</div></div> : <div className="p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Lịch sử trả hàng</h2><p className="mt-1 text-xs text-[#858a80]">Các phiếu trả hàng liên quan đến phiếu nhập.</p></div><button type="button" onClick={() => setAction("return")} className="rounded-lg border border-[#e1e5dc] px-3 py-2 text-xs font-bold text-[#a34b42]">Tạo phiếu trả hàng</button></div><div className="rounded-xl bg-[#f8f9f6] px-4 py-8 text-center text-sm text-[#858a80] dark:bg-[#191c18]">Chưa có dữ liệu lịch sử trả hàng.</div></div>}
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-[#e6e9df] bg-white p-5 dark:border-[#363b31] dark:bg-[#20231f]"><h2 className="mb-4 font-bold">Thông tin thêm</h2><div className="grid gap-3 sm:grid-cols-2"><Summary label="Mã phiếu đặt hàng" value={receive.ref_purchase_order_id ? `PO #${receive.ref_purchase_order_id}` : "—"} /><Summary label="Mã tham chiếu" value={receive.ref_number || "—"} /><Summary label="Ghi chú" value={receive.notes || "—"} /><Summary label="Nhãn" value={receive.tags || "—"} /></div></section>
          <section className="rounded-2xl border border-[#e6e9df] bg-white p-5 dark:border-[#363b31] dark:bg-[#20231f]"><h2 className="mb-4 font-bold">Giá trị nhập</h2><div className="space-y-3 text-sm"><SummaryRow label="Tổng số lượng nhập" value={String(receive.total ?? lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0))} /><SummaryRow label="Tổng giá trị nhập hàng" value={value(receive.total_cost)} strong /><SummaryRow label="Đã thanh toán" value="—" /><div className="border-t border-[#eef0ea] pt-3 dark:border-[#363b31]"><SummaryRow label="Còn nợ" value="—" strong /></div><p className="text-xs text-[#858a80]">Haravan chưa trả lịch sử thanh toán của phiếu này qua API.</p></div></section>
        </div>
      </> : <div className="rounded-xl bg-[#f8f9f6] p-6 text-sm">Không tìm thấy phiếu nhập.</div>}

      {action && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setAction(null); }}><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20231f]"><header className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold">{action === "return" ? "Trả hàng nhập" : "Thanh toán nhà cung cấp"}</h2><p className="mt-1 text-xs text-[#858a80]">Phiếu {receive?.receive_number}</p></div><button type="button" onClick={() => setAction(null)} aria-label="Đóng" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-[#f3f5ef]"><i className="pi pi-times" /></button></header><div className="mt-5 rounded-xl bg-[#fff8e8] p-4 text-sm text-[#765c20]">{action === "return" ? "API Haravan trong dự án hiện chỉ hỗ trợ đọc Purchase Return. Chưa thể tạo phiếu trả hàng chính thức từ màn hình này." : "API Purchase Receive hiện chưa cung cấp dữ liệu hoặc thao tác thanh toán. Chưa thể ghi nhận khoản thanh toán từ màn hình này."}</div><footer className="mt-5 flex justify-end"><button type="button" onClick={() => setAction(null)} className="h-10 rounded-lg bg-[#527b49] px-4 text-sm font-bold text-white">Đóng</button></footer></section></div>}
    </div>
  </HaravanShell>;
}

function Summary({ label, value: text, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className="rounded-xl bg-[#f8f9f6] px-4 py-3 dark:bg-[#191c18]"><span className="block text-xs font-semibold text-[#858a80]">{label}</span><span className={`mt-1 block text-sm ${emphasis ? "font-extrabold text-[#a34b42]" : "font-semibold"}`}>{text}</span></div>;
}

function SummaryRow({ label, value: text, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 ${strong ? "font-bold text-[#20231f] dark:text-white" : "text-[#66705f] dark:text-[#c5cbbd]"}`}><span>{label}</span><span className="shrink-0 tabular-nums">{text}</span></div>;
}

function PartyCard({ title, icon, name, address: addressText, phone, id, linkLabel }: { title: string; icon: string; name: string; address: string; phone?: string | null; id?: number; linkLabel: string }) {
  return <section className="rounded-2xl border border-[#e6e9df] bg-white p-5 dark:border-[#363b31] dark:bg-[#20231f]"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f3f5ef] text-[#71836a] dark:bg-[#30392c]"><i className={`pi ${icon}`} /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wide text-[#858a80]">{title}</p><h2 className="mt-1 font-extrabold">{name}</h2><p className="mt-2 text-sm text-[#66705f] dark:text-[#c5cbbd]">{addressText}</p>{phone && <p className="mt-1 text-sm text-[#66705f] dark:text-[#c5cbbd]">{phone}</p>}{id && <span className="mt-3 inline-block text-xs font-semibold text-[#527b49]">{linkLabel} · #{id}</span>}</div></div></section>;
}
