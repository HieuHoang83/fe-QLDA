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
    method?: "GET" | "POST";
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
): Promise<{ confirmed: boolean; status: string }> {
  return request(
    `/${encodeURIComponent(order.orgId)}/${encodeURIComponent(order.haravanOrderId)}/confirm`,
    token,
    {
      method: "POST",
      body: { actor, force: true },
    }
  );
}
