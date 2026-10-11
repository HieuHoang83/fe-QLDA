import axios, { AxiosInstance } from "axios";

const configuredBaseUrl =
  process.env.NEXT_PUBLIC_QLDAPM_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000";
const BASE_URL = configuredBaseUrl
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api(?:\/v1)?$/, "");

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginResult {
  user: {
    id: string;
    name: string;
    phone: string;
    avatar?: string;
    role?: string;
  };
  token: {
    access_token: string;
    refresh_token: string;
  };
}

export interface RefreshTokenResult {
  access_token: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T | null;
}

const authClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function register(
  data: RegisterRequest
): Promise<ApiResponse<string>> {
  const response = await authClient.post<ApiResponse<string>>(
    "/api/auth/register",
    data
  );
  return response.data;
}

export async function login(
  data: LoginRequest
): Promise<ApiResponse<LoginResult>> {
  const response = await authClient.post<ApiResponse<LoginResult>>(
    "/api/v1/auth/login",
    data
  );
  return response.data;
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<ApiResponse<RefreshTokenResult>> {
  const response = await authClient.post<ApiResponse<RefreshTokenResult>>(
    "/api/v1/auth/refresh-token",
    { refreshToken }
  );
  return response.data;
}

export const saveAuth = (
  token: string,
  username?: string,
  email?: string
) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
  if (username) {
    localStorage.setItem("username", username);
  }
  if (email) {
    localStorage.setItem("email", email);
  }
};

export const logout = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("email");
};

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

/**
 * Luong dang nhap bang tai khoan Haravan (Haravan Connect / OpenID Connect).
 *
 * Khac voi dang nhap so dien thoai, o day nguoi dung duoc chuyen sang trang dang nhap cua
 * Haravan roi quay lai. Backend khong tra token qua query string (anh xinh qua proxy va log),
 * ma tra ve mot `code` dung mot lan; frontend doi `code` do lay token qua API `session`.
 */
export interface HaravanLoginConfig {
  enabled: boolean;
  reason: string | null;
}

export interface HaravanSessionResult {
  user: {
    id: string;
    name: string;
    phone?: string;
    avatar?: string;
    role?: string;
  };
  token: {
    access_token: string;
    refresh_token: string;
  };
  haravan?: {
    sub?: string;
    email?: string;
    orgId?: number;
    role?: string;
  };
}

/**
 * Kiem tra backend co bat dang nhap Haravan khong.
 *
 * Backend tra luon 200 ke ca khi tinh nang dang tat, nen loi mang (backend chua chay) thi co
 * duyet phai tra `null` de frontend an nut thay vi bao loi.
 */
export async function getHaravanLoginConfig(): Promise<HaravanLoginConfig | null> {
  try {
    const response = await authClient.get<ApiResponse<HaravanLoginConfig>>(
      "/api/v1/haravan/auth/config"
    );
    return response.data?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Duong dan chuyen nguoi dung sang trang dang nhap cua Haravan.
 *
 * Tra ve null o server (khong co `window.location`) vi duong dan nay phai mo bang trinh duyet,
 * khong phai goi bang fetch.
 */
export function haravanLoginUrl(returnTo = "/auth/callback"): string | null {
  if (typeof window === "undefined") return null;

  // Giu ngon ngu dang dung. Khong co tien to locale thi middleware cua next-intl se tu them,
  // nhung giu lai thi quay ve dung ngay, khong ton them mot lan chuyen huong.
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  const path =
    first && /^[a-z]{2}(-[A-Za-z]{2,})?$/.test(first)
      ? `/${first}${returnTo}`
      : returnTo;

  const returnUrl = new URL(path, window.location.origin).toString();
  const params = new URLSearchParams({ redirect_uri: returnUrl });

  return `${BASE_URL}/api/v1/haravan/auth/login?${params.toString()}`;
}

/**
 * Doi `code` (ticket) lay access + refresh token.
 *
 * Ticket dung mot lan: doi xong la het han, request lai se tra loi. Vay vay khong duoc thu lai
 * mot cach vo tan, phai quay lai trang dang nhap de lay `code` moi.
 */
export async function exchangeHaravanTicket(
  ticket: string
): Promise<HaravanSessionResult> {
  const response = await authClient.post<
    ApiResponse<HaravanSessionResult>
  >("/api/v1/haravan/auth/session", { ticket });

  const data = response.data?.data;
  if (!data?.token?.access_token) {
    throw new Error(response.data?.message || "Doi ma dang nhap that bai");
  }

  return data;
}
