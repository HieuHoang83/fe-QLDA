"use client";

import { useState } from "react";
import {
  CancelOrderInput,
  haravanStatusOf,
  OrderRecord,
  refundableAmount,
} from "@/services/api/orders";
import { money, paymentStatusText } from "./orders.utils";

export interface OrderRefundInput {
  amount: number;
  note?: string;
}

interface OrderActionsProps {
  order: OrderRecord;
  locale: string;
  pending: string | null;
  onCancel: (input: CancelOrderInput) => Promise<void>;
  onRefund: (input: OrderRefundInput) => Promise<void>;
  onCloseOrder: () => Promise<void>;
  onOpenOrder: () => Promise<void>;
}

type Panel = "cancel" | "refund" | null;

const inputClass =
  "h-10 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-3 text-sm outline-none transition focus:border-[#7c9f70] focus:ring-2 focus:ring-[#7c9f70]/20 dark:border-[#40453b] dark:bg-[#191c18]";
const ghostButton =
  "h-10 rounded-xl border border-[#e1e5dc] px-4 text-sm font-semibold transition hover:bg-[#f1f3ee] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#40453b] dark:hover:bg-[#2b2f28]";
const dangerButton =
  "h-10 rounded-xl bg-[#aa382f] px-4 text-sm font-bold text-white transition hover:bg-[#8f2d26] disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton =
  "h-10 rounded-xl bg-[#527b49] px-4 text-sm font-bold text-white transition hover:bg-[#41643a] disabled:cursor-not-allowed disabled:opacity-50";

