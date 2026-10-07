import { haravanRequest } from "./haravan";

export interface HaravanCustomerAddress {
  id?: number;
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
  default?: boolean;
}

export interface HaravanCustomer {
  id?: number;
  email?: string | null;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  note?: string | null;
  tags?: string | null;
  state?: string;
  verified_email?: boolean;
  orders_count?: number;
  total_spent?: number;
  total_paid?: number;
  last_order_id?: number | null;
  last_order_name?: string | null;
  last_order_date?: string | null;
  birthday?: string | null;
  gender?: 0 | 1 | 2 | null;
  accepts_marketing?: boolean;
  default_address?: HaravanCustomerAddress | null;
  created_at?: string;
  updated_at?: string;
}

export interface HaravanCustomerListResult {
  customers: HaravanCustomer[];
}

export interface HaravanCustomerResult {
  customer: HaravanCustomer;
}

export interface ListCustomersParams {
  page?: number;
  limit?: number;
  ids?: string;
  since_id?: number;
  order?: string;
  [key: string]: string | number | undefined;
}

export interface SearchCustomersParams {
  query: string;
  page?: number;
  limit?: number;
  order?: string;
  [key: string]: string | number | undefined;
}

export function listCustomers(
  token: string,
  orgId: string,
  params: ListCustomersParams = {}
): Promise<HaravanCustomerListResult> {
  return haravanRequest<HaravanCustomerListResult>(
    orgId,
    "/customers",
    token,
    { params }
  );
}

export function searchCustomers(
  token: string,
  orgId: string,
  params: SearchCustomersParams
): Promise<HaravanCustomerListResult> {
  return haravanRequest<HaravanCustomerListResult>(
    orgId,
    "/customers/search",
    token,
    { params }
  );
}

export function countCustomers(
  token: string,
  orgId: string
): Promise<{ count: number }> {
  return haravanRequest<{ count: number }>(
    orgId,
    "/customers/count",
    token
  );
}

export function getCustomer(
  token: string,
  orgId: string,
  customerId: number
): Promise<HaravanCustomerResult> {
  return haravanRequest<HaravanCustomerResult>(
    orgId,
    `/customers/${customerId}`,
    token
  );
}

export function updateCustomer(
  token: string,
  orgId: string,
  customerId: number,
  customer: Partial<HaravanCustomer>
): Promise<HaravanCustomerResult> {
  return haravanRequest<HaravanCustomerResult>(
    orgId,
    `/customers/${customerId}`,
    token,
    { method: "PUT", body: { customer: { id: customerId, ...customer } } }
  );
}
