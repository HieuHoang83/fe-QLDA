"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { HaravanCustomer } from "@/services/api/customers";
import {
  AddressGeoFields,
  emptyGeoAddress,
  hasAddressContent,
  type GeoAddressValue,
} from "@/components/Customers/AddressGeoFields";
import { customerName, emptyForm, type CustomerFormState } from "./customers.utils";

export function CustomerEditDialog({
  token,
  orgId,
  customer,
  saving,
  onClose,
  onSave,
}: {
  token: string | undefined;
  orgId: string;
  customer: HaravanCustomer | null;
  saving: boolean;
  onClose: () => void;
  onSave: (form: CustomerFormState, address: GeoAddressValue) => void;
}) {
  const isCreate = !customer;
  const [form, setForm] = useState<CustomerFormState>(() =>
    emptyForm(customer ?? undefined)
  );
  const [address, setAddress] = useState<GeoAddressValue>(emptyGeoAddress);
  const [formError, setFormError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreate && !form.phone.trim()) {
      setFormError("Nhập số điện thoại để tạo khách hàng.");
      return;
    }
    if (
      isCreate &&
      hasAddressContent(address) &&
      !address.ward.trim()
    ) {
      setFormError(
        "Chưa chọn Phường / Xã cho địa chỉ khách hàng. Chọn phường/xã hoặc bỏ trống địa chỉ."
      );
      return;
    }
    setFormError("");
    onSave(form, address);
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-edit-title"
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#20231f]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#eef0ea] px-6 py-4 dark:border-[#363b31]">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#71836a]">
              {isCreate ? "Tạo khách hàng mới" : "Cập nhật khách hàng"}
            </p>
            <h2 id="customer-edit-title" className="mt-1 truncate text-xl font-extrabold">
              {isCreate ? "Khách hàng mới" : customerName(customer as HaravanCustomer)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-[#f1f3ee] dark:hover:bg-[#30342e]"
          >
            <i className="pi pi-times" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {formError && (
            <p
              role="alert"
              className="rounded-xl border border-[#f0d3c4] bg-[#fdf6f1] px-4 py-3 text-sm text-[#a34a1c] dark:border-[#5a3a2a] dark:bg-[#2a211a] dark:text-[#e0a184]"
            >
              {formError}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Họ</span>
              <input
                type="text"
                value={form.last_name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, last_name: event.target.value }))
                }
                className="h-11 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Tên</span>
              <input
                type="text"
                value={form.first_name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, first_name: event.target.value }))
                }
                className="h-11 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Email</span>
              <input
                type="email"
                value={form.email}
                placeholder="Không bắt buộc"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
                className="h-11 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">
                Số điện thoại
                {isCreate && <span className="text-[#c05621]"> *</span>}
              </span>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, phone: event.target.value }))
                }
                className="h-11 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]"
              />
            </label>
            <p className="text-xs text-[#858a80] sm:col-span-2">
              Tạo mới cần số điện thoại; email và địa chỉ không bắt buộc.
            </p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Tags</span>
            <input
              type="text"
              value={form.tags}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, tags: event.target.value }))
              }
              placeholder="Cách nhau bởi dấu phẩy"
              className="h-11 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Ghi chú</span>
            <textarea
              rows={3}
              value={form.note}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, note: event.target.value }))
              }
              className="w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 py-3 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]"
            />
          </label>

          {isCreate && token && (
            <section className="space-y-4 rounded-xl border border-[#e5e7df] bg-[#fbfcf9] p-4 dark:border-[#40453b] dark:bg-[#191c18]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-extrabold">
                  Địa chỉ khách hàng
                </h3>
                <span className="text-xs text-[#858a80]">
                  Không bắt buộc — tạo cùng lúc với khách
                </span>
              </div>
              <AddressGeoFields
                token={token}
                orgId={orgId}
                value={address}
                onChange={(patch) =>
                  setAddress((prev) => ({ ...prev, ...patch }))
                }
              />
              {hasAddressContent(address) && !address.ward.trim() && (
                <p className="rounded-lg border border-[#f0d3c4] bg-[#fdf6f1] px-3 py-2 text-xs font-semibold text-[#a34a1c] dark:border-[#5a3a2a] dark:bg-[#2a211a]">
                  Đang nhập địa chỉ nhưng chưa chọn Phường / Xã — chọn phường/xã
                  hoặc bỏ trống toàn bộ địa chỉ.
                </p>
              )}
            </section>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-[#e1e5dc] px-5 text-sm font-semibold text-[#596052] hover:bg-[#f3f5ef] dark:border-[#40453b] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#527b49] px-5 text-sm font-bold text-white hover:bg-[#41643a] disabled:cursor-wait disabled:opacity-60"
            >
              {saving && <i className="pi pi-spin pi-spinner" aria-hidden="true" />}
              {isCreate ? "Tạo khách hàng" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

