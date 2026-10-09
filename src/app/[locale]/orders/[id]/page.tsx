"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import HaravanShell from "@/components/haravan/HaravanShell";
import { useShop } from "@/context/ShopContext";
import OrderActions, { OrderRefundInput } from "@/components/Orders/OrderActions";
import OrderDetailView from "@/components/Orders/OrderDetailView";
import { OrderPrintInvoice, type InvoiceShopInfo } from "@/components/Orders/OrderPrintInvoice";
import PaymentDialog from "@/components/Orders/PaymentDialog";
import {
  amountDue,
  CancelOrderInput,
  JobAccepted,
  OrderEvent,
  OrderRecord,
  RefundOrderInput,
  Transaction,
  cancelOrder,
  closeOrder,
  createTransaction,
  getOrderDetails,
  haravanStatusOf,
  listTransactions,
  openOrder,
  refundOrder,
} from "@/services/api/orders";
import { watchJob } from "@/services/api/job-watch";

const primaryButton =
  "inline-flex h-10 items-center gap-2 rounded-lg border border-[#e1e5dc] bg-white px-4 text-sm font-bold text-[#525b47] hover:bg-[#f3f5ef] disabled:opacity-50 dark:border-[#40453b] dark:bg-transparent";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const token = session?.access_token;
  const locale = useLocale();
  const currentShop = useShop().currentShop;
  const orgId = Number(currentShop.orgId);
  const haravanOrderId = Number(params.id);

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const orderKey = useMemo(() => ({ orgId, haravanOrderId }), [orgId, haravanOrderId]);

  const reload = useCallback(async () => {
    if (!token) return;

    const details = await getOrderDetails(token, orderKey);
    setOrder(details.order);
    setEvents(details.events ?? []);

    const result = await listTransactions(token, orderKey);
    setTransactions(result.transactions ?? []);
  }, [token, orderKey]);

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

  // Tiêu đề trang khớp với tiêu đề in trên đầu hóa đơn.
  useEffect(() => {
    if (!order) return;
    const code = order.orderName || order.orderNumber || order.name || order.haravanOrderId;
    document.title = `${currentShop.name} - Chi tiết đơn hàng - #${code} – Haravan`;
    return () => {
      document.title = "Haravan";
    };
  }, [order, currentShop.name]);

  /** Chạy một thao tác trên Haravan, báo kết quả rồi tải lại đơn. */
  const run = async (
    label: string,
    fn: (t: string) => Promise<JobAccepted>
  ) => {
    if (!token) return;

    setPending(label);
    try {
      const accepted = await fn(token);
      await watchJob(token, orgId, accepted, {
        pendingMessage: `${label}: đang chờ Haravan xử lý…`,
        onSettled: () => {
          void reload();
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi không xác định.");
    } finally {
      setPending(null);
    }
  };

  /** Ghi tiền thanh toán: tạo giao dịch `sale` trên Haravan, không phải xác nhận đơn. */
  const submitPayment = async (input: {
    amount: number;
    kind: string;
    gateway?: string;
    note?: string;
  }) => {
    if (!token) return;

    setPending("Thanh toán");
    try {
      const accepted = await createTransaction(token, orderKey, input);
      setPaymentOpen(false);
      await watchJob(token, orgId, accepted, {
        pendingMessage: "Đã gửi giao dịch thanh toán; đang chờ Haravan ghi nhận…",
        onSettled: () => {
          void reload();
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không ghi nhận được giao dịch thanh toán.");
    } finally {
      setPending(null);
    }
  };

  const actor = session?.user?.phone ?? "";
  const lifecycle = order ? haravanStatusOf(order) : null;
  /** Đơn đã thu đủ tiền thì không hiện nút Thanh toán nữa. */
  const canPay = order ? amountDue(order) > 0 : true;
  const orderName =
    order?.orderName || order?.orderNumber || order?.name || "Đơn #";

  const shopInfo: InvoiceShopInfo = {
    name: currentShop.name,
    address: process.env.NEXT_PUBLIC_SHOP_ADDRESS,
    phone: process.env.NEXT_PUBLIC_SHOP_PHONE,
    website: process.env.NEXT_PUBLIC_SHOP_WEBSITE,
    email: process.env.NEXT_PUBLIC_SHOP_EMAIL,
  };

  return (
    <>
      {order && (
        <div className="hidden print:block">
          <OrderPrintInvoice order={order} locale={locale} shop={shopInfo} />
        </div>
      )}

      <div className="print:hidden">
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
                {canPay && (
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={() => setPaymentOpen(true)}
                    className={primaryButton}
                  >
                    <i className="pi pi-credit-card" aria-hidden="true" />
                    Thanh toán
                  </button>
                )}

                <button
                  type="button"
                  disabled={pending !== null}
                  title="Haravan chưa hỗ trợ API giao hàng. Bạn có thể xử lý giao hàng trực tiếp trên Haravan."
                  aria-disabled="true"
                  className={`${primaryButton} cursor-not-allowed opacity-60`}
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

        {paymentOpen && order && (
          <PaymentDialog
            order={order}
            locale={locale}
            busy={pending !== null}
            onClose={() => setPaymentOpen(false)}
            onSubmit={submitPayment}
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
      </div>
    </>
  );
}
