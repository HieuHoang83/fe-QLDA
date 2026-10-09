"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { useShop } from "@/context/ShopContext";
import HaravanShell from "@/components/haravan/HaravanShell";
import VariantManager from "@/components/Products/VariantManager";
import {
  getProduct,
  updateProduct,
  type HaravanProduct,
  type HaravanProductVariant,
} from "@/services/api/products";
import { firstImage, formatDate } from "@/lib/haravan-format";
import { Frame, InfoRow } from "@/components/Products/ProductPanels";
import { ProductEditDialog } from "@/components/Products/ProductEditDialog";
import type { ProductFormState } from "@/components/Products/product.form";

interface ProductDetailPageProps {
  productId: number;
}


export default function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const { data: session } = useSession();
  const { currentShop } = useShop();
  const locale = useLocale();
  const orgId = currentShop.orgId;
  const token = session?.access_token;

  const [product, setProduct] = useState<HaravanProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mainImage, setMainImage] = useState<string | undefined>(undefined);
  const [selectedVariant, setSelectedVariant] =
    useState<HaravanProductVariant | null>(null);
  const [editingProduct, setEditingProduct] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token || !orgId) return;
    setLoading(true);
    setError("");
    try {
      const result = await getProduct(token, orgId, productId);
      setProduct(result.product);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không tải được sản phẩm."
      );
    } finally {
      setLoading(false);
    }
  }, [token, orgId, productId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (product && !mainImage) {
      setMainImage(firstImage(product.images));
    }
  }, [product, mainImage]);

  async function handleSaveProduct(form: ProductFormState) {
    if (!token || !product?.id) return;
    setSaving(true);
    try {
      const result = await updateProduct(token, orgId, product.id, {
        title: form.title,
        vendor: form.vendor,
        product_type: form.product_type,
        tags: form.tags,
      });
      setProduct(result.product);
      setEditingProduct(false);
      toast.success(`Đã cập nhật sản phẩm "${result.product.title}".`);
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Không cập nhật được sản phẩm."
      );
    } finally {
      setSaving(false);
    }
  }

  // Không cò panel chọn biến thể để dùng biến thể đầu tiên.
  const variant: HaravanProductVariant | null =
    product?.variants?.[0] ?? null;
  const baseUnit =
    variant?.variant_units?.find((unit) => unit.base)?.unit ?? "";

  return (
    <HaravanShell fill>
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <Link
          href={`/${locale}/products`}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e5e7df] px-4 text-sm font-semibold text-[#596052] hover:bg-[#f3f5ef] dark:border-[#40453b] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
        >
          <i className="pi pi-arrow-left" aria-hidden="true" />
          Quay lại danh sách
        </Link>
        <div className="flex items-center gap-3">
          {product && (
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                product.published_at
                  ? "bg-[#e8f4e9] text-[#26733c] dark:bg-[#30392c] dark:text-[#c4dfa9]"
                  : "bg-[#f1f2ef] text-[#62685e] dark:bg-[#30342e] dark:text-[#d3d8ce]"
              }`}
            >
              <i
                className={`pi ${product.published_at ? "pi-eye" : "pi-eye-slash"}`}
                aria-hidden="true"
              />
              {product.published_at ? "Đang bán" : "Ẩn"}
            </span>
          )}
          <button
            type="button"
            disabled={!product}
            onClick={() => setEditingProduct(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#527b49] px-4 text-sm font-bold text-white hover:bg-[#41643a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <i className="pi pi-pencil" aria-hidden="true" />
            Sửa sản phẩm
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-semibold text-[#64705d] dark:text-[#c4dfa9]">
            <i className="pi pi-spin pi-spinner text-lg" aria-hidden="true" />
            Đang tải sản phẩm...
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-md rounded-2xl border border-[#f0d6d2] bg-[#fff7f5] px-6 py-5 text-center dark:border-[#54312d] dark:bg-[#382321]">
            <i className="pi pi-exclamation-triangle text-2xl text-[#aa382f] dark:text-[#ffb7af]" />
            <p className="mt-3 text-sm text-[#aa382f] dark:text-[#ffb7af]">{error}</p>
          </div>
        </div>
      ) : product ? (
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-4">
          <Frame title="Thông tin sản phẩm" icon="pi-box">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
              <div className="flex flex-col gap-3">
                <div className="grid aspect-square place-items-center overflow-hidden rounded-xl border border-[#eef0ea] bg-[#fbfbf9] dark:border-[#363b31] dark:bg-[#191c18]">
                  {mainImage ? (
                    <img
                      src={mainImage}
                      alt={product.title ?? ""}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <i
                      className="pi pi-image text-5xl text-[#b6bcb0]"
                      aria-hidden="true"
                    />
                  )}
                </div>
                {(product.images?.length ?? 0) > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {product.images?.map((image) => (
                      <button
                        key={image.id ?? image.src}
                        type="button"
                        onClick={() => image.src && setMainImage(image.src)}
                        aria-label={`Chọn ảnh #${image.position ?? ""}`}
                        className={`grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border-2 ${
                          mainImage === image.src
                            ? "border-[#527b49]"
                            : "border-[#e5e7df] hover:border-[#7c9f70] dark:border-[#40453b]"
                        }`}
                      >
                        {image.src ? (
                          <img src={image.src} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <i className="pi pi-image text-[#b6bcb0]" aria-hidden="true" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  {product.vendor && (
                    <span className="rounded-full bg-[#f1f2ef] px-3 py-1 text-[#62685e] dark:bg-[#30342e] dark:text-[#d3d8ce]">
                      {product.vendor}
                    </span>
                  )}
                  {product.product_type && (
                    <span className="rounded-full bg-[#f1f2ef] px-3 py-1 text-[#62685e] dark:bg-[#30342e] dark:text-[#d3d8ce]">
                      {product.product_type}
                    </span>
                  )}
                  <span className="rounded-full bg-[#eef2ee] px-3 py-1 text-[#71836a] dark:bg-[#30392c] dark:text-[#c4dfa9]">
                    ID #{product.id}
                  </span>
                </div>

                <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
                  {product.title}
                </h1>
                {product.handle && (
                  <p className="mt-1 text-sm text-[#858a80]">/{product.handle}</p>
                )}

                <div className="mt-5 divide-y divide-[#f2f3ef] rounded-xl border border-[#eef0ea] px-4 dark:divide-[#30342e] dark:border-[#363b31]">
                  <InfoRow
                    label="Số biến thể"
                    value={`${product.variants?.length ?? 0}`}
                  />
                  <InfoRow label="Tạo ngày" value={formatDate(product.created_at)} />
                  <InfoRow label="Cập nhật" value={formatDate(product.updated_at)} />
                  <InfoRow
                    label="Tags"
                    value={
                      product.tags ? (
                        <span className="font-medium text-[#527b49] dark:text-[#c4dfa9]">
                          {product.tags}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </Frame>

          <div className="grid gap-5 lg:grid-cols-2">
            <Frame title="Vận chuyển" icon="pi-truck">
              {variant ? (
                <div className="divide-y divide-[#f2f3ef] dark:divide-[#30342e]">
                  <InfoRow
                    label="Giao hàng"
                    value={
                      variant.requires_shipping ? (
                        <span className="text-[#26733c] dark:text-[#c4dfa9]">
                          Cho phép giao hàng
                        </span>
                      ) : (
                        <span className="text-[#969b91]">Không giao hàng</span>
                      )
                    }
                  />
                  <InfoRow
                    label="Khối lượng"
                    value={
                      variant.grams != null ? (
                        <span className="tabular-nums">
                          {variant.grams} grams
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <InfoRow
                    label="Tính thuế"
                    value={variant.taxable ? "Có" : "Không"}
                  />
                </div>
              ) : (
                <p className="text-sm text-[#858a80]">Chưa chọn biến thể.</p>
              )}
            </Frame>

            <Frame title="Đơn vị tính" icon="pi-inbox">
              <div className="divide-y divide-[#f2f3ef] dark:divide-[#30342e]">
                <InfoRow
                  label="Đơn vị cơ bản"
                  value={
                    baseUnit ? (
                      <span className="text-[#527b49] dark:text-[#c4dfa9]">{baseUnit}</span>
                    ) : (
                      <span className="text-[#969b91]">Chưa thiết lập</span>
                    )
                  }
                />
              </div>
              <p className="mt-3 rounded-xl bg-[#f6fbf5] px-4 py-3 text-xs text-[#426a40] dark:bg-[#202820] dark:text-[#b4cfb3]">
                Biến thể có nhiều đơn vị tính (ví dụ: lon, lốc, thùng...). Đơn vị cơ
                bản là đơn vị nhỏ nhất dùng để tính tồn kho.
              </p>
            </Frame>
          </div>

          {product.body_html && (
            <Frame title="Mô tả sản phẩm" icon="pi-align-left">
              <div
                className="prose-x prose-sm overflow-hidden text-[#3f463b] dark:text-[#d3d8ce] [&_*]:max-w-full"
                dangerouslySetInnerHTML={{ __html: product.body_html }}
              />
            </Frame>
          )}

          <VariantManager
            product={product}
            token={token}
            orgId={orgId}
            onReload={load}
          />
        </div>
      ) : null}

      {editingProduct && product && (
        <ProductEditDialog
          product={product}
          saving={saving}
          onClose={() => setEditingProduct(false)}
          onSave={(form) => void handleSaveProduct(form)}
        />
      )}
    </HaravanShell>
  );
}

