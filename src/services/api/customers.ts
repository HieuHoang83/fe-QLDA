import axios from "axios";

import { getHaravanErrorMessage, haravanRequest } from "./haravan";
import type { JobAccepted } from "./orders";

export interface HaravanCustomerAddress {
  id?: number;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  company?: string | null;
  country?: string | null;
  country_code?: string | null;
  country_name?: string | null;
  district?: string | null;
  district_code?: string | null;
  province?: string | null;
  province_code?: string | null;
  ward?: string | null;
  ward_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  phone?: string | null;
  zip?: string | null;
  default?: boolean;
  created_at?: string;
  updated_at?: string;
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

export function createCustomer(
  token: string,
  orgId: string,
  customer: Partial<HaravanCustomer>
): Promise<HaravanCustomerResult> {
  return haravanRequest<HaravanCustomerResult>(
    orgId,
    "/customers",
    token,
    { method: "POST", body: { customer } }
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

export interface HaravanCustomerAddressListResult {
  addresses: HaravanCustomerAddress[];
}

export interface HaravanCustomerAddressResult {
  address: HaravanCustomerAddress;
}

export interface ListAddressesParams {
  page?: number;
  limit?: number;
  fields?: string;
  [key: string]: string | number | undefined;
}

export function listAddresses(
  token: string,
  orgId: string,
  customerId: number,
  params: ListAddressesParams = {}
): Promise<HaravanCustomerAddressListResult> {
  return haravanRequest<HaravanCustomerAddressListResult>(
    orgId,
    `/customers/${customerId}/addresses`,
    token,
    { params }
  );
}

export function getAddress(
  token: string,
  orgId: string,
  customerId: number,
  addressId: number
): Promise<HaravanCustomerAddressResult> {
  return haravanRequest<HaravanCustomerAddressResult>(
    orgId,
    `/customers/${customerId}/addresses/${addressId}`,
    token
  );
}

export function createAddress(
  token: string,
  orgId: string,
  customerId: number,
  address: Partial<HaravanCustomerAddress>
): Promise<HaravanCustomerAddressResult> {
  return haravanRequest<HaravanCustomerAddressResult>(
    orgId,
    `/customers/${customerId}/addresses`,
    token,
    { method: "POST", body: { address } }
  );
}

export function updateAddress(
  token: string,
  orgId: string,
  customerId: number,
  addressId: number,
  address: Partial<HaravanCustomerAddress>
): Promise<HaravanCustomerAddressResult> {
  return haravanRequest<HaravanCustomerAddressResult>(
    orgId,
    `/customers/${customerId}/addresses/${addressId}`,
    token,
    { method: "PUT", body: { address: { id: addressId, ...address } } }
  );
}

export function deleteAddress(
  token: string,
  orgId: string,
  customerId: number,
  addressId: number
): Promise<unknown> {
  return haravanRequest(
    orgId,
    `/customers/${customerId}/addresses/${addressId}`,
    token,
    { method: "DELETE", body: {} }
  );
}

export function setAddressDefault(
  token: string,
  orgId: string,
  customerId: number,
  addressId: number
): Promise<HaravanCustomerAddressResult> {
  return haravanRequest<HaravanCustomerAddressResult>(
    orgId,
    `/customers/${customerId}/addresses/${addressId}/default`,
    token,
    { method: "PUT", body: {} }
  );
}

/* -------------------------------------------------------------------------- */
/*  Tim kiem khach bang bo tim kiem cua BE                                     */
/* -------------------------------------------------------------------------- */

const configuredBaseUrl =
  process.env.NEXT_PUBLIC_QLDAPM_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000";
const apiOrigin = configuredBaseUrl
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api(?:\/v1)?$/, "");
const customersBaseUrl = `${apiOrigin}/api/v1/customers`;

/** Mot khach sau khi qua bo tim kiem (Elasticsearch, lui ve MongoDB neu can). */
export interface CustomerSearchHit {
  id: string;
  orgId: number;
  haravanCustomerId?: number;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  /** Ba so cuoi cua so dien thoai, dung cho viet nhanh tren bang ket qua. */
  phoneSuffix3?: string;
  state?: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderName?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
}

/** Che do hieu dung chuoi nguoi dung nhap, do BE quyet dinh. */
export type CustomerSearchMode =
  | "empty"
  | "invalid"
  | "phone_suffix"
  | "phone_prefix"
  | "text";

export interface CustomerSearchResult {
  items: CustomerSearchHit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  mode: CustomerSearchMode;
  /** He so da tra loi; hien huu ich khi moi bat Elasticsearch. */
  engine: "elasticsearch" | "mongodb";
  hint?: string;
}

export interface LocalSearchCustomersParams {
  q: string;
  page?: number;
  limit?: number;
  kind?: "returning" | "first_time" | "all";
  sort?: "newest" | "lastSeen" | "spent" | "orders";
}

export function searchCustomersLocal(
  token: string,
  orgId: string,
  params: LocalSearchCustomersParams
): Promise<CustomerSearchResult> {
  return apiRequest<CustomerSearchResult>(token, "/search", {
    params: {
      orgId,
      q: params.q,
      page: params.page,
      limit: params.limit,
      kind: params.kind,
      sort: params.sort,
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Tao / sua khach: day vao hang doi cong viec, BE lo phan gui len Haravan       */
/* -------------------------------------------------------------------------- */

export interface CustomerJobBody {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  tags?: string;
  note?: string;
  state?: string;
}

/**
 * Tao khach tren Haravan.
 *
 * BE tra ve `202` kem `jobId` ngay, khong doi Haravan xong; FE dung `watchJob` de theo doi.
 * Sau khi Haravan xu ly xong, no gui webhook ve BE de BE ghi MongoDB + Elasticsearch.
 */
export function createCustomerJob(
  token: string,
  orgId: string,
  body: CustomerJobBody
): Promise<JobAccepted> {
  return apiRequest<JobAccepted>(token, `/${encodeURIComponent(orgId)}/create`, {
    method: "POST",
    body,
  });
}

/** Sua khach tren Haravan qua cung co che hang doi cong viec. */
export function updateCustomerJob(
  token: string,
  orgId: string,
  customerId: number,
  body: CustomerJobBody
): Promise<JobAccepted> {
  return apiRequest<JobAccepted>(
    token,
    `/${encodeURIComponent(orgId)}/${encodeURIComponent(customerId)}/update`,
    { method: "PUT", body }
  );
}

/**
 * Dua ket qua tim kiem ve dung hinh du lieu cua bang, de cac cot hien thi dung mot API
 * khac nhau khong phai sua lai bang.
 */
export function toHaravanCustomer(hit: CustomerSearchHit): HaravanCustomer {
  return {
    id: hit.haravanCustomerId,
    // `customerName` ghep `last_name` + `first_name`; dat `fullName` vao `first_name` de
    // khach chi co ten day du van hien thi dung.
    first_name: hit.firstName ?? hit.fullName,
    last_name: hit.lastName,
    email: hit.email,
    phone: hit.phone,
    state: hit.state,
    orders_count: hit.ordersCount,
    total_spent: hit.totalSpent,
    last_order_name: hit.lastOrderName,
    created_at: hit.firstSeenAt,
  };
}

async function apiRequest<T>(
  token: string,
  path: string,
  options: {
    params?: Record<string, string | number | undefined>;
    method?: "GET" | "POST" | "PUT";
    body?: object;
  } = {}
): Promise<T> {
  try {
    const response = await axios.request<{ data: T }>({
      baseURL: customersBaseUrl,
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
    throw new Error(getHaravanErrorMessage(error));
  }
}
