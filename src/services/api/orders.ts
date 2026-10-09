import axios, { AxiosError } from "axios";

const configuredBaseUrl =
  process.env.NEXT_PUBLIC_QLDAPM_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000";
const apiOrigin = configuredBaseUrl
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api(?:\/v1)?$/, "");
const ordersBaseUrl = `${apiOrigin}/api/v1/orders`;

interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface OrderLineItem {
  id?: number;
  title?: string;
  name?: string;
  variant_title?: string | null;
  sku?: string | null;
  quantity?: number;
  price?: number;
  price_original?: number | null;
  price_promotion?: number | null;
  total_discount?: number | null;
  properties?: unknown;
  discount_allocations?: Array<{
    amount?: number | string | null;
    discount_application_index?: number;
  }>;
}

export interface OrderDiscountCode {
  code?: string;
  amount?: string | number;
  type?: string;
}

export interface OrderPayloadDetails {
  status?: string | null;
  financial_status?: string | null;
  confirmed_status?: string | null;
  cancelled_status?: string | null;
  cancelled_at?: string | null;
  closed_status?: string | null;
  closed_at?: string | null;
  note?: string | null;
  customer?: {
    default_address?: CustomerAddress | null;
  } | null;
  total_paid?: number | string | null;
  total_refunded?: number | string | null;
  total_received?: number | string | null;
  shipping_lines?: Array<{
    title?: string;
    code?: string;
    price?: number | string | null;
  }> | null;
  discount_codes?: OrderDiscountCode[] | null;
  note_attributes?: unknown[] | null;
  discount_applications?: Array<{
    title?: string;
    code?: string;
    value?: string | number;
    value_type?: string;
    allocation_method?: string;
    target_type?: string;
  }> | null;
  transactions?: Array<{
    amount?: number | string | null;
    kind?: string | null;
    status?: string | null;
    gateway?: string | null;
  }> | null;
}

export interface CustomerAddress {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  company?: string | null;
  country?: string | null;
  district?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  phone?: string | null;
  province?: string | null;
  ward?: string | null;
  zip?: string | null;
}

export interface OrderRecord {
  orgId: number;
  haravanOrderId: number;
  orderNumber?: string;
  orderName?: string;
  name?: string;
  customerName?: string;
  email?: string;
  phone?: string;
  customer?: {
    fullName?: string;
    email?: string;
    phone?: string;
    ordersCount?: number;
    totalSpent?: number;
    totalPaid?: number;
  };
  status: string;
  haravanStatus?: HaravanOrderStatus | null;
  confirmedStatus?: string | null;
  financialStatus?: string | null;
  fulfillmentStatus?: string | null;
  gateway?: string | null;
  totalPrice?: number;
  subtotalPrice?: number;
  totalDiscounts?: number;
  totalTax?: number;
  currency?: string;
  itemCount?: number;
  lineItems?: OrderLineItem[];
  note?: string | null;
  customerOrderNumber?: number | null;
  isReturningCustomer?: boolean;
  shippingAddress?: CustomerAddress | null;
  processing?: {
    reason?: string;
    error?: string;
    priorOrderCount?: number;
    priorSpent?: number;
  };
  payload?: OrderPayloadDetails;
  createdAt?: string;
}

export interface OrderAction {
  type: string;
  result: string;
  manual: boolean;
  actor?: string;
  message?: string;
  createdAt?: string;
}

export interface OrderEvent {
  action: string;
  source: "webhook" | "user" | "system" | "api" | "manual";
  description: string;
  changedFields: string[];
  actor?: string;
  topic?: string;
  createdAt?: string;
}

export type FinancialStatusValue =
  | "pending"
  | "partially_paid"
  | "paid"
  | "partially_refunded"
  | "refunded"
  | "voided";
export type FulfillmentStatusValue = "unshipped" | "shipped" | "partial";
export type HaravanOrderStatus = "open" | "closed" | "cancelled";
export type CustomerOrderType = "first" | "repeat";

