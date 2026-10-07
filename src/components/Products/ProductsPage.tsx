"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useShop } from "@/context/ShopContext";
import HaravanShell from "@/components/haravan/HaravanShell";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import {
  listProducts,
  countProducts,
  updateProduct,
  type HaravanProduct,
} from "@/services/api/products";
import {
  firstImage,
  formatDate,
  formatMoney,
  productPrice,
  productStock,
} from "@/lib/haravan-format";

interface ProductFormState {
  title: string;
  vendor: string;
  product_type: string;
  tags: string;
}

function emptyForm(product: HaravanProduct): ProductFormState {
  return {
    title: product.title ?? "",
    vendor: product.vendor ?? "",
    product_type: product.product_type ?? "",
    tags: product.tags ?? "",
  };
}

function ProductEditDialog({
  product,
  saving,
  onClose,
  onSave,
}: {
  product: HaravanProduct;
  saving: boolean;
  onClose: () => void;
  onSave: (form: ProductFormState) => void;
}) {
  const [form, setForm] = useState<ProductFormState>(() => emptyForm(product));

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
        aria-labelledby="product-edit-title"
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#20231f]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#eef0ea] px-6 py-4 dark:border-[#363b31]">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#71836a]">
              Cập nhật sản phẩm
            </p>
            <h2 id="product-edit-title" className="mt-1 truncate text-xl font-extrabold">
              {product.title || `Sản phẩm #${product.id}`}
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
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Tên sản phẩm</span>
            <input
              type="text"
              required
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              className="h-11 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Nhà cung cấp</span>
              <input
                type="text"
                value={form.vendor}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, vendor: event.target.value }))
                }
                className="h-11 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Loại sản phẩm</span>
              <input
                type="text"
                value={form.product_type}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, product_type: event.target.value }))
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

