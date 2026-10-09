import type { HaravanProduct } from "@/services/api/products";

/** Dữ liệu form sản phẩm, dùng chung cho trang danh sách và trang chi tiết. */
export interface ProductFormState {
  title: string;
  vendor: string;
  product_type: string;
  tags: string;
}

export function emptyForm(product: HaravanProduct): ProductFormState {
  return {
    title: product.title ?? "",
    vendor: product.vendor ?? "",
    product_type: product.product_type ?? "",
    tags: product.tags ?? "",
  };
}