export interface OrdersPage {
  items: OrderRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderDetails {
  order: OrderRecord;
  events: OrderEvent[];
}

/**
 * Kết quả trả về ngay khi thao tác được đẩy vào hàng đợi.
 * Đơn hàng chưa chắc đã xử lý xong trên Haravan, FE phải poll `getJobStatus`.
 */
export interface JobAccepted {
  queued: boolean;
  jobId: string;
  action: string;
  status: "pending";
}

export type JobStatusValue = "pending" | "running" | "completed" | "failed";

export interface JobStatus {
  id: string;
  name: string;
  status: JobStatusValue;
  attempts: number;
  maxAttempts: number;
  error?: string | null;
  result?: string | null;
}

export interface JobResult {
  message?: string;
  haravanOrderId?: number;
  confirmed?: boolean;
}

/** Đọc nội dung `result` do BE ghi kèm khi worker xử lý xong. */
export function parseJobResult(job: JobStatus | null): JobResult {
  if (!job?.result) return {};
  try {
    const parsed = JSON.parse(job.result) as JobResult;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return { message: job.result };
  }
}

/** Lấy trạng thái công việc đã đẩy lên Haravan. */
export function getJobStatus(
  token: string,
  orgId: number | string,
  jobId: string
): Promise<JobStatus> {
  return request<JobStatus>(
    `/${encodeURIComponent(orgId)}/jobs/${encodeURIComponent(jobId)}`,
    token
  );
}

export interface CreateOrderInput {
  line_items: Array<{
    variant_id?: number;
    title?: string;
    price?: number;
    quantity: number;
    total_discount?: number;
    applied_discounts?: Array<{ description: string; amount: number }>;
  }>;
  discount_codes?: Array<{ code: string; is_coupon_code: boolean; amount?: number }>;
  total_discounts?: number;
  financial_status?: "pending" | "paid";
  gateway?: string;
  is_cod_gateway?: boolean;
  note_attributes?: Array<{ name: string; value: string }>;
  customer_id?: number;
  email?: string;
  phone?: string;
  note?: string;
  first_name?: string;
  last_name?: string;
  address1?: string;
  city?: string;
  province?: string;
  country?: string;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseMessage = (error as AxiosError<{ message?: string | string[] }>)
      .response?.data?.message;
    if (Array.isArray(responseMessage)) return responseMessage.join(", ");
    if (responseMessage) return responseMessage;
    if (error.message) return error.message;
  }
  return "Không thể kết nối tới máy chủ. Vui lòng thử lại.";
}