export default function OrderActions({
  order,
  locale,
  pending,
  onCancel,
  onRefund,
  onCloseOrder,
  onOpenOrder,
}: OrderActionsProps) {
  const [panel, setPanel] = useState<Panel>(null);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [refund, setRefund] = useState(true);
  const [restock, setRestock] = useState(true);

  const lifecycle = haravanStatusOf(order);
  const { paid, refunded, remaining } = refundableAmount(order);
  const canRefund =
    ["paid", "partially_paid", "partially_refunded"].includes(
      (order.financialStatus ?? "").toLowerCase()
    ) && remaining > 0;
  const isCod = /cod/i.test(order.gateway ?? "");

  function openCancel() {
    setPanel("cancel");
    setReason("");
    setAmount(remaining > 0 ? String(remaining) : "");
    setRefund(remaining > 0);
    setRestock(true);
  }

  async function submitCancel() {
    const parsed = amount.trim() === "" ? undefined : Number(amount);
    await onCancel({
      reason: reason.trim() || undefined,
      refund,
      restock,
      amount: refund && parsed !== undefined ? parsed : undefined,
    });
    setPanel(null);
  }

  async function submitRefund() {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    await onRefund({ amount: Math.min(parsed, remaining) });
    setPanel(null);
  }

  return (
    <div className="mt-6 border-t border-[#eef0ea] pt-5 dark:border-[#363b31]">
      <div className="flex flex-wrap items-center gap-2">
        {lifecycle === "open" && (
          <>
            <button
              type="button"
              className={dangerButton}
              disabled={pending !== null}
              onClick={() => (panel === "cancel" ? setPanel(null) : openCancel())}
            >
              <i className="pi pi-times mr-1.5" aria-hidden="true" /> Hủy đơn
            </button>
            <button
              type="button"
              className={ghostButton}
              disabled={pending !== null}
              onClick={() => (panel === "refund" ? setPanel(null) : setPanel("refund"))}
            >
              <i className="pi pi-undo mr-1.5" aria-hidden="true" /> Hoàn tiền
            </button>
            <button
              type="button"
              className={ghostButton}
              disabled={pending !== null}
              onClick={onCloseOrder}
            >
              <i className="pi pi-lock mr-1.5" aria-hidden="true" /> Đóng đơn
            </button>
          </>
        )}

        {lifecycle === "closed" && (
          <button
            type="button"
            className={ghostButton}
            disabled={pending !== null}
            onClick={onOpenOrder}
          >
            <i className="pi pi-lock-open mr-1.5" aria-hidden="true" /> Mở lại đơn
          </button>
        )}

        {lifecycle === "cancelled" && (
          <p className="text-sm text-[#858a80]">Đơn hàng này đã được hủy.</p>
        )}

        {pending && (
          <span className="text-sm text-[#858a80]">
            <i className="pi pi-spin pi-spinner mr-1.5" aria-hidden="true" /> Đang xử lý...
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#73796f] dark:text-[#b3b9ad]">
        <span>Đã thu: <strong>{money(paid, order.currency, locale)}</strong></span>
        <span>Đã hoàn: <strong>{money(refunded, order.currency, locale)}</strong></span>
        <span>Còn hoàn được: <strong>{money(remaining, order.currency, locale)}</strong></span>
        <span>Trạng thái: {paymentStatusText(order.financialStatus)}</span>
      </div>

      {panel === "cancel" && (
        <div className="mt-4 rounded-xl border border-[#eef0ea] bg-[#fafbf9] p-4 dark:border-[#363b31] dark:bg-[#191c18]">
          <p className="text-sm font-semibold">Hủy đơn #{order.haravanOrderId}</p>
          <p className="mt-1 text-xs text-[#858a80]">
            Haravan không thể hoàn tác thao tác này. Hãy kiểm tra kỹ trước khi tiếp tục.
          </p>

          <label className="mt-3 block">
            <span className="mb-1.5 block text-xs font-semibold">Lý do hủy</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              placeholder="Ví dụ: khách đổi ý, hết hàng..."
              className="w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-3 py-2 text-sm outline-none transition focus:border-[#7c9f70] focus:ring-2 focus:ring-[#7c9f70]/20 dark:border-[#40453b] dark:bg-[#20231f]"
            />
          </label>

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={refund}
              disabled={remaining <= 0}
              onChange={(event) => setRefund(event.target.checked)}
            />
            Hoàn tiền kèm theo
          </label>

          {refund && (
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs font-semibold">
                Số tiền hoàn (tối đa {money(remaining, order.currency, locale)})
              </span>
              <input
                type="number"
                min={0}
                max={remaining}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={inputClass}
              />
              {isCod && (
                <p className="mt-1.5 text-xs font-medium text-[#a55b00]">
                  Đơn COD: Haravan chỉ ghi nhận hoàn tiền, khách chưa thực sự nhận lại tiền.
                </p>
              )}
            </label>
          )}

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={restock}
              onChange={(event) => setRestock(event.target.checked)}
            />
            Hoàn lại tồn kho
          </label>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className={dangerButton}
              disabled={pending !== null}
              onClick={submitCancel}
            >
              Xác nhận hủy
            </button>
            <button type="button" className={ghostButton} onClick={() => setPanel(null)}>
              Đóng
            </button>
          </div>
        </div>
      )}

      {panel === "refund" && (
        <div className="mt-4 rounded-xl border border-[#eef0ea] bg-[#fafbf9] p-4 dark:border-[#363b31] dark:bg-[#191c18]">
          <p className="text-sm font-semibold">Hoàn tiền</p>
          {!canRefund ? (
            <p className="mt-2 text-sm text-[#aa382f]">
              Chỉ hoàn tiền được cho đơn đã thu tiền. Đơn hiện có trạng thái{" "}
              {paymentStatusText(order.financialStatus)}.
            </p>
          ) : (
            <>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-xs font-semibold">
                  Số tiền hoàn (tối đa {money(remaining, order.currency, locale)})
                </span>
                <input
                  type="number"
                  min={1}
                  max={remaining}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className={inputClass}
                />
              </label>
              {isCod && (
                <p className="mt-2 text-xs font-medium text-[#a55b00]">
                  Đơn COD: thao tác này chỉ ghi nhận trên hệ thống, không chuyển tiền thật.
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className={primaryButton}
                  disabled={pending !== null}
                  onClick={submitRefund}
                >
                  Xác nhận hoàn tiền
                </button>
                <button type="button" className={ghostButton} onClick={() => setPanel(null)}>
                  Đóng
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
