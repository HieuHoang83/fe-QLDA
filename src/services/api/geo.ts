import { haravanRequest } from "./haravan";

/** 1 muc dia ly Haravan (quoc gia / tinh / quan / phuong). */
export interface GeoItem {
  id: number;
  name?: string | null;
  code?: string | null;
  country_id?: number | null;
  province_id?: number | null;
  district_id?: number | null;
}

/** GET /api/v1/haravan/{orgId}/countries  ->  /com/countries.json */
export async function listCountries(token: string, orgId: string) {
  const data = await haravanRequest<{ countries?: GeoItem[] }>(
    orgId,
    "/countries",
    token
  );
  return data?.countries ?? [];
}

/** GET .../countries/{countryId}/provinces  ->  /com/countries/{id}/provinces.json */
export async function listProvinces(
  token: string,
  orgId: string,
  countryId: number
) {
  const data = await haravanRequest<{ provinces?: GeoItem[] }>(
    orgId,
    `/countries/${countryId}/provinces`,
    token
  );
  return data?.provinces ?? [];
}

/** GET .../provinces/{provinceId}/districts  ->  /com/provinces/{id}/districts.json */
export async function listDistricts(
  token: string,
  orgId: string,
  provinceId: number
) {
  const data = await haravanRequest<{ districts?: GeoItem[] }>(
    orgId,
    `/provinces/${provinceId}/districts`,
    token
  );
  return data?.districts ?? [];
}

/** GET .../districts/{districtId}/wards  ->  /com/districts/{id}/wards.json */
export async function listWards(
  token: string,
  orgId: string,
  districtId: number
) {
  const data = await haravanRequest<{ wards?: GeoItem[] }>(
    orgId,
    `/districts/${districtId}/wards`,
    token
  );
  return data?.wards ?? [];
}

/** Bo dau, thuong hoa de so sanh ten dia ly (Ha Noi = "ha noi" = "Hà Nội"). */
export function normalizeGeoText(value?: string | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tim id cua muc dia ly khop voi ten/code da luu tren dia chi cu.
 * Uuoi ten (khop day du, roi khop gan dung), sau do moi den code.
 * Tra null neu khong tim thay -> goi chon de nguoi dung chon lai.
 */
export function findGeoId(
  items: GeoItem[] | null | undefined,
  name?: string | null,
  code?: string | null
): number | null {
  if (!items?.length) return null;
  const target = normalizeGeoText(name);
  if (target) {
    const exact = items.find((item) => normalizeGeoText(item.name) === target);
    if (exact) return exact.id;
    const partial = items.find((item) => {
      const itemText = normalizeGeoText(item.name);
      return (
        itemText.includes(target) ||
        (target.length > 2 && target.includes(itemText))
      );
    });
    if (partial) return partial.id;
  }
  const targetCode = (code ?? "").trim();
  if (targetCode) {
    const byCode = items.find(
      (item) =>
        (item.code ?? "").trim().toLowerCase() === targetCode.toLowerCase() ||
        String(item.id) === targetCode
    );
    if (byCode) return byCode.id;
  }
  return null;
}