async function request<T>(
  path: string,
  token: string,
  options: {
    method?: "GET" | "POST" | "PUT";
    params?: Record<string, string | number>;
    body?: object;
  } = {}
): Promise<T> {
  try {
    const response = await axios.request<ApiEnvelope<T>>({
      baseURL: ordersBaseUrl,
      url: path,
      method: options.method ?? "GET",
      params: options.params,
      data: options.body,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export function getOrders(
  token: string,
  params: {
    page: number;
    limit: number;
    search?: string;
    confirmedStatuses?: Array<"confirmed" | "unconfirmed">;
    financialStatuses?: FinancialStatusValue[];
    fulfillmentStatuses?: FulfillmentStatusValue[];
    haravanStatuses?: HaravanOrderStatus[];
    customerOrderTypes?: CustomerOrderType[];
    createdFrom?: string;
    createdTo?: string;
  }
): Promise<OrdersPage> {
  const {
    confirmedStatuses,
    financialStatuses,
    fulfillmentStatuses,
    haravanStatuses,
    customerOrderTypes,
    ...rest
  } = params;
  return request<OrdersPage>("", token, {
    params: {
      ...rest,
      ...(confirmedStatuses?.length
        ? { confirmedStatuses: confirmedStatuses.join(",") }
        : {}),
      ...(financialStatuses?.length
        ? { financialStatuses: financialStatuses.join(",") }
        : {}),
      ...(fulfillmentStatuses?.length
        ? { fulfillmentStatuses: fulfillmentStatuses.join(",") }
        : {}),
      ...(haravanStatuses?.length
        ? { haravanStatuses: haravanStatuses.join(",") }
        : {}),
      ...(customerOrderTypes?.length
        ? { customerOrderTypes: customerOrderTypes.join(",") }
        : {}),
    },
  });
}

export function getOrderDetails(
  token: string,
  order: Pick<OrderRecord, "orgId" | "haravanOrderId">
): Promise<OrderDetails> {
  return request<OrderDetails>(
    `/${encodeURIComponent(order.orgId)}/${encodeURIComponent(order.haravanOrderId)}`,
    token
  );
}

export function confirmOrder(
  token: string,
  order: Pick<OrderRecord, "orgId" | "haravanOrderId">,
  actor: string
): Promise<JobAccepted> {
  return request(
    `/${encodeURIComponent(order.orgId)}/${encodeURIComponent(order.haravanOrderId)}/confirm`,
    token,
    {
      method: "POST",
      body: { actor, force: true },
    }
  );
}

export function createOrder(
  token: string,
  orgId: string,
  body: CreateOrderInput
): Promise<JobAccepted> {
  return request<JobAccepted>(`/${encodeURIComponent(orgId)}/create`, token, {
    method: "POST",
    body,
  });
}

/** Trang thai vong doi hien tai, uu tien payload webhook moi nhat. */
export function haravanStatusOf(order: OrderRecord): HaravanOrderStatus {
  const fromPayload = order.payload?.status;
  if (fromPayload === "closed" || fromPayload === "cancelled") return fromPayload;
  if (order.haravanStatus === "closed" || order.haravanStatus === "cancelled") {
    return order.haravanStatus;
  }
  if (order.payload?.cancelled_status === "cancelled") return "cancelled";
  if (order.payload?.closed_status === "closed") return "closed";
  return "open";
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** So tien da thu, da hoan va con lai co the hoan cua don. */
export function refundableAmount(order: OrderRecord): {
  paid: number;
  refunded: number;
  remaining: number;
} {
  const paid = paidAmountOf(order);
  const refunded = toNumber(order.payload?.total_refunded);
  return { paid, refunded, remaining: Math.max(0, paid - refunded) };
}

/**
 * Số tiền khách còn phải trả cho đơn.
 *
 * Đơn COD của Haravan tạo sẵn một giao dịch `pending` đúng bằng tổng tiền, nhưng
 * tiền chưa thu nên `total_paid` vẫn là 0. Vì vậy phải bỏ qua giao dịch `pending`
 * khi tính phần đã thu, nếu không đơn COD sẽ bị coi là đã trả đủ.
 */
export function amountDue(order: OrderRecord): number {
  const total = toNumber(order.totalPrice);
  return Math.max(0, total - paidAmountOf(order));
}

/** Phần tiền đã thu thật: bỏ qua giao dịch `pending`, `void` và các giao dịch lỗi. */
function paidAmountOf(order: OrderRecord): number {
  const fromPayload = order.payload?.total_paid;
  if (fromPayload !== undefined && fromPayload !== null && fromPayload !== "") {
    return toNumber(fromPayload);
  }

  const transactions = order.payload?.transactions ?? [];
  if (transactions.length) {
    return transactions
      .filter((transaction) => {
        const kind = String(transaction.kind ?? "").toLowerCase();
        const status = String(transaction.status ?? "").toLowerCase();
        if (status === "failure" || status === "error") return false;
        return kind === "sale" || kind === "capture";
      })
      .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
  }

  const financialStatus = String(
    order.financialStatus ?? order.payload?.financial_status ?? "",
  ).toLowerCase();
  if (financialStatus === "paid" || financialStatus === "partially_paid") {
    return toNumber(order.totalPrice);
  }
  return 0;
}

export interface CancelOrderInput {
  reason?: string;
  refund?: boolean;
  restock?: boolean;
  amount?: number;
  note?: string;
  actor?: string;
}

export interface RefundOrderInput {
  amount?: number;
  note?: string;
  gateway?: string;
  actor?: string;
}

export interface UpdateOrderInput {
  note?: string;
  note_attributes?: Array<{ name: string; value: string }>;
  email?: string;
  phone?: string;
  actor?: string;
}

export interface Transaction {
  id?: number;
  order_id?: number;
  amount?: number;
  authorization?: string | null;
  created_at?: string;
  gateway?: string;
  kind?: "pending" | "authorization" | "sale" | "capture" | "void" | "refund";
  status?: "success" | "failure" | "pending" | "error";
  currency?: string;
  test?: boolean;
  receipt?: unknown;
}

function orderKey(order: Pick<OrderRecord, "orgId" | "haravanOrderId">): string {
  return `/${encodeURIComponent(order.orgId)}/${encodeURIComponent(
    order.haravanOrderId
  )}`;
}

export function cancelOrder(
  token: string,
  order: Pick<OrderRecord, "orgId" | "haravanOrderId">,
  input: CancelOrderInput = {}
): Promise<JobAccepted> {
  return request(`${orderKey(order)}/cancel`, token, {
    method: "POST",
    body: input,
  });
}

export function closeOrder(
  token: string,
  order: Pick<OrderRecord, "orgId" | "haravanOrderId">,
  actor?: string
): Promise<JobAccepted> {
  return request(`${orderKey(order)}/close`, token, {
    method: "POST",
    body: { actor },
  });
}

export function openOrder(
  token: string,
  order: Pick<OrderRecord, "orgId" | "haravanOrderId">,
  actor?: string
): Promise<JobAccepted> {
  return request(`${orderKey(order)}/open`, token, {
    method: "POST",
    body: { actor },
  });
}

export function updateOrder(
  token: string,
  order: Pick<OrderRecord, "orgId" | "haravanOrderId">,
  input: UpdateOrderInput
): Promise<JobAccepted> {
  return request(orderKey(order), token, {
    method: "PUT",
    body: input,
  });
}

export function refundOrder(
  token: string,
  order: Pick<OrderRecord, "orgId" | "haravanOrderId">,
  input: RefundOrderInput
): Promise<JobAccepted> {
  const { actor, ...rest } = input;
  return request(`${orderKey(order)}/refunds`, token, {
    method: "POST",
    body: {
      ...rest,
      ...(rest.amount
        ? {
            transactions: [
              {
                kind: "refund",
                amount: rest.amount,
                ...(rest.gateway ? { gateway: rest.gateway } : {}),
                ...(rest.note ? { note: rest.note } : {}),
              },
            ],
          }
        : {}),
    },
  });
}

export function listRefunds(
  token: string,
  order: Pick<OrderRecord, "orgId" | "haravanOrderId">,
  params: { page?: number; limit?: number } = {}
): Promise<unknown> {
  return request(`${orderKey(order)}/refunds`, token, { params });
}

export function getRefund(
  token: string,
  order: Pick<OrderRecord, "orgId" | "haravanOrderId">,
  refundId: number
): Promise<unknown> {
  return request(
    `${orderKey(order)}/refunds/${encodeURIComponent(refundId)}`,
    token
  );
}

export function listTransactions(
  token: string,
  order: Pick<OrderRecord, "orgId" | "haravanOrderId">
): Promise<{ transactions: Transaction[] }> {
  return request(`${orderKey(order)}/transactions`, token);
}

export function createTransaction(
  token: string,
  order: Pick<OrderRecord, "orgId" | "haravanOrderId">,
  body: { amount: number; kind: string; gateway?: string; parent_id?: number; note?: string }
): Promise<JobAccepted> {
  return request(`${orderKey(order)}/transactions`, token, {
    method: "POST",
    body,
  });
}
