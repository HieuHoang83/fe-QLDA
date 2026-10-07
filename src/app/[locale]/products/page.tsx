import type { Metadata } from "next";
import ProductsPage from "@/components/Products/ProductsPage";

export const metadata: Metadata = {
  title: "Quản lý sản phẩm",
  description: "Danh sách sản phẩm Haravan",
};

export default function ProductsRoute() {
  return <ProductsPage />;
}
