import InventoryUnsupportedPage from "@/components/Inventory/InventoryUnsupportedPage";

export default function SuppliersRoute() {
  return <InventoryUnsupportedPage title="Nhà cung cấp" icon="pi-truck" note="Tài liệu inventory.md hiện chưa có endpoint danh sách, chi tiết hoặc tạo nhà cung cấp. Khi có API Supplier, trang sẽ có thể hiển thị và quản lý dữ liệu thật." />;
}
