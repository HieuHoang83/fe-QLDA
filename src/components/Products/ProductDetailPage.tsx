"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { useShop } from "@/context/ShopContext";
import HaravanShell from "@/components/haravan/HaravanShell";
import VariantPicker from "@/components/Products/VariantPicker";
import VariantManager from "@/components/Products/VariantManager";
import { ProductEditDialog } from "@/components/Products/ProductsPage";
import {
  getProduct,
  updateProduct,
  type HaravanProduct,
  type HaravanProductVariant,
} from "@/services/api/products";
import {
  listInventoryLocations,
  listLocations,
  locationAddress,
  isVirtualLocation,
  type HaravanLocation,
} from "@/services/api/locations";
import {
  createCollect,
  createCustomCollection,
  deleteCollect,
  listCollects,
  listCustomCollections,
  type HaravanCollect,
  type HaravanCustomCollection,
} from "@/services/api/collections";
import { firstImage, formatDate } from "@/lib/haravan-format";

interface ProductDetailPageProps {
  productId: number;
}

interface ProductFormState {
  title: string;
  vendor: string;
  product_type: string;
  tags: string;
}

function Frame({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col overflow-hidden rounded-2xl border border-[#e8e9e2] bg-white shadow-[0_4px_24px_rgba(30,40,25,0.045)] dark:border-[#363b31] dark:bg-[#20231f] ${className}`}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-[#eeefe9] px-5 py-4 dark:border-[#363b31]">
        <i className={`pi ${icon} text-[#71836a]`} aria-hidden="true" />
        <h2 className="font-extrabold">{title}</h2>
      </header>
      <div className="flex-1 px-5 py-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#f2f3ef] py-2.5 text-sm last:border-0 dark:border-[#30342e]">
      <span className="shrink-0 text-[#858a80] dark:text-[#aeb4a8]">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
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

  const handleVariantChange = useCallback(
    (variant: HaravanProductVariant) => setSelectedVariant(variant),
    []
  );

  const [locations, setLocations] = useState<HaravanLocation[]>([]);
  const [locationQty, setLocationQty] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!token || !orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await listLocations(token, orgId);
        if (!cancelled) {
          setLocations((result.locations ?? []).filter((location) => !isVirtualLocation(location)));
        }
      } catch {
        if (!cancelled) setLocations([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, orgId]);

  useEffect(() => {
    if (!token || !orgId || !selectedVariant?.id || locations.length === 0) {
      setLocationQty({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await listInventoryLocations(token, orgId, {
          variant_ids: String(selectedVariant.id),
          location_ids: locations.map((location) => location.id).join(","),
        });
        if (cancelled) return;
        const map: Record<number, number> = {};
        for (const item of result.inventory_locations ?? []) {
          if (item.loc_id != null) map[item.loc_id] = item.qty_onhand ?? 0;
        }
        setLocationQty(map);
      } catch {
        if (!cancelled) setLocationQty({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, orgId, selectedVariant?.id, locations]);

  const [collections, setCollections] = useState<HaravanCustomCollection[]>([]);
  const [collects, setCollects] = useState<HaravanCollect[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [togglingCollection, setTogglingCollection] = useState<number | null>(
    null
  );
  const [newCollection, setNewCollection] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);

  const loadCollections = useCallback(async () => {
    if (!token || !orgId) return;
    setCollectionsLoading(true);
    try {
      const [collectionList, collectList] = await Promise.all([
        listCustomCollections(token, orgId, { limit: 250 }),
        listCollects(token, orgId, { product_id: productId }),
      ]);
      setCollections(collectionList.collections ?? []);
      setCollects(collectList.collects ?? []);
    } catch (loadError) {
      setCollections([]);
      setCollects([]);
      toast.error(
        loadError instanceof Error
          ? loadError.message
          : "Không tải được danh sách nhóm sản phẩm."
      );
    } finally {
      setCollectionsLoading(false);
    }
  }, [token, orgId, productId]);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  async function toggleCollection(collection: HaravanCustomCollection) {
    if (!token || !orgId || !product?.id || collection.id == null) return;
    const existing = collects.find(
      (item) => item.collection_id === collection.id
    );
    setTogglingCollection(collection.id);
    try {
      if (existing?.id != null) {
        await deleteCollect(token, orgId, existing.id);
        setCollects((prev) => prev.filter((item) => item.id !== existing.id));
        toast.success(`Đã bỏ sản phẩm khỏi nhóm "${collection.title ?? ""}".`);
      } else {
        const result = await createCollect(token, orgId, {
          product_id: product.id,
          collection_id: collection.id,
        });
        if (result.collect) {
          setCollects((prev) => [...prev, result.collect]);
        }
        toast.success(`Đã thêm sản phẩm vào nhóm "${collection.title ?? ""}".`);
      }
    } catch (toggleError) {
      toast.error(
        toggleError instanceof Error
          ? toggleError.message
          : "Không cập nhật được nhóm sản phẩm."
      );
      await loadCollections();
    } finally {
      setTogglingCollection(null);
    }
  }

  async function handleCreateCollection() {
    const title = newCollection.trim();
    if (!token || !orgId || !title) return;
    setCreatingCollection(true);
    try {
      const result = await createCustomCollection(token, orgId, { title });
      if (result.collection) {
        setCollections((prev) => [...prev, result.collection]);
      }
      setNewCollection("");
      toast.success(`Đã tạo nhóm "${title}".`);
    } catch (createError) {
      toast.error(
        createError instanceof Error
          ? createError.message
          : "Không tạo được nhóm sản phẩm."
      );
    } finally {
      setCreatingCollection(false);
    }
  }

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

  const variant = selectedVariant;
  const tracking = Boolean(variant?.inventory_management);
  const available = variant?.inventory_advance?.qty_available;
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
            <Frame title="Chi tiết biến thể" icon="pi-tags">
              <VariantPicker
                product={product}
                onImageChange={setMainImage}
                onVariantChange={handleVariantChange}
              />
            </Frame>

            <Frame title="Quản lý tồn kho" icon="pi-box">
              {variant ? (
                <div className="divide-y divide-[#f2f3ef] dark:divide-[#30342e]">
                  <InfoRow label="SKU" value={variant.sku || "—"} />
                  <InfoRow label="Barcode" value={variant.barcode || "—"} />
                  <InfoRow
                    label="Theo dõi tồn kho"
                    value={
                      tracking ? (
                        <span className="text-[#26733c] dark:text-[#c4dfa9]">Có</span>
                      ) : (
                        <span className="text-[#969b91]">Không</span>
                      )
                    }
                  />
                  <InfoRow
                    label="Tồn kho khả dụng"
                    value={
                      tracking ? (
                        <span className="tabular-nums">
                          {available ?? variant.inventory_quantity ?? 0}
                        </span>
                      ) : (
                        "Không theo dõi"
                      )
                    }
                  />
                  {tracking && locations.length > 0 ? (
                    <div className="border-b border-[#f2f3ef] py-2.5 text-sm last:border-0 dark:border-[#30342e]">
                      <span className="block text-[#858a80] dark:text-[#aeb4a8]">
                        Kho hàng
                      </span>
                      <ul className="mt-2 space-y-2">
                        {locations.map((location) => (
                          <li
                            key={location.id}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">
                                {location.name || `Kho #${location.id}`}
                              </span>
                              <span className="block truncate text-xs font-normal text-[#858a80]">
                                {locationAddress(location) || "Chưa có địa chỉ"}
                              </span>
                            </span>
                            <span className="shrink-0 rounded-lg bg-[#f1f3ef] px-2.5 py-1 text-xs font-bold tabular-nums dark:bg-[#30342e]">
                              {locationQty[location.id] ?? 0}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <InfoRow label="Kho hàng" value="—" />
                  )}
                  <InfoRow
                    label="Tồn đầu kỳ"
                    value={
                      tracking ? (
                        <span className="tabular-nums">
                          {variant.inventory_quantity ?? 0}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <InfoRow
                    label="Khi hết hàng"
                    value={
                      !tracking
                        ? "—"
                        : variant.inventory_policy === "continue"
                          ? "Cho phép đặt hàng"
                          : "Từ chối đặt hàng"
                    }
                  />
                </div>
              ) : (
                <p className="text-sm text-[#858a80]">Chưa chọn biến thể.</p>
              )}
            </Frame>
          </div>

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

          <Frame title="Nhóm sản phẩm" icon="pi-folder">
            <p className="text-sm text-[#858a80] dark:text-[#aeb4a8]">
              Chọn nhóm để gán sản phẩm này vào. Một sản phẩm có thể thuộc
              nhiều nhóm.
            </p>

            <div className="mt-3 space-y-2">
              {collectionsLoading ? (
                <p className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#d8ddd3] px-4 py-3 text-sm text-[#858a80] dark:border-[#40453b]">
                  <i className="pi pi-spin pi-spinner" aria-hidden="true" />
                  Đang tải danh sách nhóm...
                </p>
              ) : collections.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#d8ddd3] px-4 py-3 text-sm text-[#858a80] dark:border-[#40453b]">
                  Chưa có nhóm sản phẩm nào. Tạo nhóm mới ở bên dưới.
                </p>
              ) : (
                collections.map((collection) => {
                  const checked = collects.some(
                    (item) => item.collection_id === collection.id
                  );
                  const busy = togglingCollection === collection.id;
                  return (
                    <label
                      key={collection.id}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#e5e7df] bg-white px-4 py-3 hover:border-[#c6d4bf] dark:border-[#40453b] dark:bg-[#191c18] dark:hover:border-[#527b49]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={busy}
                          onChange={() => void toggleCollection(collection)}
                          className="h-4 w-4 shrink-0 accent-[#527b49]"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {collection.title || `Nhóm #${collection.id}`}
                          </span>
                          <span className="block truncate text-xs text-[#858a80]">
                            {collection.handle ? `/${collection.handle} — ` : ""}
                            {collection.products_count ?? 0} sản phẩm
                          </span>
                        </span>
                      </span>
                      {busy ? (
                        <i
                          className="pi pi-spin pi-spinner text-[#71836a]"
                          aria-hidden="true"
                        />
                      ) : checked ? (
                        <span className="shrink-0 rounded-full bg-[#eef2ee] px-2.5 py-0.5 text-[11px] font-bold text-[#26733c] dark:bg-[#30392c] dark:text-[#c4dfa9]">
                          Đang gán
                        </span>
                      ) : null}
                    </label>
                  );
                })
              )}
            </div>

            <form
              className="mt-4 flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateCollection();
              }}
            >
              <input
                type="text"
                value={newCollection}
                onChange={(event) => setNewCollection(event.target.value)}
                placeholder="Tên nhóm mới, ví dụ: Áo hè"
                className="h-11 min-w-0 flex-1 rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]"
              />
              <button
                type="submit"
                disabled={creatingCollection || !newCollection.trim()}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#527b49] px-4 text-sm font-bold text-white hover:bg-[#41643a] disabled:cursor-wait disabled:opacity-60"
              >
                {creatingCollection && (
                  <i className="pi pi-spin pi-spinner" aria-hidden="true" />
                )}
                Tạo nhóm
              </button>
            </form>
          </Frame>

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
