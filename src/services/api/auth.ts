import axios, { AxiosInstance } from "axios";

const BASE_URL =
  process.env.NEXT_PUBLIC_QLDAPM_API_URL ?? "http://localhost:8080";

export interface LoginRequest {
  username: string;
  password: string;
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
): Promise<ApiResponse<string>> {
  const response = await authClient.post<ApiResponse<string>>(
    "/api/auth/login",
    data
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

