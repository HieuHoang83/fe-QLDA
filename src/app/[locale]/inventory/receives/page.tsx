"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import HaravanShell from "@/components/haravan/HaravanShell";
import { useShop } from "@/context/ShopContext";
import { formatMoney } from "@/lib/haravan-format";
import { listPurchaseReceives, type HaravanPurchaseReceive } from "@/services/api/purchase-receives";

const PAGE_SIZE = 20;

export default function InventoryReceivesListPage() {
  const locale = useLocale();
  const { data: session } = useSession();
  const { currentShop } = useShop();
  const token = session?.access_token;
  const [items, setItems] = useState<HaravanPurchaseReceive[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    listPurchaseReceives(token, currentShop.orgId, { page, limit: PAGE_SIZE })
      .then((result) => { if (!cancelled) setItems(result.purchase_receives ?? []); })
      .catch((requestError) => {
        if (!cancelled) {
          setItems([]);
          setError(requestError instanceof Error ? requestError.message : "Không tải được danh sách phiếu nhập.");
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, currentShop.orgId, page]);

  return <HaravanShell title="Nhập hàng">
    <div className="mx-auto w-full max-w-[1450px] space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">Danh sách nhập hàng</h1><p className="mt-1 text-sm text-[#73796f] dark:text-[#b3b9ad]">Phiếu nhập hàng từ Purchase Receives của Haravan.</p></div>
        <Link href={`/${locale}/inventory/receives/new`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#527b49] px-4 text-sm font-bold text-white hover:bg-[#41643a]"><i className="pi pi-plus" aria-hidden="true" /> Tạo phiếu nhập</Link>
      </header>

      <section className="overflow-hidden rounded-2xl border border-[#e6e9df] bg-white dark:border-[#363b31] dark:bg-[#20231f]">
        {loading ? <p className="px-5 py-16 text-center text-sm text-[#858a80]">Đang tải danh sách phiếu nhập...</p> : error ? <p role="alert" className="px-5 py-10 text-center text-sm text-[#aa382f]">{error}</p> : items.length === 0 ? <div className="px-5 py-16 text-center"><i className="pi pi-inbox text-2xl text-[#a1a89a]" /><p className="mt-2 text-sm font-semibold">Chưa có phiếu nhập hàng</p><p className="mt-1 text-xs text-[#858a80]">Haravan chưa trả về phiếu Purchase Receive ở trang này.</p></div> : <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-[#f8f9f6] text-left text-xs font-bold uppercase text-[#66705f] dark:bg-[#191c18] dark:text-[#c5cbbd]"><tr><th className="px-4 py-3">Mã phiếu</th><th className="px-4 py-3">Ngày nhập</th><th className="px-4 py-3">Nhà cung cấp</th><th className="px-4 py-3">Kho nhập</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Số lượng</th><th className="px-4 py-3 text-right">Tổng giá trị</th><th /></tr></thead>
            <tbody className="divide-y divide-[#eef0ea] dark:divide-[#363b31]">{items.map((item) => <tr key={item.id}>
              <td className="px-4 py-3 font-semibold">{item.receive_number || `#${item.id}`}</td>
              <td className="px-4 py-3">{item.received_at ? new Date(item.received_at).toLocaleDateString("vi-VN") : item.created_at ? new Date(item.created_at).toLocaleDateString("vi-VN") : "—"}</td>
              <td className="px-4 py-3">{item.supplier?.supplier_name || item.supplier?.name || "—"}</td>
              <td className="px-4 py-3">{item.location?.name || "—"}</td>
              <td className="px-4 py-3">{item.status || "—"}</td>
              <td className="px-4 py-3 text-right tabular-nums">{item.total ?? 0}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatMoney(item.total_cost)}</td>
              <td className="px-4 py-3"><Link href={`/${locale}/inventory/receives/${item.id}`} className="rounded-lg px-3 py-2 text-xs font-bold text-[#527b49] hover:bg-[#f3f5ef]">Chi tiết</Link></td>
            </tr>)}</tbody>
          </table>
        </div>}
        <div className="flex items-center justify-between border-t border-[#eef0ea] px-5 py-3 text-xs dark:border-[#363b31]"><span className="text-[#858a80]">Trang {page}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-[#e1e5dc] px-3 py-2 disabled:opacity-40 dark:border-[#40453b]">Trước</button><button type="button" disabled={items.length < PAGE_SIZE || loading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-[#e1e5dc] px-3 py-2 disabled:opacity-40 dark:border-[#40453b]">Sau</button></div></div>
      </section>
    </div>
  </HaravanShell>;
}
