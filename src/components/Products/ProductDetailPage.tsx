"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useShop } from "@/context/ShopContext";
import HaravanShell from "@/components/haravan/HaravanShell";
import VariantPicker from "@/components/Products/VariantPicker";
import VariantManager from "@/components/Products/VariantManager";
import { getProduct, type HaravanProduct } from "@/services/api/products";
import { firstImage, formatDate } from "@/lib/haravan-format";

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

  return (
    <HaravanShell fill title={product?.title || "Chi tiết sản phẩm"}>
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <Link
          href={`/${locale}/products`}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e5e7df] px-4 text-sm font-semibold text-[#596052] hover:bg-[#f3f5ef] dark:border-[#40453b] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
        >
          <i className="pi pi-arrow-left" aria-hidden="true" />
          Quay lại danh sách
        </Link>
        {product && (
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
              product.published_at
                ? "bg-[#e8f4e9] text-[#26733c] dark:bg-[#30392c] dark:text-[#c4dfa9]"
                : "bg-[#f1f2ef] text-[#62685e] dark:bg-[#30342e] dark:text-[#d3d8ce]"
            }`}
          >
            <i
              className={`pi ${
                product.published_at ? "pi-eye" : "pi-eye-slash"
              }`}
              aria-hidden="true"
            />
            {product.published_at ? "Đang bán" : "Ẩn"}
          </span>
        )}
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
            <p className="mt-3 text-sm text-[#aa382f] dark:text-[#ffb7af]">
              {error}
            </p>
          </div>
        </div>
      ) : product ? (
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-2">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div className="flex flex-col gap-3">
              <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl border border-[#e8e9e2] bg-white dark:border-[#363b31] dark:bg-[#20231f]">
                {mainImage ? (
                  <img
                    src={mainImage}
                    alt={product.title ?? ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <i className="pi pi-image text-5xl text-[#b6bcb0]" aria-hidden="true" />
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
                      className={`grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border-2 ${
                        mainImage === image.src
                          ? "border-[#527b49]"
                          : "border-[#e5e7df] hover:border-[#7c9f70] dark:border-[#40453b]"
                      }`}
                    >
                      {image.src ? (
                        <img
                          src={image.src}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <i className="pi pi-image text-[#b6bcb0]" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div>
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
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
                  {product.title}
                </h2>
                {product.handle && (
                  <p className="mt-1 text-sm text-[#858a80]">{product.handle}</p>
                )}
              </div>

              <VariantPicker product={product} onImageChange={setMainImage} />

              {product.body_html && (
                <div
                  className="prose-x prose-sm overflow-hidden rounded-2xl border border-[#e8e9e2] bg-white px-5 py-4 text-[#3f463b] dark:border-[#363b31] dark:bg-[#191c18] dark:text-[#d3d8ce] [&_*]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: product.body_html }}
                />
              )}

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#73796f] dark:text-[#b3b9ad]">
                <span>Cập nhật: {formatDate(product.updated_at)}</span>
                <span>Tạo: {formatDate(product.created_at)}</span>
                {product.tags && <span>Tags: {product.tags}</span>}
              </div>
            </div>
          </section>

          <VariantManager
            product={product}
            token={token}
            orgId={orgId}
            onReload={load}
          />
        </div>
      ) : null}
    </HaravanShell>
  );
}