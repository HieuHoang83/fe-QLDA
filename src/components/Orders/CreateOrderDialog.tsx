"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createCustomer,
  HaravanCustomer,
  listCustomers,
  searchCustomers,
} from "@/services/api/customers";
import { confirmOrder, createOrder, CreateOrderInput, getOrderDetails, OrderRecord, parseJobResult } from "@/services/api/orders";
import { watchJob } from "@/services/api/job-watch";
import { HaravanProduct, HaravanProductVariant, listProducts } from "@/services/api/products";
import { firstImage, formatMoney, isOutOfStock, variantLabel, variantStock } from "@/lib/haravan-format";

type OrderLineDraft =
  | { kind: "variant"; productId: number; variantId: number; quantity: number }
  | { kind: "custom"; title: string; price: number; quantity: number };

interface ShippingForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  note: string;
}

type PromotionDraft = {
  mode: "code" | "custom";
  code: string;
  discountType: "fixed" | "percentage";
  value: string;
  reason: string;
  loyalty: boolean;
};

const emptyPromotion: PromotionDraft = { mode: "code", code: "", discountType: "fixed", value: "", reason: "", loyalty: true };

const inputClass = "h-10 w-full rounded-lg border border-[#dce1e8] bg-white px-3 text-sm text-[#202735] outline-none transition placeholder:text-[#9aa3b2] focus:border-[#5687e8] focus:ring-2 focus:ring-[#5687e8]/15 dark:border-[#40453b] dark:bg-[#191c18] dark:text-[#f4f5ef]";
const initialShipping: ShippingForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  note: "",
};

function displayCustomer(customer: HaravanCustomer) {
  return [customer.last_name, customer.first_name].filter(Boolean).join(" ").trim()
    || customer.default_address?.name
    || customer.email
    || customer.phone
    || `Khách hàng #${customer.id}`;
}

function matchesProduct(product: HaravanProduct, query: string) {
  const term = query.trim().toLocaleLowerCase("vi");
  if (!term) return true;
  return [
    product.title,
    product.vendor,
    ...(product.variants ?? []).flatMap((variant) => [
      variant.title,
      variant.sku,
      variant.barcode,
      variant.option1,
      variant.option2,
      variant.option3,
    ]),
  ].some((value) => value?.toLocaleLowerCase("vi").includes(term));
}

