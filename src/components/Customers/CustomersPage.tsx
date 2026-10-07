"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useShop } from "@/context/ShopContext";
import HaravanShell from "@/components/haravan/HaravanShell";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import {
  listCustomers,
  searchCustomers,
  countCustomers,
  updateCustomer,
  type HaravanCustomer,
} from "@/services/api/customers";
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

function emptyForm(customer: HaravanCustomer): CustomerFormState {
  return {
    first_name: customer.first_name ?? "",
    last_name: customer.last_name ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    tags: customer.tags ?? "",
    note: customer.note ?? "",
  };
}

function CustomerEditDialog({
  customer,
  saving,
  onClose,
  onSave,
}: {
  customer: HaravanCustomer;
  saving: boolean;
  onClose: () => void;
  onSave: (form: CustomerFormState) => void;
}) {
  const [form, setForm] = useState<CustomerFormState>(() => emptyForm(customer));

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
              Cập nhật khách hàng
            </p>
            <h2 id="customer-edit-title" className="mt-1 truncate text-xl font-extrabold">
              {customerName(customer)}
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

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(form);
          }}
          className="space-y-4 px-6 py-5"
        >
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
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
                className="h-11 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Số điện thoại</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, phone: event.target.value }))
                }
                className="h-11 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]"
              />
            </label>
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
              Lưu thay đổi
            </button>
          </div>
        </form>
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
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<HaravanCustomer | null>(null);
  const [saving, setSaving] = useState(false);

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

  async function handleSave(form: CustomerFormState) {
    if (!token || !editing?.id) return;
    setSaving(true);
    setNotice("");
    try {
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
      setNotice(`Đã cập nhật khách hàng "${customerName(result.customer)}".`);
    } catch (saveError) {
      setNotice(
        saveError instanceof Error
          ? saveError.message
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
      width: 110,
      align: "right",
      cell: (customer) => (
        <button
          type="button"
          onClick={() => setEditing(customer)}
          className="inline-flex items-center gap-2 rounded-lg border border-[#e5e7df] px-3 py-2 text-xs font-semibold text-[#596052] transition hover:bg-[#f3f5ef] dark:border-[#40453b] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
        >
          <i className="pi pi-pencil" aria-hidden="true" />
          Sửa
        </button>
      ),
    },
  ];

  return (
    <HaravanShell
      fill
      title="Quản lý khách hàng"
    >
      {notice && (
        <div
          role="status"
          className="mb-4 flex shrink-0 items-start justify-between gap-4 rounded-xl border border-[#dce9dc] bg-[#f6fbf5] px-4 py-3 text-sm text-[#426a40] dark:border-[#354736] dark:bg-[#202820] dark:text-[#b4cfb3]"
        >
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Đóng">
            <i className="pi pi-times" aria-hidden="true" />
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={customers}
        rowKey={(customer) => customer.id ?? customer.email ?? customer.phone ?? ""}
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        error={error}
        minWidth={1100}
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

      {editing && (
        <CustomerEditDialog
          customer={editing}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={(form) => void handleSave(form)}
        />
      )}
    </HaravanShell>
  );
}
