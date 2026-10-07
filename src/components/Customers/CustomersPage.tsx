"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useShop } from "@/context/ShopContext";
import HaravanShell from "@/components/haravan/HaravanShell";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import {
  listCustomers,
  searchCustomers,
  countCustomers,
  createCustomer,
  updateCustomer,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setAddressDefault,
  type HaravanCustomer,
  type HaravanCustomerAddress,
} from "@/services/api/customers";
import {
  AddressField,
  AddressGeoFields,
  emptyGeoAddress,
  hasAddressContent,
  type GeoAddressValue,
} from "@/components/Customers/AddressGeoFields";
import { formatDate, formatMoney } from "@/lib/haravan-format";

interface CustomerFormState {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  tags: string;
  note: string;
}

function customerName(customer: HaravanCustomer): string {
  const name = [customer.last_name, customer.first_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return (
    name ||
    customer.default_address?.name ||
    customer.email ||
    customer.phone ||
    `Khách #${customer.id}`
  );
}

function emptyForm(customer?: HaravanCustomer): CustomerFormState {
  return {
    first_name: customer?.first_name ?? "",
    last_name: customer?.last_name ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    tags: customer?.tags ?? "",
    note: customer?.note ?? "",
  };
}

function CustomerEditDialog({
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

interface AddressFormState extends GeoAddressValue {
  first_name: string;
  last_name: string;
  phone: string;
  company: string;
  useDefault: boolean;
}

function emptyAddressForm(customer: HaravanCustomer): AddressFormState {
  return {
    ...emptyGeoAddress(),
    first_name: customer.first_name ?? "",
    last_name: customer.last_name ?? "",
    phone: customer.phone ?? "",
    company: "",
    useDefault: false,
  };
}

function addressFormFrom(address: HaravanCustomerAddress): AddressFormState {
  return {
    ...emptyGeoAddress(),
    first_name: address.first_name ?? "",
    last_name: address.last_name ?? "",
    phone: address.phone ?? "",
    address1: address.address1 ?? "",
    address2: address.address2 ?? "",
    ward: address.ward ?? "",
    ward_code: address.ward_code ?? "",
    district: address.district ?? "",
    district_code: address.district_code ?? "",
    city: address.city ?? "",
    province: address.province ?? "",
    province_code: address.province_code ?? "",
    zip: address.zip ?? "",
    country: address.country ?? "",
    country_code: address.country_code ?? "",
    company: address.company ?? "",
    useDefault: address.default ?? false,
  };
}

function addressLine1(address: HaravanCustomerAddress): string {
  return [address.address1, address.address2].filter(Boolean).join(", ");
}

function addressLine2(address: HaravanCustomerAddress): string {
  return [
    address.ward,
    address.district,
    address.city,
    address.province,
  ]
    .filter(Boolean)
    .join(", ");
}

function addressSummary(address: HaravanCustomerAddress): string {
  return [addressLine1(address), addressLine2(address)]
    .filter(Boolean)
    .join(", ");
}

function CustomerAddressDialog({
  token,
  orgId,
  customer,
  onClose,
  onChanged,
}: {
  token: string;
  orgId: string;
  customer: HaravanCustomer;
  onClose: () => void;
  onChanged: (message: string) => void;
}) {
  const customerId = customer.id;
  const customerLabel = customerName(customer);
  const [addresses, setAddresses] = useState<HaravanCustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<AddressFormState | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  function notifyError(message: string) {
    setError(message);
    toast.error(message);
  }

  const load = useCallback(async () => {
    if (!token || !orgId || !customerId) return;
    setLoading(true);
    setError("");
    try {
      const result = await listAddresses(token, orgId, customerId, {
        // Haravan chi chap nhan limit <= 50 cho danh sach dia chi (422 neu lon hon).
        limit: 50,
      });
      setAddresses(result.addresses ?? []);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Không tải được danh sách địa chỉ.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token, orgId, customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setError("");
    setForm(emptyAddressForm(customer));
  }

  function openEdit(address: HaravanCustomerAddress) {
    setEditingId(address.id ?? null);
    setError("");
    setForm(addressFormFrom(address));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || !token || !orgId || !customerId) return;
    setFormBusy(true);
    setError("");
    try {
      const payload: Partial<HaravanCustomerAddress> = {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        address1: form.address1,
        address2: form.address2,
        ward: form.ward,
        ward_code: form.ward_code,
        district: form.district,
        district_code: form.district_code,
        city: form.city,
        province: form.province,
        province_code: form.province_code,
        zip: form.zip,
        country: form.country,
        country_code: form.country_code,
        company: form.company,
      };
      if (editingId == null) {
        payload.default = form.useDefault;
        await createAddress(token, orgId, customerId, payload);
      } else {
        await updateAddress(token, orgId, customerId, editingId, payload);
      }
      await load();
      onChanged(
        editingId == null
          ? `Đã thêm địa chỉ cho "${customerLabel}".`
          : `Đã cập nhật địa chỉ của "${customerLabel}".`
      );
      setForm(null);
      setEditingId(null);
    } catch (saveError) {
      notifyError(
        saveError instanceof Error
          ? saveError.message
          : editingId == null
            ? "Không thêm được địa chỉ."
            : "Không cập nhật được địa chỉ."
      );
    } finally {
      setFormBusy(false);
    }
  }

  async function handleSetDefault(address: HaravanCustomerAddress) {
    if (!token || !orgId || !customerId || address.id == null) return;
    setBusyId(address.id);
    setError("");
    try {
      await setAddressDefault(token, orgId, customerId, address.id);
      await load();
      onChanged(`Đã đặt địa chỉ mặc định cho "${customerLabel}".`);
    } catch (saveError) {
      notifyError(
        saveError instanceof Error
          ? saveError.message
          : "Không đặt được địa chỉ mặc định."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(address: HaravanCustomerAddress) {
    if (!token || !orgId || !customerId || address.id == null) return;
    setBusyId(address.id);
    setError("");
    try {
      await deleteAddress(token, orgId, customerId, address.id);
      setConfirmDeleteId(null);
      await load();
      onChanged(`Đã xóa địa chỉ của "${customerLabel}".`);
    } catch (saveError) {
      notifyError(
        saveError instanceof Error
          ? saveError.message
          : "Không xóa được địa chỉ."
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !formBusy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-address-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#20231f]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#eef0ea] px-6 py-4 dark:border-[#363b31]">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#71836a]">
              {form ? (editingId == null ? "Thêm địa chỉ" : "Sửa địa chỉ") : "Địa chỉ khách hàng"}
            </p>
            <h2
              id="customer-address-title"
              className="mt-1 truncate text-xl font-extrabold"
            >
              {customerLabel}
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

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-[#f0d3c4] bg-[#fdf6f1] px-4 py-3 text-sm text-[#a34a1c] dark:border-[#5a3a2a] dark:bg-[#2a211a] dark:text-[#e0a184]"
            >
              {error}
            </p>
          )}

          {form ? (
            <form
              id="customer-address-form"
              onSubmit={(event) => void handleSubmit(event)}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <AddressField
                  label="Họ"
                  value={form.last_name}
                  onChange={(value) =>
                    setForm((prev) => prev && { ...prev, last_name: value })
                  }
                />
                <AddressField
                  label="Tên"
                  value={form.first_name}
                  onChange={(value) =>
                    setForm((prev) => prev && { ...prev, first_name: value })
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <AddressField
                  label="Số điện thoại"
                  type="tel"
                  value={form.phone}
                  onChange={(value) =>
                    setForm((prev) => prev && { ...prev, phone: value })
                  }
                />
                <AddressField
                  label="Công ty"
                  value={form.company}
                  onChange={(value) =>
                    setForm((prev) => prev && { ...prev, company: value })
                  }
                />
              </div>
              <AddressGeoFields
                token={token}
                orgId={orgId}
                value={form}
                address1Required
                onChange={(patch) =>
                  setForm((prev) => prev && { ...prev, ...patch })
                }
              />

              {editingId == null && (
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e5e7df] px-4 py-3 text-sm dark:border-[#40453b]">
                  <input
                    type="checkbox"
                    checked={form.useDefault}
                    onChange={(event) =>
                      setForm(
                        (prev) =>
                          prev && { ...prev, useDefault: event.target.checked }
                      )
                    }
                    className="h-4 w-4 accent-[#527b49]"
                  />
                  Đặt làm địa chỉ mặc định của khách
                </label>
              )}
            </form>
          ) : loading ? (
            <p className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#d8ddd3] px-4 py-3 text-sm text-[#858a80] dark:border-[#40453b]">
              <i className="pi pi-spin pi-spinner" aria-hidden="true" />
              Đang tải địa chỉ...
            </p>
          ) : addresses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#d8ddd3] px-4 py-3 text-sm text-[#858a80] dark:border-[#40453b]">
              Khách chưa có địa chỉ nào. Bấm &quot;Thêm địa chỉ&quot; để thêm.
            </p>
          ) : (
            <ul className="space-y-3">
              {addresses.map((address) => {
                const busy = busyId === address.id;
                return (
                  <li
                    key={address.id}
                    className="rounded-xl border border-[#e5e7df] bg-[#fbfcf9] px-4 py-3 dark:border-[#40453b] dark:bg-[#191c18]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">
                            {address.name ||
                              [address.last_name, address.first_name]
                                .filter(Boolean)
                                .join(" ") ||
                              customerLabel}
                          </span>
                          {address.default && (
                            <span className="rounded-full bg-[#eef2ee] px-2.5 py-0.5 text-[11px] font-bold text-[#26733c] dark:bg-[#30392c] dark:text-[#c4dfa9]">
                              Mặc định
                            </span>
                          )}
                        </div>
                        {address.phone && (
                          <span className="mt-0.5 block text-sm text-[#596052] dark:text-[#b3b9ad]">
                            {address.phone}
                          </span>
                        )}
                        <span className="mt-1 block text-sm text-[#70766c] dark:text-[#c0c6ba]">
                          {[addressLine1(address), addressLine2(address)]
                            .filter(Boolean)
                            .join(" — ") || "Chưa có địa chỉ chi tiết"}
                          {address.country ? `, ${address.country}` : ""}
                        </span>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {!address.default && address.id != null && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleSetDefault(address)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7df] px-3 py-2 text-xs font-semibold text-[#596052] transition hover:bg-[#f3f5ef] disabled:opacity-60 dark:border-[#40453b] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
                          >
                            <i className="pi pi-star" aria-hidden="true" />
                            Mặc định
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => openEdit(address)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7df] px-3 py-2 text-xs font-semibold text-[#596052] transition hover:bg-[#f3f5ef] disabled:opacity-60 dark:border-[#40453b] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
                        >
                          <i className="pi pi-pencil" aria-hidden="true" />
                          Sửa
                        </button>
                        {address.id != null &&
                          (confirmDeleteId === address.id ? (
                            <span className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleDelete(address)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#b4441f] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                              >
                                {busy ? (
                                  <i
                                    className="pi pi-spin pi-spinner"
                                    aria-hidden="true"
                                  />
                                ) : null}
                                Chắc chắn xóa
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-lg border border-[#e5e7df] px-3 py-2 text-xs font-semibold text-[#596052] dark:border-[#40453b] dark:text-[#d3d8ce]"
                              >
                                Hủy
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setConfirmDeleteId(address.id ?? null)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7df] px-3 py-2 text-xs font-semibold text-[#b4441f] transition hover:bg-[#fdf6f1] disabled:opacity-60 dark:border-[#40453b] dark:hover:bg-[#2a211a]"
                            >
                              <i className="pi pi-trash" aria-hidden="true" />
                              Xóa
                            </button>
                          ))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex flex-wrap justify-end gap-3 border-t border-[#eef0ea] px-6 py-4 dark:border-[#363b31]">
          {form ? (
            <>
              <button
                type="button"
                disabled={formBusy}
                onClick={() => {
                  setForm(null);
                  setEditingId(null);
                  setError("");
                }}
                className="h-11 rounded-xl border border-[#e1e5dc] px-5 text-sm font-semibold text-[#596052] hover:bg-[#f3f5ef] disabled:opacity-60 dark:border-[#40453b] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
              >
                Quay lại
              </button>
              <button
                type="submit"
                form="customer-address-form"
                disabled={formBusy}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#527b49] px-5 text-sm font-bold text-white hover:bg-[#41643a] disabled:cursor-wait disabled:opacity-60"
              >
                {formBusy && (
                  <i className="pi pi-spin pi-spinner" aria-hidden="true" />
                )}
                Lưu địa chỉ
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-xl border border-[#e1e5dc] px-5 text-sm font-semibold text-[#596052] hover:bg-[#f3f5ef] dark:border-[#40453b] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#527b49] px-5 text-sm font-bold text-white hover:bg-[#41643a]"
              >
                <i className="pi pi-plus" aria-hidden="true" />
                Thêm địa chỉ
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}

export default function CustomersPage() {
  const { data: session } = useSession();
  const { currentShop } = useShop();
  const orgId = currentShop.orgId;

  const [customers, setCustomers] = useState<HaravanCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<HaravanCustomer | null>(null);
  const [saving, setSaving] = useState(false);
  const [addressing, setAddressing] = useState<HaravanCustomer | null>(null);

  const token = session?.access_token;

  useEffect(() => {
    setPage(1);
    setSearchInput("");
    setSearchQuery("");
  }, [orgId]);

  const load = useCallback(async () => {
    if (!token || !orgId) return;
    setLoading(true);
    setError("");
    try {
      if (searchQuery) {
        const result = await searchCustomers(token, orgId, {
          query: searchQuery,
          page,
          limit: pageSize,
        });
        const items = result.customers ?? [];
        setCustomers(items);
        setTotal(page * pageSize + (items.length === pageSize ? 1 : 0));
      } else {
        const [list, count] = await Promise.all([
          listCustomers(token, orgId, { page, limit: pageSize }),
          countCustomers(token, orgId),
        ]);
        setCustomers(list.customers ?? []);
        setTotal(count.count ?? 0);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không tải được danh sách khách hàng."
      );
    } finally {
      setLoading(false);
    }
  }, [token, orgId, page, pageSize, searchQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  }

  function refresh() {
    if (page !== 1) {
      setPage(1);
      return;
    }
    void load();
  }

  async function handleSave(
    form: CustomerFormState,
    address: GeoAddressValue
  ) {
    if (!token) return;
    if (creating && !editing?.id && !form.phone.trim()) {
      toast.error("Nhập số điện thoại để tạo khách hàng.");
      return;
    }
    if (
      creating &&
      !editing?.id &&
      hasAddressContent(address) &&
      !address.ward.trim()
    ) {
      toast.error(
        "Chưa chọn Phường / Xã cho địa chỉ khách hàng — chọn phường/xã hoặc bỏ trống địa chỉ."
      );
      return;
    }
    setSaving(true);
    try {
      if (editing?.id) {
        const result = await updateCustomer(token, orgId, editing.id, {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          tags: form.tags,
          note: form.note,
        });
        setCustomers((prev) =>
          prev.map((customer) =>
            customer.id === result.customer.id ? result.customer : customer
          )
        );
        setEditing(null);
        toast.success(
          `Đã cập nhật khách hàng "${customerName(result.customer)}".`
        );
        return;
      }

      const result = await createCustomer(token, orgId, {
        first_name: form.first_name,
        last_name: form.last_name,
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        phone: form.phone,
        tags: form.tags,
        note: form.note,
      });

      let addressNote = "";
      if (hasAddressContent(address) && result.customer.id != null) {
        try {
          await createAddress(token, orgId, result.customer.id, {
            first_name: form.first_name,
            last_name: form.last_name,
            phone: form.phone,
            address1: address.address1,
            address2: address.address2,
            city: address.city,
            province: address.province,
            province_code: address.province_code,
            district: address.district,
            district_code: address.district_code,
            ward: address.ward,
            ward_code: address.ward_code,
            country: address.country,
            country_code: address.country_code,
            zip: address.zip,
            default: true,
          });
          addressNote = "Kèm địa chỉ mặc định.";
        } catch (addressError) {
          addressNote = `Tạo khách xong nhưng chưa tạo được địa chỉ: ${
            addressError instanceof Error ? addressError.message : ""
          }`;
        }
      }

      setCreating(false);
      toast.success(
        `Đã tạo khách hàng "${customerName(result.customer)}".`,
        {
          description: [
            result.customer.email || result.customer.phone || "",
            addressNote,
          ]
            .filter(Boolean)
            .join(" — "),
        }
      );
      refresh();
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : creating
            ? "Không tạo được khách hàng."
            : "Không cập nhật được khách hàng."
      );
    } finally {
      setSaving(false);
    }
  }

  const columns: DataTableColumn<HaravanCustomer>[] = [
    {
      key: "name",
      header: "Khách hàng",
      width: 240,
      cell: (customer) => (
        <>
          <span className="block max-w-[260px] truncate font-semibold">
            {customerName(customer)}
          </span>
          <span className="mt-0.5 block text-xs text-[#969b91]">
            ID: {customer.id}
          </span>
        </>
      ),
    },
    {
      key: "contact",
      header: "Liên hệ",
      width: 200,
      cell: (customer) => (
        <>
          <span className="block">{customer.phone || "—"}</span>
          <span className="mt-0.5 block text-xs text-[#969b91]">
            {customer.email || "—"}
          </span>
        </>
      ),
    },
    {
      key: "address",
      header: "Địa chỉ",
      width: 240,
      cell: (customer) => {
        const address = customer.default_address;
        if (!address) {
          return (
            <span className="text-xs text-[#969b91]">Chưa có địa chỉ</span>
          );
        }
        return (
          <>
            <span className="block max-w-[240px] truncate">
              {addressSummary(address) || address.name || "—"}
            </span>
            <span className="mt-0.5 block text-xs text-[#969b91]">
              {[address.phone, address.country].filter(Boolean).join(" · ") ||
                "—"}
            </span>
          </>
        );
      },
    },
    {
      key: "orders",
      header: "Số đơn",
      width: 100,
      align: "right",
      cell: (customer) => (
        <span className="tabular-nums">{customer.orders_count ?? 0}</span>
      ),
    },
    {
      key: "spent",
      header: "Tổng chi",
      width: 140,
      align: "right",
      cell: (customer) => (
        <span className="font-semibold tabular-nums">
          {formatMoney(customer.total_spent)}
        </span>
      ),
    },
    {
      key: "last_order",
      header: "Đơn gần nhất",
      width: 160,
      cell: (customer) =>
        customer.last_order_name ? (
          <span className="text-[#466d40] dark:text-[#b7d7a5]">
            {customer.last_order_name}
          </span>
        ) : (
          <span className="text-xs text-[#969b91]">—</span>
        ),
    },
    {
      key: "tags",
      header: "Tags",
      width: 160,
      cell: (customer) => (
        <span className="block max-w-[180px] truncate text-xs text-[#73796f] dark:text-[#b3b9ad]">
          {customer.tags || "—"}
        </span>
      ),
    },
    {
      key: "created",
      header: "Ngày tạo",
      width: 150,
      cell: (customer) => (
        <span className="text-[#70766c] dark:text-[#c0c6ba]">
          {formatDate(customer.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      width: 200,
      align: "right",
      cell: (customer) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setAddressing(customer)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#e5e7df] px-3 py-2 text-xs font-semibold text-[#596052] transition hover:bg-[#f3f5ef] dark:border-[#40453b] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
          >
            <i className="pi pi-map-marker" aria-hidden="true" />
            Địa chỉ
          </button>
          <button
            type="button"
            onClick={() => setEditing(customer)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#e5e7df] px-3 py-2 text-xs font-semibold text-[#596052] transition hover:bg-[#f3f5ef] dark:border-[#40453b] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
          >
            <i className="pi pi-pencil" aria-hidden="true" />
            Sửa
          </button>
        </div>
      ),
    },
  ];

  return (
    <HaravanShell fill>
      <DataTable
        columns={columns}
        rows={customers}
        rowKey={(customer) => customer.id ?? customer.email ?? customer.phone ?? ""}
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        error={error}
        minWidth={1400}
        paginationLabel="khách hàng"
        emptyIcon="pi-users"
        emptyTitle="Không có khách hàng"
        emptyHint="Thử đổi từ khóa tìm kiếm hoặc shop."
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(1);
        }}
        toolbar={
          <>
            <form
              onSubmit={handleSearch}
              className="flex w-full gap-2 sm:w-[min(520px,50vw)]"
            >
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Tìm khách hàng</span>
                <i
                  className="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#92988d]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Tên, email hoặc số điện thoại..."
                  className="h-11 w-full rounded-xl border border-[#e5e7df] bg-[#fbfbf9] pl-11 pr-3 text-sm outline-none focus:border-[#7c9f70] focus:ring-2 focus:ring-[#7c9f70]/15 dark:border-[#40453b] dark:bg-[#191c18]"
                />
              </label>
              <button
                type="submit"
                className="h-11 rounded-xl bg-[#527b49] px-4 text-sm font-bold text-white hover:bg-[#41643a]"
              >
                Tìm
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="h-11 rounded-xl border border-[#e5e7df] px-3 text-sm font-semibold text-[#596052] hover:bg-[#f3f5ef] dark:border-[#40453b] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
                >
                  Hủy
                </button>
              )}
            </form>
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#858a80] dark:text-[#aeb4a8]">
                {loading
                  ? "Đang tải..."
                  : searchQuery
                    ? "Kết quả tìm kiếm"
                    : `${total} khách hàng`}
              </span>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#527b49] px-4 text-sm font-bold text-white hover:bg-[#41643a]"
              >
                <i className="pi pi-plus" aria-hidden="true" />
                Thêm khách hàng
              </button>
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                aria-label="Tải lại danh sách"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#e5e7df] text-[#6d7468] hover:bg-[#f5f6f2] disabled:opacity-50 dark:border-[#40453b] dark:text-[#c4c9bf]"
              >
                <i
                  className={`pi pi-refresh ${loading ? "pi-spin" : ""}`}
                  aria-hidden="true"
                />
              </button>
            </div>
          </>
        }
      />

      {(creating || editing) && (
        <CustomerEditDialog
          token={token}
          orgId={orgId}
          customer={editing}
          saving={saving}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={(form, address) => void handleSave(form, address)}
        />
      )}

      {addressing && token && (
        <CustomerAddressDialog
          token={token}
          orgId={orgId}
          customer={addressing}
          onClose={() => setAddressing(null)}
          onChanged={(message) => {
            toast.success(message);
            void load();
          }}
        />
      )}
    </HaravanShell>
  );
}