export default function CreateOrderDialog({
  token,
  orgId,
  onClose,
  onCreated,
}: {
  token: string;
  orgId: string;
  onClose: () => void;
  onCreated: (order: OrderRecord) => void;
}) {
  const [products, setProducts] = useState<HaravanProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState("");
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [customProductOpen, setCustomProductOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQuantity, setCustomQuantity] = useState("1");
  const [productSearch, setProductSearch] = useState("");
  const [expandedProducts, setExpandedProducts] = useState<number[]>([]);
  const [lines, setLines] = useState<OrderLineDraft[]>([]);
  const [customer, setCustomer] = useState<HaravanCustomer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<HaravanCustomer[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<HaravanCustomer[]>([]);
  const [loadingRecentCustomers, setLoadingRecentCustomers] = useState(true);
  const [hasSearchedCustomers, setHasSearchedCustomers] = useState(false);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [customerSearchError, setCustomerSearchError] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState(false);
  const [customerSaving, setCustomerSaving] = useState(false);
  const [shipping, setShipping] = useState<ShippingForm>(initialShipping);
  const [submitting, setSubmitting] = useState(false);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [promotion, setPromotion] = useState<PromotionDraft | null>(null);
  const [promotionDraft, setPromotionDraft] = useState<PromotionDraft>(emptyPromotion);
  const [orderConfirmOpen, setOrderConfirmOpen] = useState(false);
  const [confirmAfterCreate, setConfirmAfterCreate] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
  const [paymentMethod, setPaymentMethod] = useState("Thanh toán khi giao hàng (COD)");

  useEffect(() => {
    let active = true;
    void listProducts(token, orgId, { limit: 250, page: 1 })
      .then((result) => {
        if (active) setProducts(result.products ?? []);
      })
      .catch((error: unknown) => {
        if (active) setProductError(error instanceof Error ? error.message : "Không tải được sản phẩm.");
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, [orgId, token]);

  useEffect(() => {
    let active = true;
    setLoadingRecentCustomers(true);
    void listCustomers(token, orgId, {
      page: 1,
      limit: 8,
      order: "created_at desc",
    })
      .then((result) => {
        if (active) setRecentCustomers(result.customers ?? []);
      })
      .catch((error: unknown) => {
        if (active) {
          setCustomerSearchError(
            error instanceof Error ? error.message : "Không tải được khách hàng gần đây."
          );
        }
      })
      .finally(() => {
        if (active) setLoadingRecentCustomers(false);
      });
    return () => {
      active = false;
    };
  }, [orgId, token]);

  const productsById = useMemo(
    () => new Map(products.map((product) => [Number(product.id), product])),
    [products]
  );
  const selectedVariants = useMemo(() => {
    const selected = new Set(
      lines.flatMap((line) => line.kind === "variant" ? [line.variantId] : [])
    );
    return selected;
  }, [lines]);
  const visibleProducts = useMemo(
    () => products.filter((product) => matchesProduct(product, productSearch)),
    [products, productSearch]
  );
  const subtotal = lines.reduce((sum, line) => {
    if (line.kind === "custom") return sum + line.price * line.quantity;
    const variant = productsById.get(line.productId)?.variants?.find((item) => item.id === line.variantId);
    return sum + Number(variant?.price ?? 0) * line.quantity;
  }, 0);
  const promotionDiscount = promotion?.mode === "custom"
    ? Math.min(subtotal, Math.max(0, Math.round(promotion.discountType === "percentage"
      ? subtotal * (Number(promotion.value) || 0) / 100
      : Number(promotion.value) || 0)))
    : 0;

  function openPromotion() {
    setPromotionDraft(promotion ?? emptyPromotion);
    setPromotionOpen(true);
  }

  function savePromotion() {
    if (promotionDraft.mode === "code" && !promotionDraft.code.trim()) return toast.error("Nhập mã khuyến mãi.");
    if (promotionDraft.mode === "custom") {
      const value = Number(promotionDraft.value);
      if (!Number.isFinite(value) || value <= 0 || (promotionDraft.discountType === "percentage" && value > 100)) return toast.error("Nhập giá trị giảm hợp lệ.");
      if (!promotionDraft.reason.trim()) return toast.error("Nhập lý do giảm giá.");
    }
    setPromotion({ ...promotionDraft, code: promotionDraft.code.trim(), reason: promotionDraft.reason.trim() });
    setPromotionOpen(false);
  }

  function updateShipping(patch: Partial<ShippingForm>) {
    setShipping((current) => ({ ...current, ...patch }));
  }

  function toggleVariant(product: HaravanProduct, variant: HaravanProductVariant) {
    if (!product.id || !variant.id) return;
    if (isOutOfStock(variant) && !selectedVariants.has(variant.id)) return;
    setLines((current) => current.some((line) => line.kind === "variant" && line.variantId === variant.id)
      ? current.filter((line) => line.kind !== "variant" || line.variantId !== variant.id)
      : [...current, { kind: "variant", productId: product.id as number, variantId: variant.id as number, quantity: 1 }]);
  }

  function updateQuantity(variantId: number, quantity: number) {
    setLines((current) => current.map((line) => line.kind === "variant" && line.variantId === variantId ? { ...line, quantity } : line));
  }

  function addCustomProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = customTitle.trim();
    const price = Number(customPrice);
    const quantity = Number(customQuantity);
    if (!title || !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 1) {
      toast.error("Nhập tên, giá hợp lệ và số lượng lớn hơn 0.");
      return;
    }
    setLines((current) => [...current, { kind: "custom", title, price, quantity }]);
    setCustomTitle("");
    setCustomPrice("");
    setCustomQuantity("1");
    setCustomProductOpen(false);
  }

  async function handleCustomerSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = customerSearch.trim();
    if (!query) {
      setCustomerResults([]);
      setCustomerSearchError("Nhập tên, số điện thoại hoặc email để tìm khách hàng.");
      return;
    }
    setSearchingCustomers(true);
    setCustomerSearchError("");
    setHasSearchedCustomers(true);
    try {
      const result = await searchCustomers(token, orgId, { query, page: 1, limit: 10 });
      setCustomerResults(result.customers ?? []);
      if (!result.customers?.length) setCustomerSearchError("Không tìm thấy khách hàng phù hợp.");
    } catch (error) {
      setCustomerSearchError(error instanceof Error ? error.message : "Không tìm được khách hàng.");
    } finally {
      setSearchingCustomers(false);
    }
  }

  function selectCustomer(value: HaravanCustomer) {
    setCustomer(value);
    setCustomerResults([]);
    setCustomerSearch("");
    setCustomerSearchError("");
    setCreatingCustomer(false);
    const address = value.default_address;
    setShipping((current) => ({
      ...current,
      first_name: value.first_name ?? address?.first_name ?? "",
      last_name: value.last_name ?? address?.last_name ?? "",
      email: value.email ?? "",
      phone: value.phone ?? address?.phone ?? "",
    }));
  }

  async function handleCreateCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCustomerSaving(true);
    try {
      const result = await createCustomer(token, orgId, {
        first_name: shipping.first_name.trim(),
        last_name: shipping.last_name.trim(),
        phone: shipping.phone.trim(),
        email: shipping.email.trim() || undefined,
      });
      selectCustomer(result.customer);
      toast.success("Đã tạo và chọn khách hàng mới.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tạo được khách hàng.");
    } finally {
      setCustomerSaving(false);
    }
  }

  async function handleSubmit() {
    if (!lines.length) {
      toast.error("Hãy chọn ít nhất một biến thể sản phẩm.");
      return;
    }
    if (lines.some((line) => !Number.isInteger(line.quantity) || line.quantity < 1)) {
      toast.error("Số lượng sản phẩm phải lớn hơn 0.");
      return;
    }
    const exceedsStock = lines.some((line) => {
      if (line.kind === "custom") return false;
      const variant = productsById.get(line.productId)?.variants?.find((item) => item.id === line.variantId);
      const stock = variant ? variantStock(variant) : undefined;
      return Boolean(
        variant?.inventory_management &&
        variant.inventory_policy !== "continue" &&
        stock !== undefined &&
        line.quantity > stock
      );
    });
    if (exceedsStock) {
      toast.error("Số lượng vượt quá tồn kho khả dụng. Hãy kiểm tra lại biến thể đã chọn.");
      return;
    }
    let remainingDiscount = promotionDiscount;
    const discountBase = lines.map((line) => {
      if (line.kind === "custom") return line.price * line.quantity;
      const variant = productsById.get(line.productId)?.variants?.find((item) => item.id === line.variantId);
      return Number(variant?.price ?? 0) * line.quantity;
    });
    const body: CreateOrderInput = {
      line_items: lines.map((line, index) => {
        const item = line.kind === "custom"
          ? { title: line.title, price: line.price, quantity: line.quantity }
          : { variant_id: line.variantId, quantity: line.quantity };
        if (promotion?.mode !== "custom" || promotionDiscount <= 0) return item;
        const amount = index === lines.length - 1
          ? remainingDiscount
          : Math.min(remainingDiscount, Math.round(promotionDiscount * discountBase[index] / (subtotal || 1)));
        remainingDiscount -= amount;
        return amount > 0 ? { ...item, total_discount: amount, applied_discounts: [{ description: promotion.reason, amount }] } : item;
      }),
      ...(promotion?.mode === "code" ? { discount_codes: [{ code: promotion.code, is_coupon_code: true }] } : {}),
      ...(promotion?.mode === "custom" && promotionDiscount > 0 ? {
        discount_codes: [{ code: promotion.reason, amount: promotionDiscount, is_coupon_code: false }],
        total_discounts: promotionDiscount,
      } : {}),
      ...(promotion ? { note_attributes: [{ name: "loyalty_promotion", value: String(promotion.loyalty) }] } : {}),
      financial_status: paymentStatus,
      gateway: paymentMethod,
      is_cod_gateway: paymentMethod.toLocaleLowerCase("vi").includes("cod"),
      ...(customer?.id ? { customer_id: customer.id } : {}),
      email: shipping.email.trim() || undefined,
      phone: shipping.phone.trim() || undefined,
      first_name: shipping.first_name.trim() || undefined,
      last_name: shipping.last_name.trim() || undefined,
      note: shipping.note.trim() || undefined,
    };

    setSubmitting(true);
    try {
      // Tạo đơn chạy qua hàng đợi: nhận `jobId` trước, chờ Haravan trả kết quả rồi
      // mới đọc lại đơn vừa tạo.
      const created = await createOrder(token, orgId, body);
      setOrderConfirmOpen(false);
      const createJob = await watchJob(token, orgId, created, {
        pendingMessage: "Đã gửi yêu cầu tạo đơn lên Haravan; đang chờ Haravan xử lý…",
      });
      if (!createJob || createJob.status !== "completed") {
        return;
      }
      const createdOrderId = parseJobResult(createJob).haravanOrderId;
      if (!createdOrderId) return;
      const orderKey = { orgId: Number(orgId), haravanOrderId: createdOrderId };
      const order = (await getOrderDetails(token, orderKey)).order;
      if (confirmAfterCreate) {
        try {
          const confirmation = await confirmOrder(token, order, "Tạo đơn hàng");
          await watchJob(token, Number(orgId), confirmation, {
            pendingMessage: "Đã gửi yêu cầu xác nhận đơn; đang chờ Haravan xử lý…",
          });
        } catch {
          toast.warning("Đơn hàng đã được tạo, nhưng chưa gửi được yêu cầu xác nhận. Bạn có thể xác nhận lại trong danh sách đơn.");
        }
      }
      onCreated(order);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tạo được đơn hàng.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#f1f3f6] text-[#202735] dark:bg-[#151713] dark:text-[#f4f5ef]">
      <div className="mx-auto min-h-full w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex items-center gap-3">
          <button type="button" onClick={onClose} aria-label="Quay lại danh sách đơn hàng" className="grid h-10 w-10 place-items-center rounded-xl border border-[#dce1e8] bg-white text-[#687386] transition hover:bg-[#f8fafc] dark:border-[#40453b] dark:bg-[#20231f]">
            <i className="pi pi-arrow-left" aria-hidden="true" />
          </button>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#667085] dark:text-[#b3b9ad]">Shop {orgId}</p>
            <h1 className="text-2xl font-extrabold tracking-tight">Tạo đơn hàng</h1>
          </div>
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-[#e0e4ea] bg-white p-5 shadow-[0_2px_8px_rgba(25,40,65,0.035)] dark:border-[#363b31] dark:bg-[#20231f]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">Sản phẩm</h2>
                  <p className="mt-1 text-xs text-[#7b8494] dark:text-[#b3b9ad]">Chọn sản phẩm, sau đó đánh dấu các biến thể cần đặt.</p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => setCustomProductOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce1e8] bg-white px-3 text-sm font-semibold text-[#586477] transition hover:bg-[#f7f8fa] dark:border-[#40453b] dark:bg-[#191c18] dark:text-[#d3d8ce]"><i className="pi pi-pencil" aria-hidden="true" />Tạo sản phẩm tùy ý</button>
                  <button type="button" onClick={() => setProductPickerOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd8f4] bg-[#f5f8ff] px-3 text-sm font-bold text-[#356bd6] transition hover:bg-[#eaf1ff] dark:border-[#3d5174] dark:bg-[#202a3a] dark:text-[#a9c4ff]"><i className="pi pi-plus" aria-hidden="true" />Chọn sản phẩm</button>
                </div>
              </div>
              {loadingProducts ? <p className="rounded-xl bg-[#f7f8fa] p-4 text-sm text-[#778195]">Đang tải danh sách sản phẩm…</p> : productError ? <p role="alert" className="rounded-xl bg-[#fff2ef] p-4 text-sm text-[#a34234]">{productError}</p> : lines.length === 0 ? (
                <button type="button" onClick={() => setProductPickerOpen(true)} className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#cfd6e0] bg-[#fafbfc] text-sm text-[#788397] transition hover:border-[#6d95e8] hover:bg-[#f6f9ff] dark:border-[#444a3f] dark:bg-[#191c18]">
                  <i className="pi pi-shopping-bag text-xl" aria-hidden="true" /> Chưa có sản phẩm. Nhấn để chọn sản phẩm.
                </button>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#e6e9ef] dark:border-[#363b31]">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-[#f7f8fa] text-xs uppercase tracking-wide text-[#778195] dark:bg-[#191c18] dark:text-[#b3b9ad]"><tr><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3">Giá</th><th className="w-28 px-4 py-3">Số lượng</th><th className="px-4 py-3 text-right">Thành tiền</th><th className="w-10" /></tr></thead>
                    <tbody className="divide-y divide-[#edf0f4] dark:divide-[#363b31]">
                      {lines.map((line, lineIndex) => {
                        if (line.kind === "custom") {
                          return <tr key={`custom-${lineIndex}`}>
                            <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-lg bg-[#f1f3f6] text-[#8993a3]"><i className="pi pi-pencil" /></span><span className="min-w-0"><span className="block truncate font-semibold">{line.title}</span><span className="mt-0.5 block text-xs text-[#7b8494]">Sản phẩm tùy ý · không SKU/barcode</span></span></div></td>
                            <td className="whitespace-nowrap px-4 py-3"><input aria-label={`Đơn giá ${line.title}`} type="number" min={0} step="0.01" value={line.price} onChange={(event) => setLines((current) => current.map((item, index) => index === lineIndex && item.kind === "custom" ? { ...item, price: Number(event.target.value) } : item))} className="h-9 w-32 rounded-lg border border-[#dce1e8] px-2 text-right outline-none focus:border-[#5687e8] dark:border-[#40453b] dark:bg-[#191c18]" /></td>
                            <td className="px-4 py-3"><input aria-label={`Số lượng ${line.title}`} type="number" min={1} step={1} value={line.quantity} onChange={(event) => setLines((current) => current.map((item, index) => index === lineIndex && item.kind === "custom" ? { ...item, quantity: Number(event.target.value) } : item))} className="h-9 w-20 rounded-lg border border-[#dce1e8] px-2 text-center outline-none focus:border-[#5687e8] dark:border-[#40453b] dark:bg-[#191c18]" /></td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{formatMoney(line.price * line.quantity)}</td>
                            <td className="px-2"><button type="button" aria-label="Bỏ sản phẩm tùy ý" onClick={() => setLines((current) => current.filter((_, index) => index !== lineIndex))} className="grid h-8 w-8 place-items-center rounded-lg text-[#8a94a4] hover:bg-[#fff0ee] hover:text-[#a34234]"><i className="pi pi-trash" /></button></td>
                          </tr>;
                        }
                        const product = productsById.get(line.productId);
                        const variant = product?.variants?.find((item) => item.id === line.variantId);
                        if (!product || !variant) return null;
                        return <tr key={`variant-${line.variantId}`}>
                          <td className="px-4 py-3"><div className="flex items-center gap-3">
                            {firstImage(product.images) ? <img src={firstImage(product.images)} alt="" className="h-11 w-11 rounded-lg border border-[#e5e8ed] object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#f1f3f6] text-[#8993a3]"><i className="pi pi-image" /></span>}
                            <span className="min-w-0"><span className="block truncate font-semibold">{product.title}</span><span className="mt-0.5 block text-xs text-[#7b8494]">{variantLabel(variant)}{variant.sku ? ` · ${variant.sku}` : ""}</span></span>
                          </div></td>
                          <td className="whitespace-nowrap px-4 py-3">{formatMoney(variant.price)}</td>
                          <td className="px-4 py-3"><input aria-label={`Số lượng ${variantLabel(variant)}`} type="number" min={1} max={variant.inventory_management && variant.inventory_policy !== "continue" ? variantStock(variant) : undefined} step={1} value={line.quantity} onChange={(event) => updateQuantity(line.variantId, Number(event.target.value))} className="h-9 w-20 rounded-lg border border-[#dce1e8] px-2 text-center outline-none focus:border-[#5687e8] dark:border-[#40453b] dark:bg-[#191c18]" /></td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{formatMoney(Number(variant.price ?? 0) * line.quantity)}</td>
                          <td className="px-2"><button type="button" aria-label="Bỏ sản phẩm" onClick={() => setLines((current) => current.filter((item) => item.kind !== "variant" || item.variantId !== line.variantId))} className="grid h-8 w-8 place-items-center rounded-lg text-[#8a94a4] hover:bg-[#fff0ee] hover:text-[#a34234]"><i className="pi pi-trash" /></button></td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[#e0e4ea] bg-white p-5 shadow-[0_2px_8px_rgba(25,40,65,0.035)] dark:border-[#363b31] dark:bg-[#20231f]">
              <h2 className="font-bold">Thanh toán</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between text-[#687386]"><span>Tiền hàng ({lines.reduce((sum, line) => sum + line.quantity, 0)} sản phẩm)</span><span>{formatMoney(subtotal)}</span></div>
                {promotion ? <div className="flex items-center justify-between text-[#356bd6]"><button type="button" onClick={openPromotion} className="hover:underline">{promotion.mode === "code" ? `Mã khuyến mãi: ${promotion.code}` : promotion.reason}</button><span className="flex items-center gap-2">{promotionDiscount ? `-${formatMoney(promotionDiscount)}` : "Haravan áp dụng"}<button type="button" aria-label="Xóa khuyến mãi" onClick={() => setPromotion(null)} className="text-[#8993a3] hover:text-[#a34234]">×</button></span></div> : <button type="button" onClick={openPromotion} className="text-[#356bd6] hover:underline">Thêm khuyến mãi</button>}
                <div className="flex justify-between text-[#687386]"><span>Phí vận chuyển</span><span className="text-[#9aa3b2]">Tính theo cấu hình Haravan</span></div>
                <div className="flex justify-between border-t border-[#e8ebf0] pt-3 text-base font-extrabold dark:border-[#363b31]"><span>Tạm tính</span><span>{formatMoney(subtotal - promotionDiscount)}</span></div>
              </div>
              <p className="mt-3 text-xs leading-5 text-[#838c9b]">Đơn tạo qua API không thực hiện thanh toán. Haravan sẽ tính các khoản phí và trạng thái đơn theo cấu hình shop.</p>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-[#e0e4ea] bg-white p-5 shadow-[0_2px_8px_rgba(25,40,65,0.035)] dark:border-[#363b31] dark:bg-[#20231f]">
              <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-bold">Khách hàng</h2>{customer && <button type="button" onClick={() => { setCustomer(null); setShipping(initialShipping); }} className="text-xs font-semibold text-[#5680d4] hover:underline">Đổi khách</button>}</div>
              {customer ? <div className="rounded-xl border border-[#dce8dc] bg-[#f7fbf6] p-4 dark:border-[#3b4a37] dark:bg-[#1c241a]">
                <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e5f0e1] font-bold text-[#527b49]">{displayCustomer(customer).slice(0, 1).toLocaleUpperCase()}</span><div className="min-w-0"><p className="truncate font-bold">{displayCustomer(customer)}</p><p className="mt-1 text-sm text-[#737d70]">{customer.phone || "Chưa có số điện thoại"}</p><p className="text-sm text-[#737d70]">{customer.email || "Chưa có email"}</p><p className="mt-2 text-xs text-[#858a80]">{customer.orders_count ?? 0} đơn cũ</p></div></div>
              </div> : <>
                <form onSubmit={handleCustomerSearch} className="flex gap-2"><label className="relative min-w-0 flex-1"><span className="sr-only">Tìm khách hàng</span><i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8993a3]" /><input value={customerSearch} onChange={(event) => { setCustomerSearch(event.target.value); setCustomerResults([]); setHasSearchedCustomers(false); setCustomerSearchError(""); }} placeholder="Tên, số điện thoại hoặc email" className={`${inputClass} pl-9`} /></label><button type="submit" disabled={searchingCustomers} className="h-10 shrink-0 rounded-lg border border-[#dce1e8] px-3 text-sm font-semibold hover:bg-[#f7f8fa] disabled:opacity-50 dark:border-[#40453b]">{searchingCustomers ? <i className="pi pi-spin pi-spinner" /> : "Tìm"}</button></form>
                {customerSearchError && <p className="mt-2 text-xs text-[#7b8494]">{customerSearchError}</p>}
                {(() => {
                  const suggestions = hasSearchedCustomers ? customerResults : recentCustomers;
                  if (!hasSearchedCustomers && loadingRecentCustomers) {
                    return <p className="mt-3 text-xs text-[#7b8494]">Đang tải khách hàng gần đây…</p>;
                  }
                  if (!suggestions.length) return null;
                  return <div className="mt-3 overflow-hidden rounded-xl border border-[#e6e9ef] dark:border-[#363b31]">
                    <p className="border-b border-[#edf0f4] bg-[#f7f8fa] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[#778195] dark:border-[#363b31] dark:bg-[#191c18]">{hasSearchedCustomers ? "Kết quả tìm kiếm" : "Khách hàng gần đây"}</p>
                    <div className="max-h-56 overflow-y-auto">{suggestions.map((item) => <button key={item.id} type="button" onClick={() => selectCustomer(item)} className="flex w-full items-center justify-between gap-2 border-b border-[#edf0f4] px-3 py-2.5 text-left last:border-0 hover:bg-[#f7f9fc] dark:border-[#363b31] dark:hover:bg-[#30342e]"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{displayCustomer(item)}</span><span className="text-xs text-[#7b8494]">{item.phone || item.email || "Chưa có thông tin liên hệ"}</span></span><span className="shrink-0 text-right text-[11px] text-[#8993a3]">{item.orders_count ?? 0} đơn</span><i className="pi pi-angle-right text-[#9aa3b2]" /></button>)}</div>
                  </div>;
                })()}
                <button type="button" onClick={() => { setCreatingCustomer(true); setCustomerResults([]); }} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#356bd6] hover:underline"><i className="pi pi-user-plus" /> Tạo khách hàng mới</button>
              </>}
            </section>

            <section className="rounded-2xl border border-[#e0e4ea] bg-white p-5 shadow-[0_2px_8px_rgba(25,40,65,0.035)] dark:border-[#363b31] dark:bg-[#20231f]">
              <h2 className="font-bold">Ghi chú</h2>
              <textarea rows={3} value={shipping.note} onChange={(event) => updateShipping({ note: event.target.value })} className="mt-3 w-full resize-y rounded-lg border border-[#dce1e8] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#9aa3b2] focus:border-[#5687e8] dark:border-[#40453b] dark:bg-[#191c18]" placeholder="Nhập ghi chú cho đơn hàng" />
            </section>

            <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="h-11 rounded-xl border border-[#dce1e8] bg-white px-4 text-sm font-semibold text-[#657084] hover:bg-[#f7f8fa] dark:border-[#40453b] dark:bg-[#20231f]">Hủy</button><button type="button" onClick={() => setOrderConfirmOpen(true)} disabled={submitting || !lines.length} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#527b49] px-5 text-sm font-bold text-white transition hover:bg-[#41643a] disabled:cursor-not-allowed disabled:opacity-50">Tạo đơn hàng</button></div>
          </aside>
        </div>
      </div>

      {orderConfirmOpen && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setOrderConfirmOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="create-order-confirm-title" className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#20231f]">
          <header className="flex items-center justify-between border-b border-[#e6e9ef] px-5 py-4 dark:border-[#363b31]"><h2 id="create-order-confirm-title" className="text-lg font-bold">Tạo đơn hàng</h2><button type="button" disabled={submitting} onClick={() => setOrderConfirmOpen(false)} aria-label="Đóng" className="grid h-8 w-8 place-items-center rounded-lg text-[#8993a3] hover:bg-[#f3f5f8] disabled:opacity-50"><i className="pi pi-times" /></button></header>
          <div className="bg-[#f1f3f6] p-5 dark:bg-[#191c18]"><section className="space-y-4 rounded-2xl bg-white p-5 dark:bg-[#20231f]"><h3 className="font-bold">Đánh dấu đơn hàng</h3>
            <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setPaymentStatus("pending")} className={`flex h-14 items-center justify-between rounded-xl border px-4 text-left ${paymentStatus === "pending" ? "border-[#2864eb] bg-[#f8faff] text-[#2864eb]" : "border-[#dce1e8] text-[#596477]"}`}><span className="flex items-center gap-3"><i className="pi pi-credit-card" />Thanh toán sau</span><i className={`pi ${paymentStatus === "pending" ? "pi-check-circle" : "pi-circle"}`} /></button><button type="button" onClick={() => setPaymentStatus("paid")} className={`flex h-14 items-center justify-between rounded-xl border px-4 text-left ${paymentStatus === "paid" ? "border-[#2864eb] bg-[#f8faff] text-[#2864eb]" : "border-[#dce1e8] text-[#596477]"}`}><span className="flex items-center gap-3"><i className="pi pi-wallet" />Đã thanh toán</span><i className={`pi ${paymentStatus === "paid" ? "pi-check-circle" : "pi-circle"}`} /></button></div>
            <label className="block"><span className="mb-1.5 block">Phương thức thanh toán</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className={inputClass}><option>Thanh toán khi giao hàng (COD)</option><option>Tiền mặt</option><option>Chuyển khoản ngân hàng</option></select></label>
            <div className="flex justify-between"><span>{paymentStatus === "pending" ? "Chờ thanh toán" : "Đã thanh toán"}</span><strong>{formatMoney(Math.max(0, subtotal - promotionDiscount))}</strong></div>
          </section></div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6e9ef] px-5 py-4 dark:border-[#363b31]"><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={confirmAfterCreate} onChange={(event) => setConfirmAfterCreate(event.target.checked)} className="h-5 w-5 accent-[#2864eb]" />Xác thực đơn hàng</label><div className="flex gap-2"><button type="button" disabled={submitting} onClick={() => setOrderConfirmOpen(false)} className="h-10 rounded-lg border border-[#dce1e8] px-4 text-sm font-semibold disabled:opacity-50">Hủy</button><button type="button" disabled={submitting} onClick={() => void handleSubmit()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2864eb] px-4 text-sm font-bold text-white disabled:opacity-50">{submitting && <i className="pi pi-spin pi-spinner" />}{submitting ? "Đang tạo đơn…" : "Tạo đơn hàng"}</button></div></footer>
        </section>
      </div>}

      {creatingCustomer && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreatingCustomer(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="new-customer-title" className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#dfe4eb] bg-white shadow-2xl dark:border-[#363b31] dark:bg-[#20231f]">
          <header className="flex items-start justify-between gap-4 border-b border-[#e6e9ef] px-6 py-4 dark:border-[#363b31]"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#71836a]">Tạo khách hàng mới</p><h2 id="new-customer-title" className="mt-1 text-xl font-extrabold">Thông tin khách mới</h2></div><button type="button" onClick={() => setCreatingCustomer(false)} aria-label="Đóng" className="grid h-9 w-9 place-items-center rounded-full text-[#687386] hover:bg-[#f1f3ee]"><i className="pi pi-times" aria-hidden="true" /></button></header>
          <form onSubmit={handleCreateCustomer} className="space-y-4 px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-sm font-semibold">Họ</span><input value={shipping.last_name} onChange={(event) => updateShipping({ last_name: event.target.value })} className={inputClass} placeholder="Họ" /></label><label className="block"><span className="mb-1.5 block text-sm font-semibold">Tên</span><input value={shipping.first_name} onChange={(event) => updateShipping({ first_name: event.target.value })} className={inputClass} placeholder="Tên" /></label></div>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold">Số điện thoại <span className="text-[#bd4b3b]">*</span></span><input required type="tel" value={shipping.phone} onChange={(event) => updateShipping({ phone: event.target.value })} className={inputClass} placeholder="Số điện thoại" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold">Email</span><input type="email" value={shipping.email} onChange={(event) => updateShipping({ email: event.target.value })} className={inputClass} placeholder="Không bắt buộc" /></label>
            <footer className="flex justify-end gap-2 border-t border-[#edf0f4] pt-4 dark:border-[#363b31]"><button type="button" onClick={() => setCreatingCustomer(false)} className="h-10 rounded-lg border border-[#dce1e8] px-4 text-sm font-semibold">Hủy</button><button type="submit" disabled={customerSaving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#527b49] px-4 text-sm font-bold text-white disabled:opacity-50">{customerSaving && <i className="pi pi-spin pi-spinner" />}{customerSaving ? "Đang tạo…" : "Tạo và chọn khách"}</button></footer>
          </form>
        </section>
      </div>}

      {promotionOpen && <div className="fixed inset-0 z-[100] grid place-items-center bg-[#151a23]/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPromotionOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="promotion-title" className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#dfe4eb] bg-white shadow-2xl dark:border-[#363b31] dark:bg-[#20231f]">
          <header className="border-b border-[#e6e9ef] px-5 py-4 dark:border-[#363b31]"><h2 id="promotion-title" className="text-lg font-bold">Thêm khuyến mãi</h2></header>
          <div className="space-y-4 p-5 text-sm">
            <label className="flex cursor-pointer items-center gap-3"><input type="radio" checked={promotionDraft.mode === "code"} onChange={() => setPromotionDraft((current) => ({ ...current, mode: "code" }))} className="h-5 w-5 accent-[#2864eb]" />Nhập mã khuyến mãi</label>
            {promotionDraft.mode === "code" && <input value={promotionDraft.code} onChange={(event) => setPromotionDraft((current) => ({ ...current, code: event.target.value }))} className={inputClass} placeholder="Nhập mã khuyến mãi" />}
            <label className="flex cursor-pointer items-center gap-3"><input type="radio" checked={promotionDraft.mode === "custom"} onChange={() => setPromotionDraft((current) => ({ ...current, mode: "custom" }))} className="h-5 w-5 accent-[#2864eb]" />Nhập khuyến mãi tùy ý</label>
            {promotionDraft.mode === "custom" && <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block">Loại giảm giá</span><select value={promotionDraft.discountType} onChange={(event) => setPromotionDraft((current) => ({ ...current, discountType: event.target.value as "fixed" | "percentage" }))} className={inputClass}><option value="fixed">Giảm tiền</option><option value="percentage">Giảm phần trăm</option></select></label><label className="block"><span className="mb-1 block">Giá trị</span><span className="relative block"><input type="number" min="0" max={promotionDraft.discountType === "percentage" ? 100 : undefined} step="any" value={promotionDraft.value} onChange={(event) => setPromotionDraft((current) => ({ ...current, value: event.target.value }))} className={`${inputClass} pr-10`} placeholder="0" /><span className="absolute right-3 top-2.5 text-[#687386]">{promotionDraft.discountType === "fixed" ? "₫" : "%"}</span></span></label></div>
              <label className="block"><span className="mb-1 block">Lý do giảm giá</span><input value={promotionDraft.reason} onChange={(event) => setPromotionDraft((current) => ({ ...current, reason: event.target.value }))} className={inputClass} /></label><p className="text-xs text-[#7b8494]">Khách hàng có thể thấy lý do giảm giá.</p>
            </div>}
            <hr className="border-[#e6e9ef] dark:border-[#363b31]" />
            <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={promotionDraft.loyalty} onChange={(event) => setPromotionDraft((current) => ({ ...current, loyalty: event.target.checked }))} className="h-5 w-5 accent-[#2864eb]" />Dùng khuyến mãi cho khách hàng thân thiết</label>
          </div>
          <footer className="flex items-center justify-between border-t border-[#e6e9ef] px-5 py-4 dark:border-[#363b31]"><button type="button" disabled={!promotion} onClick={() => { setPromotion(null); setPromotionOpen(false); }} className="h-10 rounded-lg bg-[#f1f3f6] px-3 text-sm font-semibold text-[#9aa3b2] disabled:cursor-not-allowed">Xóa khuyến mãi</button><div className="flex gap-2"><button type="button" onClick={() => setPromotionOpen(false)} className="h-10 rounded-lg border border-[#dce1e8] px-4 text-sm font-semibold">Hủy</button><button type="button" onClick={savePromotion} className="h-10 rounded-lg bg-[#2864eb] px-4 text-sm font-bold text-white">Lưu</button></div></footer>
        </section>
      </div>}

      {customProductOpen && <div className="fixed inset-0 z-[95] grid place-items-center bg-[#151a23]/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCustomProductOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="custom-product-title" className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#dfe4eb] bg-white shadow-2xl dark:border-[#363b31] dark:bg-[#20231f]">
          <header className="flex items-start justify-between border-b border-[#e6e9ef] px-5 py-4 dark:border-[#363b31]"><div><h2 id="custom-product-title" className="text-lg font-extrabold">Tạo sản phẩm tùy ý</h2><p className="mt-1 text-xs text-[#7b8494]">Chỉ thêm vào đơn hàng hiện tại, không tạo sản phẩm trong danh mục.</p></div><button type="button" onClick={() => setCustomProductOpen(false)} aria-label="Đóng" className="grid h-9 w-9 place-items-center rounded-lg text-[#8d97a7] hover:bg-[#f3f5f8]"><i className="pi pi-times" /></button></header>
          <form onSubmit={addCustomProduct} className="space-y-4 p-5">
            <label className="block"><span className="mb-1.5 block text-sm font-semibold">Tên sản phẩm <span className="text-[#bd4b3b]">*</span></span><input autoFocus required maxLength={255} value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} className={inputClass} placeholder="Ví dụ: Phí đóng gói đặc biệt" /></label>
            <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-sm font-semibold">Đơn giá (₫) <span className="text-[#bd4b3b]">*</span></span><input required type="number" min={0} step="0.01" value={customPrice} onChange={(event) => setCustomPrice(event.target.value)} className={inputClass} placeholder="0" /></label><label className="block"><span className="mb-1.5 block text-sm font-semibold">Số lượng</span><input required type="number" min={1} step={1} value={customQuantity} onChange={(event) => setCustomQuantity(event.target.value)} className={inputClass} /></label></div>
            <p className="rounded-lg bg-[#f7f8fa] px-3 py-2 text-xs leading-5 text-[#778195] dark:bg-[#191c18]">Dòng hàng tùy ý được gửi với tên, giá và số lượng. SKU và barcode sẽ không được gửi.</p>
            <footer className="flex justify-end gap-2 border-t border-[#edf0f4] pt-4 dark:border-[#363b31]"><button type="button" onClick={() => setCustomProductOpen(false)} className="h-10 rounded-lg border border-[#dce1e8] px-4 text-sm font-semibold dark:border-[#40453b]">Hủy</button><button type="submit" className="h-10 rounded-lg bg-[#527b49] px-4 text-sm font-bold text-white hover:bg-[#41643a]">Thêm vào đơn</button></footer>
          </form>
        </section>
      </div>}

      {productPickerOpen && <div className="fixed inset-0 z-[90] grid place-items-center bg-[#151a23]/50 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProductPickerOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="product-picker-title" className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#dfe4eb] bg-white shadow-2xl dark:border-[#363b31] dark:bg-[#20231f]">
          <header className="flex items-center justify-between border-b border-[#e6e9ef] px-5 py-4 dark:border-[#363b31]"><div><h2 id="product-picker-title" className="text-xl font-extrabold">Tất cả sản phẩm</h2><p className="mt-0.5 text-xs text-[#7b8494]">Đã chọn {lines.length} biến thể</p></div><button type="button" onClick={() => setProductPickerOpen(false)} aria-label="Đóng" className="grid h-9 w-9 place-items-center rounded-lg text-[#8d97a7] hover:bg-[#f3f5f8]"><i className="pi pi-times text-lg" /></button></header>
          <label className="relative m-4 mb-3 block"><i className="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-[#647084]" /><input autoFocus value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Tìm theo tên sản phẩm, biến thể, SKU, Barcode" className="h-11 w-full rounded-xl border border-[#c8d8fa] bg-white pl-11 pr-4 text-sm outline-none focus:border-[#5687e8] focus:ring-2 focus:ring-[#5687e8]/15 dark:border-[#40453b] dark:bg-[#191c18]" /></label>
          <div className="grid grid-cols-[minmax(0,1fr)_100px_130px_100px] gap-3 bg-[#f1f3f6] px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#687386] dark:bg-[#191c18]"><span>Sản phẩm / biến thể</span><span>SKU</span><span className="text-right">Giá bán</span><span className="text-right">Tồn kho</span></div>
          <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-[#e8ebf0] dark:divide-[#363b31]">
            {visibleProducts.map((product) => {
              const productId = Number(product.id);
              const isExpanded = expandedProducts.includes(productId);
              const variants = product.variants ?? [];
              const image = firstImage(product.images);
              return <div key={product.id}>
                <button type="button" onClick={() => setExpandedProducts((current) => isExpanded ? current.filter((id) => id !== productId) : [...current, productId])} className="grid w-full grid-cols-[minmax(0,1fr)_100px_130px_100px] items-center gap-3 px-5 py-3 text-left transition hover:bg-[#f8f9fb] dark:hover:bg-[#30342e]"><span className="flex min-w-0 items-center gap-3"><i className={`pi ${isExpanded ? "pi-chevron-down" : "pi-chevron-right"} text-xs text-[#8a94a4]`} /><span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#e4e8ee] bg-[#f7f8fa] dark:border-[#40453b]">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <i className="pi pi-image text-[#9aa3b2]" />}</span><span className="truncate font-semibold">{product.title ?? `Sản phẩm ${product.id}`}</span></span><span className="text-xs text-[#8993a3]">{product.vendor ?? ""}</span><span className="text-right text-sm">{formatMoney(product.variants?.[0]?.price)}</span><span className="text-right text-sm text-[#687386]">{product.variants?.reduce((sum, item) => sum + Number(item.inventory_quantity ?? 0), 0) ?? "—"}</span></button>
                {isExpanded && variants.map((variant) => {
                  const checked = selectedVariants.has(Number(variant.id));
                  const stock = variantStock(variant);
                  const unavailable = isOutOfStock(variant);
                  const tracked = Boolean(variant.inventory_management);
                  return <label key={variant.id} className={`grid grid-cols-[minmax(0,1fr)_100px_130px_100px] items-center gap-3 border-t border-[#edf0f4] bg-[#fbfcfd] px-5 py-2.5 text-sm transition dark:border-[#363b31] dark:bg-[#191c18] ${unavailable && !checked ? "cursor-not-allowed opacity-55" : "cursor-pointer hover:bg-[#f4f7fc] dark:hover:bg-[#252a22]"}`}><span className="flex min-w-0 items-center gap-3 pl-8"><input type="checkbox" checked={checked} disabled={unavailable && !checked} onChange={() => toggleVariant(product, variant)} className="h-4 w-4 accent-[#527b49]" /><span className="truncate">{variantLabel(variant)}{tracked && variant.inventory_policy === "continue" && stock !== undefined && stock <= 0 && <span className="ml-2 text-[11px] font-semibold text-[#a36a20]">Cho phép bán tiếp</span>}</span></span><span className="truncate text-xs text-[#687386]">{variant.sku || "—"}</span><span className="text-right">{formatMoney(variant.price)}</span><span className={`text-right ${unavailable ? "font-semibold text-[#a34234]" : "text-[#687386]"}`}>{stock === undefined ? "Không theo dõi" : `${stock} tồn kho`}</span></label>;
                })}
              </div>;
            })}
            {!loadingProducts && !visibleProducts.length && <p className="p-10 text-center text-sm text-[#7b8494]">Không tìm thấy sản phẩm phù hợp.</p>}
          </div>
          <footer className="flex items-center justify-between gap-3 border-t border-[#e6e9ef] px-5 py-4 dark:border-[#363b31]"><span className="text-sm text-[#687386]">{lines.length} biến thể · {formatMoney(subtotal)}</span><div className="flex gap-2"><button type="button" onClick={() => setProductPickerOpen(false)} className="h-10 rounded-lg border border-[#dce1e8] px-4 text-sm font-semibold">Hủy</button><button type="button" disabled={!lines.length} onClick={() => setProductPickerOpen(false)} className="h-10 rounded-lg bg-[#527b49] px-4 text-sm font-bold text-white disabled:opacity-40">Hoàn tất chọn</button></div></footer>
        </section>
      </div>}
    </div>
  );
}
