import type { Metadata } from "next";
import CustomersPage from "@/components/Customers/CustomersPage";

export const metadata: Metadata = {
  title: "Quản lý khách hàng",
  description: "Danh sách khách hàng Haravan",
};

export default function CustomersRoute() {
  return <CustomersPage />;
}
