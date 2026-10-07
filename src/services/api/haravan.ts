import axios, { AxiosError } from "axios";

const configuredBaseUrl =
  process.env.NEXT_PUBLIC_QLDAPM_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000";
const apiOrigin = configuredBaseUrl
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api(?:\/v1)?$/, "");
export const haravanBaseUrl = `${apiOrigin}/api/v1/haravan`;

interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface HaravanRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  params?: Record<string, string | number | undefined>;
  body?: object;
}

export function getHaravanErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string | string[] }>;
    const responseMessage = axiosError.response?.data?.message;
    if (Array.isArray(responseMessage)) return responseMessage.join(", ");
    if (responseMessage) return responseMessage;
    if (axiosError.response?.status === 401) {
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    }
    if (axiosError.message) return axiosError.message;
  }
  return "Không thể kết nối tới máy chủ. Vui lòng thử lại.";
}

function compactParams(
  params: Record<string, string | number | undefined> = {}
): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    result[key] = value;
  }
  return result;
}

export async function haravanRequest<T>(
  orgId: string,
  path: string,
  token: string,
  options: HaravanRequestOptions = {}
): Promise<T> {
  try {
    const response = await axios.request<ApiEnvelope<T>>({
      baseURL: `${haravanBaseUrl}/${encodeURIComponent(orgId)}`,
      url: path,
      method: options.method ?? "GET",
      params: compactParams(options.params),
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