export default function ProductsPage() {
  const { data: session } = useSession();
  const { currentShop } = useShop();
  const locale = useLocale();
  const orgId = currentShop.orgId;

  const [products, setProducts] = useState<HaravanProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<HaravanProduct | null>(null);
  const [saving, setSaving] = useState(false);

  const token = session?.access_token;

  useEffect(() => {
    setPage(1);
    setSearch("");
  }, [orgId]);

  const load = useCallback(async () => {
    if (!token || !orgId) return;
    setLoading(true);
    setError("");
    try {
      const [list, count] = await Promise.all([
        listProducts(token, orgId, { page, limit: pageSize }),
        countProducts(token, orgId),
      ]);
      setProducts(list.products ?? []);
      setTotal(count.count ?? 0);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không tải được danh sách sản phẩm."
      );
    } finally {
      setLoading(false);
    }
  }, [token, orgId, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return products;
    return products.filter((product) =>
      [
        product.title,
        product.handle,
        product.vendor,
        product.product_type,
        product.tags,
        ...(product.variants ?? []).map((variant) => variant.sku),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [products, search]);

  async function handleSave(form: ProductFormState) {
    if (!token || !editing?.id) return;
    setSaving(true);
    setNotice("");
    try {
      const result = await updateProduct(token, orgId, editing.id, {
        title: form.title,
        vendor: form.vendor,
        product_type: form.product_type,
        tags: form.tags,
      });
      setProducts((prev) =>
        prev.map((product) =>
          product.id === result.product.id ? result.product : product
        )
      );
      setEditing(null);
      setNotice(`Đã cập nhật sản phẩm "${result.product.title}".`);
    } catch (saveError) {
      setNotice(
        saveError instanceof Error
          ? saveError.message
          : "Không cập nhật được sản phẩm."
      );
    } finally {
      setSaving(false);
    }
  }

  const columns: DataTableColumn<HaravanProduct>[] = [
    {
      key: "image",
      header: "Ảnh",
      width: 72,
      sticky: true,
      align: "center",
      cell: (product) => {
        const image = firstImage(product.images);
        const inner = (
          <div className="mx-auto grid h-12 w-12 place-items-center overflow-hidden rounded-lg border border-[#eef0ea] bg-[#fbfbf9] dark:border-[#363b31] dark:bg-[#191c18]">
            {image ? (
              <img
                src={image}
                alt={product.title ?? ""}
                className="h-full w-full object-cover"
              />
            ) : (
              <i className="pi pi-image text-[#b6bcb0]" aria-hidden="true" />
            )}
          </div>
        );
        return product.id ? (
          <div className="mx-auto w-fit">
            <Link
              href={`/${locale}/products/${product.id}`}
              aria-label={`Xem chi tiết ${product.title ?? ""}`}
              className="block rounded-lg transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[#7c9f70]/40"
            >
              {inner}
            </Link>
          </div>
        ) : (
          inner
        );
      },
    },
    {
      key: "title",
      header: "Sản phẩm",
      width: 280,
      cell: (product) => (
        <>
          {product.id ? (
            <Link
              href={`/${locale}/products/${product.id}`}
              className="block max-w-[320px] truncate font-semibold text-[#33412f] transition hover:text-[#527b49] focus:outline-none focus:ring-2 focus:ring-[#7c9f70]/40 dark:text-[#e9ecdf] dark:hover:text-[#c4dfa9]"
            >
              {product.title || "—"}
            </Link>
          ) : (
            <span className="block max-w-[320px] truncate font-semibold">
              {product.title || "—"}
            </span>
          )}
          <span className="mt-0.5 block text-xs text-[#969b91]">
            ID: {product.id}
            {product.handle ? ` · ${product.handle}` : ""}
          </span>
        </>
      ),
    },
    {
      key: "vendor",
      header: "Nhà cung cấp",
      width: 170,
      cell: (product) => product.vendor || "—",
    },
    {
      key: "type",
      header: "Loại",
      width: 150,
      cell: (product) => product.product_type || "—",
    },
    {
      key: "price",
      header: "Giá",
      width: 130,
      align: "right",
      cell: (product) => (
        <span className="font-semibold tabular-nums">
          {formatMoney(productPrice(product))}
        </span>
      ),
    },
    {
      key: "stock",
      header: "Tồn kho",
      width: 110,
      align: "right",
      cell: (product) => {
        const stock = productStock(product);
        return (
          <span className="tabular-nums">{stock === undefined ? "—" : stock}</span>
        );
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      width: 130,
      cell: (product) => {
        const published = Boolean(product.published_at);
        return (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              published
                ? "bg-[#e8f4e9] text-[#26733c] dark:bg-[#30392c] dark:text-[#c4dfa9]"
                : "bg-[#f1f2ef] text-[#62685e] dark:bg-[#30342e] dark:text-[#d3d8ce]"
            }`}
          >
            {published ? "Đang bán" : "Ẩn"}
          </span>
        );
      },
    },
    {
      key: "updated",
      header: "Cập nhật",
      width: 150,
      cell: (product) => (
        <span className="text-[#70766c] dark:text-[#c0c6ba]">
          {formatDate(product.updated_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      width: 180,
      align: "right",
      cell: (product) => (
        <div className="flex items-center justify-end gap-2">
          {product.id && (
            <Link
              href={`/${locale}/products/${product.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-[#e5e7df] px-3 py-2 text-xs font-semibold text-[#596052] transition hover:bg-[#f3f5ef] dark:border-[#40453b] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
            >
              <i className="pi pi-th-large" aria-hidden="true" />
              Biến thể
            </Link>
          )}
          <button
            type="button"
            onClick={() => setEditing(product)}
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
    <HaravanShell
      fill
      title="Quản lý sản phẩm"
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
        rows={filtered}
        rowKey={(product) => product.id ?? product.handle ?? ""}
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        error={error}
        minWidth={1200}
        paginationLabel="sản phẩm"
        emptyIcon="pi-box"
        emptyTitle="Không có sản phẩm"
        emptyHint="Thử đổi từ khóa tìm kiếm hoặc shop."
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(1);
        }}
        toolbar={
          <>
            <label className="relative w-full sm:w-[min(420px,45vw)]">
              <span className="sr-only">Tìm sản phẩm</span>
              <i
                className="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#92988d]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tên, SKU, nhà cung cấp..."
                className="h-11 w-full rounded-xl border border-[#e5e7df] bg-[#fbfbf9] pl-11 pr-3 text-sm outline-none focus:border-[#7c9f70] focus:ring-2 focus:ring-[#7c9f70]/15 dark:border-[#40453b] dark:bg-[#191c18]"
              />
            </label>
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#858a80] dark:text-[#aeb4a8]">
                {loading ? "Đang tải..." : `${total} sản phẩm`}
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
        <ProductEditDialog
          product={editing}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={(form) => void handleSave(form)}
        />
      )}
    </HaravanShell>
  );
}
