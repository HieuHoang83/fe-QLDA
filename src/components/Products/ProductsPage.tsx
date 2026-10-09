"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { useShop } from "@/context/ShopContext";
import HaravanShell from "@/components/haravan/HaravanShell";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import { ProductEditDialog } from "@/components/Products/ProductEditDialog";
import {
  countProducts,
  createProduct,
  listProducts,
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
import { emptyForm, type ProductFormState } from "@/components/Products/product.form";

export default function ProductsPage() {
  const { data: session } = useSession();
  const { currentShop } = useShop();
  const locale = useLocale();
  const router = useRouter();
  const orgId = currentShop.orgId;

  const [products, setProducts] = useState<HaravanProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
          : "Không tải được danh sách sản phẩm.",
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
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [products, search]);

  async function handleSave(form: ProductFormState) {
    if (!token || !orgId) return;
    setSaving(true);
    try {
      if (editing?.id) {
        const result = await updateProduct(token, orgId, editing.id, {
          title: form.title,
          vendor: form.vendor,
          product_type: form.product_type,
          tags: form.tags,
        });
        setProducts((prev) =>
          prev.map((product) =>
            product.id === result.product.id ? result.product : product,
          ),
        );
        setEditing(null);
        toast.success(`Đã cập nhật sản phẩm "${result.product.title}".`);
      } else {
        const result = await createProduct(token, orgId, {
          title: form.title,
          vendor: form.vendor,
          product_type: form.product_type,
          tags: form.tags,
        });
        setProducts((prev) => [result.product, ...prev]);
        setTotal((prev) => prev + 1);
        setEditing(null);
        toast.success(`Đã tạo sản phẩm "${result.product.title}".`, {
          description: result.product.handle ?? "",
        });
      }
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : editing?.id
            ? "Không cập nhật được sản phẩm."
            : "Không tạo được sản phẩm.",
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
          <span className="tabular-nums">
            {stock === undefined ? "—" : stock}
          </span>
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
  ];

  return (
    <HaravanShell fill>
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(product) => product.id ?? product.handle ?? ""}
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        error={error}
        minWidth={1080}
        paginationLabel="sản phẩm"
        onRowClick={(product) => {
          if (product.id) router.push(`/${locale}/products/${product.id}`);
        }}
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
                onClick={() => setEditing({} as HaravanProduct)}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#527b49] px-4 text-sm font-bold text-white hover:bg-[#41643a]"
              >
                <i className="pi pi-plus" aria-hidden="true" />
                Thêm sản phẩm
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

