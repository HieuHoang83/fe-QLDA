"use client";

import { useEffect, useMemo, useState } from "react";

import { amountDue, OrderRecord } from "@/services/api/orders";
import { money, orderCode } from "./orders.utils";

interface PaymentMethod {
  id: string;
  label: string;
  gateway: string;
}

/** COD luôn hiện; các cái khác chỉ mở khi bấm "Thêm phương thức thanh toán". */
const BASE_METHODS: PaymentMethod[] = [
  { id: "cod", label: "Thanh toán khi giao hàng (COD)", gateway: "Thanh toán khi giao hàng (COD)" },
];

const EXTRA_METHODS: PaymentMethod[] = [
  { id: "cash", label: "Tiền mặt", gateway: "Tiền mặt" },
  { id: "bank_transfer", label: "Chuyển khoản ngân hàng", gateway: "Chuyển khoản ngân hàng" },
  { id: "card", label: "Thẻ tín dụng", gateway: "Thẻ tín dụng" },
];

interface PaymentDialogProps {
  order: OrderRecord;
  locale: string;
  busy?: boolean;
  onClose: () => void;
 onSubmit: (input: { amount: number; kind: string; gateway?: string; note?: string }) => Promise<void>;
}

/**
 * Bảng ghi tiền thanh toán cho một đơn.
 *
   * Đơn COD không mở giao dịch tiền thật, chỉ đánh dấu đã thu tiền khi giao hàng;
   * các phương thức còn lại tạo giao dịch `Capture` trên Haravan.
 */
export default function PaymentDialog({ order, locale, busy, onClose, onSubmit }: PaymentDialogProps) {
  const due = amountDue(order);
  const settled = Math.max(0, (order.totalPrice ?? 0) - due);

  const [methodId, setMethodId] = useState(BASE_METHODS[0].id);
  const [showExtra, setShowExtra] = useState(false);
  const [amount, setAmount] = useState(String(due));

  const methods = useMemo(
    () => (showExtra ? [...BASE_METHODS, ...EXTRA_METHODS] : BASE_METHODS),
    [showExtra]
  );
  const selected = methods.find((item) => item.id === methodId) ?? BASE_METHODS[0];
  const isCod = selected.id === "cod";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(amount.replace(/\D/g, "")) || 0;
    if (value <= 0) return;
    await onSubmit({
      amount: value,
      // Haravan chỉ nhận `Capture` cho giao dịch thu tiền.
      kind: "capture",
      gateway: selected.gateway,
      note: isCod ? "Thu tiền khi giao hàng" : undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-black/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-dialog-title"
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#20231f]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#e6e9ef] px-5 py-4 dark:border-[#363b31]">
          <div className="min-w-0">
            <h2 id="payment-dialog-title" className="text-lg font-bold">
              Thanh toán đơn hàng
            </h2>
            <p className="mt-0.5 truncate text-xs text-[#858a80]">{orderCode(order)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#8993a3] hover:bg-[#f3f5f8] disabled:opacity-50"
          >
            <i className="pi pi-times" />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-5 py-4">
            <div className="rounded-xl bg-[#f8f9f6] px-4 py-3 dark:bg-[#191c18]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#66705f] dark:text-[#c5cbbd]">
                Tổng tiền cần thanh toán
              </p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">
                {money(due, order.currency, locale)}
              </p>
              {settled > 0 && (
                <p className="mt-1 text-xs text-[#858a80]">
                  Đã thanh toán {money(settled, order.currency, locale)}
                </p>
              )}
            </div>

            <ul className="space-y-2">
              {methods.map((method) => {
                const active = method.id === selected.id;
                return (
                  <li key={method.id}>
                    <label
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                        active
                          ? "border-[#527b49] bg-[#f3f7f1] dark:border-[#527b49] dark:bg-[#232b20]"
                          : "border-[#e6e9ef] hover:bg-[#f8f9fb] dark:border-[#363b31] dark:hover:bg-[#191c18]"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <input
                          type="radio"
                          name="payment-method"
                          className="h-4 w-4 accent-[#527b49]"
                          checked={active}
                          onChange={() => setMethodId(method.id)}
                        />
                        <span className="truncate font-semibold">{method.label}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-[#5b6577]">
                        {money(due, order.currency, locale)}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            {!showExtra && (
              <button
                type="button"
                onClick={() => setShowExtra(true)}
                className="text-sm font-semibold text-[#356bd6] hover:underline"
              >
                + Thêm phương thức thanh toán
              </button>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Tiền thanh toán</span>
              <input
                inputMode="numeric"
                value={Number(amount.replace(/\D/g, "")) ? Number(amount.replace(/\D/g, "")) : 0}
                onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
                className="h-11 w-full rounded-xl border border-[#dfe3ea] px-3 text-sm tabular-nums outline-none focus:border-[#5687e8] focus:ring-2 focus:ring-[#5687e8]/15 dark:border-[#40453b] dark:bg-[#191c18]"
              />
              <span className="mt-1 block text-xs text-[#858a80]">
                Tối đa {money(due, order.currency, locale)}
              </span>
            </label>

            {isCod && (
              <p className="rounded-xl bg-[#fff8e6] px-3 py-2 text-xs leading-5 text-[#8a6a12] dark:bg-[#2a2413]">
                Đơn COD: thao tác này chỉ ghi nhận trên Haravan, không chuyển tiền thật.
              </p>
            )}
          </div>

          <footer className="flex justify-end gap-2 border-t border-[#e6e9ef] px-5 py-4 dark:border-[#363b31]">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="h-10 rounded-lg border border-[#dfe3ea] px-4 text-sm font-semibold disabled:opacity-50 dark:border-[#40453b]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#527b49] px-4 text-sm font-bold text-white hover:bg-[#41643a] disabled:opacity-50"
            >
              {busy && <i className="pi pi-spin pi-spinner" />}
              {busy ? "Đang gửi…" : "Thanh toán"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
