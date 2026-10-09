"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import HaravanShell from "@/components/haravan/HaravanShell";
import { useShop } from "@/context/ShopContext";
import OrderActions, { OrderRefundInput } from "@/components/Orders/OrderActions";
import OrderDetailView from "@/components/Orders/OrderDetailView";
import {
  CancelOrderInput,
  OrderEvent,
  OrderRecord,
  RefundOrderInput,
  Transaction,
  cancelOrder,
  closeOrder,
  confirmOrder,
  createTransaction,
  getOrderDetails,
  haravanStatusOf,
  listTransactions,
  openOrder,
  refundOrder,
} from "@/services/api/orders";

const primaryButton =
  "inline-flex h-10 items-center gap-2 rounded-lg border border-[#e1e5dc] bg-white px-4 text-sm font-bold text-[#525b47] hover:bg-[#f3f5ef] disabled:opacity-50 dark:border-[#40453b] dark:bg-transparent";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const token = session?.access_token;
  const locale = useLocale();
  const orgId = Number(useShop().currentShop.orgId);
  const haravanOrderId = Number(params.id);

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const orderKey = { orgId, haravanOrderId };

  const reload = useCallback(async () => {
    if (!token) return;

    const details = await getOrderDetails(token, orderKey);
    setOrder(details.order);
    setEvents(details.events ?? []);

    const result = await listTransactions(token, orderKey);
    setTransactions(result.transactions ?? []);
  }, [token, orgId, haravanOrderId]);

  useEffect(() => {
    if (!token || !Number.isSafeInteger(haravanOrderId) || haravanOrderId <= 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    reload()
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Không tải được chi tiết đơn.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reload, token, haravanOrderId]);

  /** Chạy một thao tác trên Haravan, báo kết quả rồi tải lại đơn. */
  const run = async (label: string, fn: (t: string) => Promise<unknown>) => {
    if (!token) return;

    setPending(label);
    try {
      await fn(token);
      toast.success(`${label} thành công.`);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi không xác định.");
    } finally {
      setPending(null);
    }
  };

  const actor = session?.user?.phone ?? "";
  const lifecycle = order ? haravanStatusOf(order) : null;
  const orderName =
    order?.orderName || order?.orderNumber || order?.name || "Đơn #";

  return (
    <HaravanShell>
      <div className="mx-auto w-full max-w-[1350px] space-y-5 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold">{orderName}</h1>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => window.print()} className={primaryButton}>
              <i className="pi pi-print" aria-hidden="true" />
              In đơn
            </button>

            {lifecycle === "open" && (
              <>
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() =>
                    run("Thanh toán", (t) => confirmOrder(t, orderKey, actor))
                  }
                  className={primaryButton}
                >
                  <i className="pi pi-credit-card" aria-hidden="true" />
                  Thanh toán
                </button>

                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() =>
                    run("Giao hàng", (t) =>
                      createTransaction(t, orderKey, { amount: 0, kind: "sale" }),
                    )
                  }
                  className={primaryButton}
                >
                  <i className="pi pi-truck" aria-hidden="true" />
                  Giao hàng
                </button>
              </>
            )}
          </div>
        </div>

        {error ? (
          <div role="alert" className="rounded-xl bg-[#fff0ee] p-4 text-sm text-[#aa382f]">
            {error}
          </div>
        ) : (
          <OrderDetailView
            order={order ?? ({ haravanOrderId } as OrderRecord)}
            events={events}
            locale={locale}
            loading={loading}
            transactions={transactions}
          />
        )}

        {order && (
          <OrderActions
            order={order}
            locale={locale}
            pending={pending}
            onCancel={async (input: CancelOrderInput) => {
              await run("Hủy đơn", (t) => cancelOrder(t, orderKey, { ...input, actor }));
            }}
            onRefund={async ({ amount }: OrderRefundInput) => {
              const input: RefundOrderInput = { amount, actor };
              await run("Hoàn tiền", (t) => refundOrder(t, orderKey, input));
            }}
            onCloseOrder={async () => {
              await run("Đóng đơn", (t) => closeOrder(t, orderKey, actor));
            }}
            onOpenOrder={async () => {
              await run("Mở đơn", (t) => openOrder(t, orderKey, actor));
            }}
          />
        )}
      </div>
    </HaravanShell>
  );
}
