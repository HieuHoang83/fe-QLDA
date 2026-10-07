import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailPage from "@/components/Products/ProductDetailPage";

export const metadata: Metadata = {
  title: "Chi tiết sản phẩm",
  description: "Thông tin sản phẩm và các biến thể Haravan",
};

export default function ProductDetailRoute({
  params,
}: {
  params: { id: string };
}) {
  const productId = Number(params.id);
  if (!Number.isFinite(productId) || productId <= 0) {
    notFound();
  }
  return <ProductDetailPage productId={productId} />;
}