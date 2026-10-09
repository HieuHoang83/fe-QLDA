"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { customerName } from "./customers.utils";
import {
  createAddress,
  deleteAddress,
  listAddresses,
  setAddressDefault,
  updateAddress,
  type HaravanCustomer,
  type HaravanCustomerAddress,
} from "@/services/api/customers";
import {
  AddressField,
  AddressGeoFields,
  emptyGeoAddress,
  type GeoAddressValue,
} from "@/components/Customers/AddressGeoFields";

interface AddressFormState extends GeoAddressValue {
  first_name: string;
  last_name: string;
  phone: string;
  company: string;
  useDefault: boolean;
}

export function emptyAddressForm(customer: HaravanCustomer): AddressFormState {
  return {
    ...emptyGeoAddress(),
    first_name: customer.first_name ?? "",
    last_name: customer.last_name ?? "",
    phone: customer.phone ?? "",
    company: "",
    useDefault: false,
  };
}

export function addressFormFrom(address: HaravanCustomerAddress): AddressFormState {
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

export function addressLine1(address: HaravanCustomerAddress): string {
  return [address.address1, address.address2].filter(Boolean).join(", ");
}

export function addressLine2(address: HaravanCustomerAddress): string {
  return [
    address.ward,
    address.district,
    address.city,
    address.province,
  ]
    .filter(Boolean)
    .join(", ");
}

export function addressSummary(address: HaravanCustomerAddress): string {
  return [addressLine1(address), addressLine2(address)]
    .filter(Boolean)
    .join(", ");
}

export function CustomerAddressDialog({
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

