import axios, { AxiosInstance, AxiosResponse } from "axios";
import { getSession, signOut } from "next-auth/react";
import type { Session } from "next-auth";

// ============================================
// Session Cache - Tránh gọi /api/auth/session mỗi request
// ============================================
let cachedSession: Session | null = null;
let sessionPromise: Promise<Session | null> | null = null;
let sessionFetchedAt: number = 0;
const SESSION_CACHE_TTL = 30 * 1000; // Cache 30 giây

async function getCachedSession(): Promise<Session | null> {
  const now = Date.now();

  if (cachedSession && now - sessionFetchedAt < SESSION_CACHE_TTL) {
    return cachedSession;
  }

  if (sessionPromise) {
    return sessionPromise;
  }

  sessionPromise = getSession()
    .then((session) => {
      cachedSession = session;
      sessionFetchedAt = Date.now();
      sessionPromise = null;
      return session;
    })
    .catch((error) => {
      sessionPromise = null;
      throw error;
    });

  return sessionPromise;
}

export function invalidateSessionCache() {
  cachedSession = null;
  sessionPromise = null;
  sessionFetchedAt = 0;
}

function getApiBaseUrl(): string {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not defined");
  }

  let baseUrl = API_URL.trim().replace(/\/$/, "");

  if (!baseUrl.includes("/api/v1")) {
    if (baseUrl.endsWith("/api")) {
      baseUrl = `${baseUrl}/v1`;
    } else {
      baseUrl = `${baseUrl}/api/v1`;
    }
  }

  return baseUrl;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  async (config) => {
    const session = await getCachedSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRedirecting = false;

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined" && !isRedirecting) {
        if (!window.location.pathname.includes("/auth/login")) {
          isRedirecting = true;
          invalidateSessionCache();
          await signOut({ redirect: false });
          window.location.href = "/auth/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
