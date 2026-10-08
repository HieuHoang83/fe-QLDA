"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import HaravanShell from "@/components/haravan/HaravanShell";
import { useShop } from "@/context/ShopContext";
import { formatMoney } from "@/lib/haravan-format";
import { getPurchaseOrder } from "@/services/api/inventory-documents";
import PurchaseOrderDetail from "@/components/Inventory/PurchaseOrderDetail";

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const locale = useLocale();
  const id = Number(params.id);
  const { data: session } = useSession();
  const { currentShop } = useShop();
  const token = session?.access_token;
  const [order, setOrder] = useState<Awaited<ReturnType<typeof getPurchaseOrder>>["purchase_order"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !Number.isSafeInteger(id) || id <= 0) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    getPurchaseOrder(token, currentShop.orgId, id)
      .then((result) => { if (!cancelled) setOrder(result.purchase_order ?? null); })
      .catch((requestError) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Không tải được đơn đặt hàng."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, currentShop.orgId, id]);

  return <HaravanShell title="Chi tiết đơn đặt hàng">
    <div className="mx-auto w-full max-w-[1350px] space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/${locale}/inventory/purchasing-orders`} className="inline-flex items-center gap-2 text-sm font-semibold text-[#527b49] hover:text-[#41643a]"><i className="pi pi-arrow-left" /> Danh sách đặt hàng nhập</Link>
          <h1 className="mt-2 text-2xl font-extrabold">{order?.purchase_number || order?.ref_number || `Đơn #${id}`}</h1>
          <p className="mt-1 text-sm text-[#73796f] dark:text-[#b3b9ad]">Chi tiết sản phẩm đã nhập và chờ nhập của đơn đặt hàng.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e1e5dc] bg-white px-4 text-sm font-bold text-[#527b49] hover:bg-[#f3f5ef] dark:border-[#40453b] dark:bg-transparent"><i className="pi pi-print" /> In đơn</button>
        </div>
      </div>

      {loading
        ? <div className="rounded-2xl border border-[#e6e9df] bg-white px-5 py-16 text-center text-sm text-[#858a80] dark:border-[#363b31] dark:bg-[#20231f]">Đang tải chi tiết đơn đặt hàng...</div>
        : error
          ? <div role="alert" className="rounded-xl bg-[#fff0ee] p-4 text-sm text-[#aa382f]">{error}</div>
          : order
            ? <PurchaseOrderDetail document={order} locale={locale} />
            : <div className="rounded-xl bg-[#f8f9f6] p-6 text-sm dark:bg-[#191c18]">Không tìm thấy đơn đặt hàng.</div>}
    </div>
  </HaravanShell>;
}
