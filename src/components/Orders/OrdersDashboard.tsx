"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import {
  confirmOrder,
  CustomerOrderType,
  getOrderDetails,
  getOrders,
  FinancialStatusValue,
  FulfillmentStatusValue,
  HaravanOrderStatus,
  OrderEvent,
  OrderRecord,
} from "@/services/api/orders";
import HaravanHeader from "@/components/haravan/HaravanHeader";
import OrderDetailDialog from "./OrderDetailDialog";
import OrdersTable from "./OrdersTable";
import { ConfirmationStatus, orderCode } from "./orders.utils";

function localDayBoundary(value: string, dayOffset = 0) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString();
}

function LoginForm() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        phone,
        password,
        redirect: false,
      });
      if (result?.error) setError("Số điện thoại hoặc mật khẩu không đúng.");
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Đăng nhập thất bại. Vui lòng thử lại."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f6f2] px-4 py-12 text-[#20231f] dark:bg-[#151713] dark:text-[#f4f5ef]">
      <section className="w-full max-w-md rounded-3xl border border-[#e6e9df] bg-white p-7 shadow-[0_16px_60px_rgba(30,40,25,0.09)] dark:border-[#363b31] dark:bg-[#20231f] sm:p-9">
        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f0e2] text-[#527b49] dark:bg-[#30392c] dark:text-[#c4dfa9]">
          <i className="pi pi-shopping-bag text-xl" aria-hidden="true" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#71836a] dark:text-[#b8c8ad]">Fantastic Food Factory</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Quản lý đơn hàng</h1>
        <p className="mt-2 text-sm leading-6 text-[#73796f] dark:text-[#b3b9ad]">Đăng nhập bằng tài khoản nhân viên để xem và xác nhận đơn hàng.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Số điện thoại</span>
            <input autoComplete="username" type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Nhập số điện thoại" className="h-12 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none transition focus:border-[#7c9f70] focus:ring-2 focus:ring-[#7c9f70]/20 dark:border-[#40453b] dark:bg-[#191c18]" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Mật khẩu</span>
            <input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" className="h-12 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none transition focus:border-[#7c9f70] focus:ring-2 focus:ring-[#7c9f70]/20 dark:border-[#40453b] dark:bg-[#191c18]" />
          </label>
          {error && <p role="alert" className="rounded-xl bg-[#fff0ee] px-4 py-3 text-sm text-[#aa382f] dark:bg-[#382321] dark:text-[#ffb7af]">{error}</p>}
          <button type="submit" disabled={submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#527b49] px-5 text-sm font-bold text-white transition hover:bg-[#41643a] disabled:cursor-wait disabled:opacity-60">
            {submitting ? <><i className="pi pi-spin pi-spinner" aria-hidden="true" /> Đang đăng nhập...</> : <>Đăng nhập <i className="pi pi-arrow-right" aria-hidden="true" /></>}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function OrdersDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const locale = useLocale();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmationFilters, setConfirmationFilters] = useState<ConfirmationStatus[]>([]);
  const [financialFilters, setFinancialFilters] = useState<FinancialStatusValue[]>([]);
  const [fulfillmentFilters, setFulfillmentFilters] = useState<FulfillmentStatusValue[]>([]);
  const [haravanStatusFilters, setHaravanStatusFilters] = useState<HaravanOrderStatus[]>([]);
  const [customerOrderFilters, setCustomerOrderFilters] = useState<CustomerOrderType[]>([]);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<OrderRecord | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const loadOrders = useCallback(async () => {
    const token = session?.access_token;
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await getOrders(token, {
        page,
        limit: pageSize,
        ...(searchQuery ? { search: searchQuery } : {}),
        confirmedStatuses: confirmationFilters,
        financialStatuses: financialFilters,
        fulfillmentStatuses: fulfillmentFilters,
        haravanStatuses: haravanStatusFilters,
        customerOrderTypes: customerOrderFilters,
        ...(createdFrom ? { createdFrom: localDayBoundary(createdFrom) } : {}),
        ...(createdTo ? { createdTo: localDayBoundary(createdTo, 1) } : {}),
      });
      setOrders(data.items);
      setTotal(data.total);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được đơn hàng.");
    } finally {
      setLoading(false);
    }
  }, [confirmationFilters, createdFrom, createdTo, customerOrderFilters, financialFilters, fulfillmentFilters, haravanStatusFilters, page, pageSize, searchQuery, session?.access_token]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageNumbers = useMemo(
    () => Array.from({ length: pageCount }, (_, index) => index + 1).filter(
      (number) => number === 1 || number === pageCount || Math.abs(number - page) <= 1
    ),
    [page, pageCount]
  );

  async function showDetails(order: OrderRecord) {
    if (!session?.access_token) return;
    setDetail(order);
    setDetailLoading(true);
    setEvents([]);
    try {
      const result = await getOrderDetails(session.access_token, order);
      setDetail({
        ...result.order,
        customerOrderNumber: order.customerOrderNumber ?? result.order.customer?.ordersCount,
      });
      setEvents(result.events);
    } catch (detailError) {
      setNotice(detailError instanceof Error ? detailError.message : "Không tải được chi tiết đơn hàng.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleConfirm(order: OrderRecord) {
    if (!session?.access_token) return;
    const key = `${order.orgId}:${order.haravanOrderId}`;
    setConfirmingOrder(key);
    setNotice("");
    try {
      const result = await confirmOrder(session.access_token, order, session.user.phone);
      setNotice(
        result.confirmed
          ? `Đã gửi yêu cầu xác nhận đơn ${orderCode(order)}; đang chờ trạng thái cập nhật từ Haravan.`
          : `Đơn ${orderCode(order)} chưa được xác nhận. Vui lòng kiểm tra trạng thái xử lý.`
      );
      await loadOrders();
      if (detail?.haravanOrderId === order.haravanOrderId && detail.orgId === order.orgId) {
        await showDetails(order);
      }
    } catch (confirmError) {
      setNotice(confirmError instanceof Error ? confirmError.message : "Không thể xác nhận đơn hàng.");
    } finally {
      setConfirmingOrder(null);
    }
  }

  function searchOrders(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  }

  function updatePageSize(value: number) {
    setPageSize(value);
    setPage(1);
  }

  function clearAllFilters() {
    setSearchInput("");
    setSearchQuery("");
    setConfirmationFilters([]);
    setFinancialFilters([]);
    setFulfillmentFilters([]);
    setHaravanStatusFilters([]);
    setCustomerOrderFilters([]);
    setCreatedFrom("");
    setCreatedTo("");
    setPage(1);
  }

  const hasActiveFilters = Boolean(
    searchInput.trim()
      || searchQuery
      || confirmationFilters.length
      || financialFilters.length
      || fulfillmentFilters.length
      || haravanStatusFilters.length
      || customerOrderFilters.length
      || createdFrom
      || createdTo
  );

  function updateConfirmationFilters(filters: ConfirmationStatus[]) {
    setPage(1);
    setConfirmationFilters(filters);
  }

  function updateFinancialFilters(filters: FinancialStatusValue[]) {
    setPage(1);
    setFinancialFilters(filters);
  }

  function updateFulfillmentFilters(filters: FulfillmentStatusValue[]) {
    setPage(1);
    setFulfillmentFilters(filters);
  }

  function updateHaravanStatusFilters(filters: HaravanOrderStatus[]) {
    setPage(1);
    setHaravanStatusFilters(filters);
  }

  function updateCustomerOrderFilters(filters: CustomerOrderType[]) {
    setPage(1);
    setCustomerOrderFilters(filters);
  }

  function updateDateRange(from: string, to: string) {
    setPage(1);
    setCreatedFrom(from);
    setCreatedTo(to);
  }

  if (sessionStatus === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f6f2] dark:bg-[#151713]">
        <div className="flex items-center gap-3 text-sm font-semibold text-[#64705d] dark:text-[#c4dfa9]">
          <i className="pi pi-spin pi-spinner text-lg" aria-hidden="true" />
          Đang kiểm tra phiên đăng nhập...
        </div>
      </main>
    );
  }
  if (!session) return <LoginForm />;
  if (session.error) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f6f2] px-4 dark:bg-[#151713]">
        <section className="max-w-md rounded-2xl border border-[#f0dfc5] bg-white p-7 text-center dark:border-[#57462f] dark:bg-[#20231f]">
          <i className="pi pi-exclamation-circle text-3xl text-[#a66c21]" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold text-[#20231f] dark:text-white">Phiên đăng nhập đã hết hạn</h1>
          <p className="mt-2 text-sm text-[#73796f] dark:text-[#b3b9ad]">Vui lòng đăng nhập lại để tiếp tục quản lý đơn.</p>
          <button onClick={() => void signOut({ redirect: false })} className="mt-5 rounded-xl bg-[#527b49] px-5 py-3 text-sm font-bold text-white">Đăng nhập lại</button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#f5f6f2] text-[#20231f] dark:bg-[#151713] dark:text-[#f4f5ef]">
      <HaravanHeader />
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 min-h-0 flex-col px-4 py-5 sm:px-6 lg:px-10">
        <header className="mb-5 shrink-0">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Quản lý đơn hàng</h1>
        </header>

        {notice && (
          <div role="status" className="mb-4 flex shrink-0 items-start justify-between gap-4 rounded-xl border border-[#dce9dc] bg-[#f6fbf5] px-4 py-3 text-sm text-[#426a40] dark:border-[#354736] dark:bg-[#202820] dark:text-[#b4cfb3]">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} aria-label="Đóng thông báo"><i className="pi pi-times" aria-hidden="true" /></button>
          </div>
        )}

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e8e9e2] bg-white shadow-[0_4px_24px_rgba(30,40,25,0.045)] dark:border-[#363b31] dark:bg-[#20231f]">
          <div className="flex shrink-0 flex-col justify-end gap-3 border-b border-[#eeefe9] px-5 py-4 dark:border-[#363b31] sm:flex-row sm:items-center sm:px-6">
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <form onSubmit={searchOrders} className="flex w-full gap-2 sm:w-[min(500px,45vw)]">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Tìm đơn hàng hoặc khách hàng</span>
                  <i className="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#92988d]" aria-hidden="true" />
                  <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Mã đơn, ID, SĐT hoặc tên khách..." className="h-11 w-full rounded-xl border border-[#e5e7df] bg-[#fbfbf9] pl-11 pr-3 text-sm outline-none focus:border-[#7c9f70] focus:ring-2 focus:ring-[#7c9f70]/15 dark:border-[#40453b] dark:bg-[#191c18]" />
                </label>
                <button type="submit" className="h-11 rounded-xl bg-[#527b49] px-4 text-sm font-bold text-white hover:bg-[#41643a]">Tìm</button>
                <button type="button" onClick={() => void loadOrders()} disabled={loading} aria-label="Tải lại danh sách" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#e5e7df] text-[#6d7468] hover:bg-[#f5f6f2] disabled:opacity-50 dark:border-[#40453b] dark:text-[#c4c9bf]">
                  <i className={`pi pi-refresh ${loading ? "pi-spin" : ""}`} aria-hidden="true" />
                </button>
              </form>
              <button
                type="button"
                onClick={clearAllFilters}
                disabled={!hasActiveFilters}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#e5e7df] px-3 text-sm font-semibold text-[#62685e] transition hover:border-[#cdd5c8] hover:bg-[#f5f6f2] disabled:cursor-not-allowed disabled:opacity-45 dark:border-[#40453b] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
              >
                <i className="pi pi-filter-slash" aria-hidden="true" />
                Xóa tất cả bộ lọc
              </button>
            </div>
          </div>

          <OrdersTable
            orders={orders}
            locale={locale}
            page={page}
            pageSize={pageSize}
            loading={loading}
            error={error}
            confirmingOrder={confirmingOrder}
            confirmationFilters={confirmationFilters}
            financialFilters={financialFilters}
            fulfillmentFilters={fulfillmentFilters}
            haravanStatusFilters={haravanStatusFilters}
            customerOrderFilters={customerOrderFilters}
            createdFrom={createdFrom}
            createdTo={createdTo}
            onConfirmationFiltersChange={updateConfirmationFilters}
            onFinancialFiltersChange={updateFinancialFilters}
            onFulfillmentFiltersChange={updateFulfillmentFilters}
            onHaravanStatusFiltersChange={updateHaravanStatusFilters}
            onCustomerOrderFiltersChange={updateCustomerOrderFilters}
            onDateRangeChange={updateDateRange}
            onShowDetails={(order) => void showDetails(order)}
            onConfirmOrder={(order) => void handleConfirm(order)}
          />

          <footer className="flex shrink-0 flex-col gap-3 border-t border-[#eeefe9] px-5 py-4 dark:border-[#363b31] sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-[#73796f] dark:text-[#b3b9ad]">
                <span>Hiển thị</span>
                <select
                  aria-label="Số đơn hàng mỗi trang"
                  value={pageSize}
                  onChange={(event) => updatePageSize(Number(event.target.value))}
                  className="h-9 rounded-lg border border-[#e5e7df] bg-white px-2 text-sm text-[#20231f] outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18] dark:text-[#f4f5ef]"
                >
                  {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
                <span>mỗi trang</span>
              </label>
              <p className="text-sm text-[#858a80] dark:text-[#aeb4a8]">
                {total === 0 ? "Không có đơn hàng" : `Hiển thị ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} trên ${total} đơn`}
              </p>
            </div>
            <nav aria-label="Phân trang đơn hàng" className="flex items-center gap-1">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1 || loading} aria-label="Trang trước" className="grid h-9 w-9 place-items-center rounded-lg border border-[#e5e7df] text-sm disabled:opacity-40 dark:border-[#40453b]">
                <i className="pi pi-angle-left" aria-hidden="true" />
              </button>
              {pageNumbers.map((number, index) => (
                <span key={number} className="contents">
                  {index > 0 && number - pageNumbers[index - 1] > 1 && <span className="px-1 text-[#92988d]">…</span>}
                  <button type="button" onClick={() => setPage(number)} aria-current={page === number ? "page" : undefined} className={`grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-semibold ${page === number ? "bg-[#527b49] text-white" : "text-[#62685e] hover:bg-[#f5f6f2] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"}`}>
                    {number}
                  </button>
                </span>
              ))}
              <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount || loading} aria-label="Trang sau" className="grid h-9 w-9 place-items-center rounded-lg border border-[#e5e7df] text-sm disabled:opacity-40 dark:border-[#40453b]">
                <i className="pi pi-angle-right" aria-hidden="true" />
              </button>
            </nav>
          </footer>
        </section>
      </div>

      {detail && (
        <OrderDetailDialog
          order={detail}
          events={events}
          locale={locale}
          loading={detailLoading}
          onClose={() => setDetail(null)}
        />
      )}
    </main>
  );
}
