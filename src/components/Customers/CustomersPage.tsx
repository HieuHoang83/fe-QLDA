"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useShop } from "@/context/ShopContext";
import HaravanShell from "@/components/haravan/HaravanShell";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import { CustomerEditDialog } from "@/components/Customers/CustomerEditDialog";
import {
  CustomerAddressDialog,
  addressSummary,
} from "@/components/Customers/CustomerAddressDialog";
import {
  customerName,
  emptyForm,
  type CustomerFormState,
} from "@/components/Customers/customers.utils";
import {
  countCustomers,
  createAddress,
  createCustomer,
  listCustomers,
  searchCustomers,
  updateCustomer,
  type HaravanCustomer,
} from "@/services/api/customers";
import { hasAddressContent, type GeoAddressValue } from "@/components/Customers/AddressGeoFields";
import { formatDate, formatMoney } from "@/lib/haravan-format";

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

