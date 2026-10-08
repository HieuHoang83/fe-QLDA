"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import HaravanShell from "@/components/haravan/HaravanShell";
import { useShop } from "@/context/ShopContext";
import OrderDetailView from "@/components/Orders/OrderDetailView";

import {
  cancelOrder,
  closeOrder,
  confirmOrder,
  createTransaction,
  getOrderDetails,
  listTransactions,
  openOrder,
  OrderEvent,
  OrderRecord,
  refundOrder,
  Transaction,
} from "@/services/api/orders";

type Lifecycle = "open" | "closed" | "cancelled";

function lifecycleOf(order: OrderRecord): Lifecycle {
  const s = (order.haravanStatus ?? order.payload?.status ?? "").toLowerCase();

  if (s === "closed") return "closed";
  if (s === "cancelled") return "cancelled";

  return "open";
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const token = session?.access_token;
  const locale = useLocale();
  const orgId = Number(useShop().currentShop.orgId);
  const id = Number(params.id);

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [actionOpen, setActionOpen] = useState(false);

  useEffect(() => {
    if (!token || !Number.isSafeInteger(id) || id <= 0) return;

    let cancelled = false;

    setLoading(true);
    setError("");

    getOrderDetails(token, {
      orgId,
      haravanOrderId: id,
    })
      .then((r) => {
        if (!cancelled) {
          setOrder(r.order);
          setEvents(r.events ?? []);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Không tải được chi tiết đơn.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    listTransactions(token, {
      orgId,
      haravanOrderId: id,
    })
      .then((r) => {
        if (!cancelled) {
          setTransactions(r.transactions ?? []);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [token, orgId, id]);

  const reload = useCallback(async () => {
    if (!token) return;

    const r = await getOrderDetails(token, {
      orgId,
      haravanOrderId: id,
    });

    setOrder(r.order);
    setEvents(r.events ?? []);

    const t = await listTransactions(token, {
      orgId,
      haravanOrderId: id,
    });

    setTransactions(t.transactions ?? []);
  }, [token, orgId, id]);

  const run = async (label: string, fn: (t: string) => Promise<unknown>) => {
    if (!token) return;

    setPending(label);
    setActionOpen(false);

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
  const phase = order ? lifecycleOf(order) : null;

  const orderName =
    order?.orderName || order?.orderNumber || order?.name || "Đơn #";

  return (
    <HaravanShell>
      <div className="mx-auto w-full max-w-[1350px] space-y-5 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold">{orderName}</h1>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e1e5dc] bg-white px-4 text-sm font-bold text-[#527b49] hover:bg-[#f3f5ef] dark:border-[#40453b] dark:bg-transparent"
            >
              <i className="pi pi-print" aria-hidden="true" />
              In đơn
            </button>

            <div className="relative">
              <button
                type="button"
                disabled={!order || pending !== null}
                onClick={() => setActionOpen((v) => !v)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e1e5dc] bg-white px-4 text-sm font-bold text-[#525b47] hover:bg-[#f3f5ef] disabled:opacity-50 dark:border-[#40453b] dark:bg-transparent"
              >
                <i className="pi pi-cog" aria-hidden="true" />
                Thao tác
                <i className="pi pi-chevron-down text-xs" aria-hidden="true" />
              </button>

              {actionOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-[#e1e5dc] bg-white shadow-lg dark:border-[#363b31] dark:bg-[#20231f]">
                  {phase === "open" && (
                    <>
                      <button
                        type="button"
                        disabled={pending !== null}
                        onClick={() =>
                          run("Thanh toán", (t) =>
                            confirmOrder(
                              t,
                              {
                                orgId,
                                haravanOrderId: id,
                              },
                              actor,
                            ),
                          )
                        }
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#525b47] hover:bg-[#f1f3ee]"
                      >
                        <i
                          className="pi pi-credit-card w-5 text-center"
                          aria-hidden="true"
                        />
                        Thanh toán
                      </button>

                      <button
                        type="button"
                        disabled={pending !== null}
                        onClick={() =>
                          run("Giao hàng", async (t) => {
                            await createTransaction(
                              t,
                              {
                                orgId,
                                haravanOrderId: id,
                              },
                              {
                                amount: 0,
                                kind: "sale",
                              },
                            );
                          })
                        }
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#525b47] hover:bg-[#f1f3ee]"
                      >
                        <i
                          className="pi pi-truck w-5 text-center"
                          aria-hidden="true"
                        />
                        Giao hàng
                      </button>

                      <button
                        type="button"
                        disabled={pending !== null}
                        onClick={() =>
                          run("Hủy đơn", (t) =>
                            cancelOrder(
                              t,
                              {
                                orgId,
                                haravanOrderId: id,
                              },
                              { actor },
                            ),
                          )
                        }
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#aa382f] hover:bg-[#fff5f3]"
                      >
                        <i
                          className="pi pi-times w-5 text-center"
                          aria-hidden="true"
                        />
                        Hủy đơn
                      </button>

                      <button
                        type="button"
                        disabled={pending !== null}
                        onClick={() =>
                          run("Hoàn tiền", (t) =>
                            refundOrder(
                              t,
                              {
                                orgId,
                                haravanOrderId: id,
                              },
                              {
                                amount: 0,
                                actor,
                              },
                            ),
                          )
                        }
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-[#f1f3ee]"
                      >
                        <i
                          className="pi pi-undo w-5 text-center"
                          aria-hidden="true"
                        />
                        Hoàn tiền
                      </button>

                      <button
                        type="button"
                        disabled={pending !== null}
                        onClick={() =>
                          run("Đóng đơn", (t) =>
                            closeOrder(
                              t,
                              {
                                orgId,
                                haravanOrderId: id,
                              },
                              actor,
                            ),
                          )
                        }
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-[#f1f3ee]"
                      >
                        <i
                          className="pi pi-lock w-5 text-center"
                          aria-hidden="true"
                        />
                        Đóng đơn
                      </button>
                    </>
                  )}

                  {phase === "closed" && (
                    <button
                      type="button"
                      disabled={pending !== null}
                      onClick={() =>
                        run("Mở đơn", (t) =>
                          openOrder(
                            t,
                            {
                              orgId,
                              haravanOrderId: id,
                            },
                            actor,
                          ),
                        )
                      }
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-[#f1f3ee]"
                    >
                      <i
                        className="pi pi-lock-open w-5 text-center"
                        aria-hidden="true"
                      />
                      Mở lại đơn
                    </button>
                  )}

                  {phase === "cancelled" && (
                    <p className="px-4 py-3 text-sm text-[#858a80]">
                      Đơn đã được hủy.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-xl bg-[#fff0ee] p-4 text-sm text-[#aa382f]"
          >
            {error}
          </div>
        ) : order ? (
          <OrderDetailView
            order={order}
            events={events}
            locale={locale}
            loading={loading}
            actionPending={pending}
            transactions={transactions}
          />
        ) : (
          <OrderDetailView
            order={{} as OrderRecord}
            events={[]}
            locale={locale}
            loading={loading}
            transactions={transactions}
          />
        )}
      </div>
    </HaravanShell>
  );
}
