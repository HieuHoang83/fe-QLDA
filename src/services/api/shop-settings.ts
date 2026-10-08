import axios, { AxiosError } from "axios";

const configuredBaseUrl =
  process.env.NEXT_PUBLIC_QLDAPM_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000";
const apiOrigin = configuredBaseUrl.trim().replace(/\/+$/, "").replace(/\/api(?:\/v1)?$/, "");
const settingsUrl = `${apiOrigin}/api/v1/shops`;

export interface ShopSettings {
  orgId: number;
  name: string;
  domain: string;
  auto_check_repeat_orders: boolean;
}

interface ApiEnvelope<T> { data: T }

function getError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = (error as AxiosError<{ message?: string | string[] }>).response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
    return error.message;
  }
  return "Không thể kết nối tới máy chủ.";
}

export async function getShopSettings(token: string, orgId: string): Promise<ShopSettings> {
  try {
    const response = await axios.get<ApiEnvelope<ShopSettings>>(
      `${settingsUrl}/${encodeURIComponent(orgId)}/settings`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data.data;
  } catch (error) {
    throw new Error(getError(error));
  }
}

export async function updateShopSettings(
  token: string,
  orgId: string,
  values: Pick<ShopSettings, "name" | "auto_check_repeat_orders">,
): Promise<ShopSettings> {
  try {
    const response = await axios.patch<ApiEnvelope<ShopSettings>>(
      `${settingsUrl}/${encodeURIComponent(orgId)}/settings`,
      values,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
    );
    return response.data.data;
  } catch (error) {
    throw new Error(getError(error));
  }
}
