"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listCountries,
  listDistricts,
  listProvinces,
  listWards,
  findGeoId,
  type GeoItem,
} from "@/services/api/geo";

/** Gia tri dia chi dung chung cho form tao/sua khach hang va form dia chi. */
export interface GeoAddressValue {
  address1: string;
  address2: string;
  city: string;
  zip: string;
  country: string;
  country_code: string;
  province: string;
  province_code: string;
  district: string;
  district_code: string;
  ward: string;
  ward_code: string;
}

export function emptyGeoAddress(): GeoAddressValue {
  return {
    address1: "",
    address2: "",
    city: "",
    zip: "",
    country: "Việt Nam",
    country_code: "",
    province: "",
    province_code: "",
    district: "",
    district_code: "",
    ward: "",
    ward_code: "",
  };
}

/** Co bat ky noi dung dia chi nao khong (dung de bat buoc chon phuong/xa). */
export function hasAddressContent(address: GeoAddressValue): boolean {
  return [
    address.address1,
    address.address2,
    address.city,
    address.province,
    address.district,
    address.ward,
    address.zip,
  ].some((field) => field.trim() !== "");
}

export const addressInputClass =
  "h-11 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]";

export function AddressField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">
        {label}
        {required && <span className="text-[#c05621]"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={addressInputClass}
      />
    </label>
  );
}

export function GeoSelect({
  label,
  value,
  items,
  placeholder,
  onChange,
  loading,
  disabled,
  required,
}: {
  label: string;
  value: number | null;
  items: GeoItem[];
  placeholder: string;
  onChange: (value: number | null) => void;
  loading?: boolean;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">
        {label}
        {required && <span className="text-[#c05621]"> *</span>}
      </span>
      <div className="relative">
        <select
          value={value ?? ""}
          disabled={disabled || loading}
          onChange={(event) =>
            onChange(
              event.target.value === "" ? null : Number(event.target.value)
            )
          }
          className={`${addressInputClass} cursor-pointer appearance-none pr-9 disabled:cursor-wait`}
        >
          <option value="">{placeholder}</option>
          {items.map(
            (item) =>
              item.id != null && (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              )
          )}
        </select>
        <i
          className="pi pi-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#858a80]"
          aria-hidden="true"
        />
      </div>
      {loading && (
        <span className="mt-1 block text-xs text-[#858a80]">Đang tải...</span>
      )}
    </label>
  );
}

const GEO_KEYS = [
  "country",
  "country_code",
  "province",
  "province_code",
  "district",
  "district_code",
  "ward",
  "ward_code",
] as const;

/**
 * Khoi dia chi day du: dia chi 1/2 + quoc gia -> tinh -> quan -> phuong (select)
 * lay danh muc tu Haravan. Neu danh muc tai that bai se tu chuyen sang nhap tay.
 */
export function AddressGeoFields({
  token,
  orgId,
  value,
  onChange,
  address1Required,
}: {
  token: string;
  orgId: string;
  value: GeoAddressValue;
  onChange: (patch: Partial<GeoAddressValue>) => void;
  address1Required?: boolean;
}) {
  const [geoStatus, setGeoStatus] = useState<"loading" | "ready" | "failed">(
    "loading"
  );
  const [countries, setCountries] = useState<GeoItem[]>([]);
  const [provinces, setProvinces] = useState<GeoItem[] | null>(null);
  const [districts, setDistricts] = useState<GeoItem[] | null>(null);
  const [wards, setWards] = useState<GeoItem[] | null>(null);
  const [countryId, setCountryId] = useState<number | null>(null);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [wardId, setWardId] = useState<number | null>(null);

  // Chon theo id da chon, neu chua chon thi khop voi ten/code cu tren dia chi.
  const selectedCountryId =
    countryId ?? findGeoId(countries, value.country, value.country_code);
  const selectedProvinceId =
    provinceId ?? findGeoId(provinces, value.province, value.province_code);
  const selectedDistrictId =
    districtId ?? findGeoId(districts, value.district, value.district_code);
  const selectedWardId = wardId ?? findGeoId(wards, value.ward, value.ward_code);

  useEffect(() => {
    if (!token || !orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const countryList = await listCountries(token, orgId);
        if (cancelled) return;
        setCountries(countryList);
        const vietnam =
          countryList.find((item) => (item.code ?? "").toLowerCase() === "vn") ??
          countryList.find((item) =>
            /vi[eệ]t nam|vietnam/i.test(item.name ?? "")
          ) ??
          countryList[0] ??
          null;
        if (!vietnam) {
          throw new Error("Không tìm thấy quốc gia trong danh mục Haravan.");
        }
        setCountryId(vietnam.id);
        onChange({
          country: vietnam.name ?? "",
          country_code: vietnam.code ?? "",
        });
        setProvinces(await listProvinces(token, orgId, vietnam.id));
        setGeoStatus("ready");
      } catch (loadError) {
        if (cancelled) return;
        setGeoStatus("failed");
        setProvinces(null);
        toast.error(
          `Không tải được danh mục địa lý, ô địa chỉ chuyển sang nhập tay: ${
            loadError instanceof Error ? loadError.message : ""
          }`
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // chi chay 1 lan khi mount; onChange ong bang tham chieu ong doi hanh vi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, orgId]);

  useEffect(() => {
    if (geoStatus !== "ready" || !token || !orgId) return;
    if (selectedProvinceId == null) {
      setDistricts(null);
      return;
    }
    let cancelled = false;
    setDistricts(null);
    listDistricts(token, orgId, selectedProvinceId)
      .then((list) => {
        if (!cancelled) setDistricts(list);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setGeoStatus("failed");
        toast.error(
          `Không tải được danh sách quận/huyện, nhập tay: ${
            loadError instanceof Error ? loadError.message : ""
          }`
        );
      });
    return () => {
      cancelled = true;
    };
  }, [geoStatus, token, orgId, selectedProvinceId]);

  useEffect(() => {
    if (geoStatus !== "ready" || !token || !orgId) return;
    if (selectedDistrictId == null) {
      setWards(null);
      return;
    }
    let cancelled = false;
    setWards(null);
    listWards(token, orgId, selectedDistrictId)
      .then((list) => {
        if (!cancelled) setWards(list);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setGeoStatus("failed");
        toast.error(
          `Không tải được danh sách phường/xã, nhập tay: ${
            loadError instanceof Error ? loadError.message : ""
          }`
        );
      });
    return () => {
      cancelled = true;
    };
  }, [geoStatus, token, orgId, selectedDistrictId]);

  // Dong bo ten/code moi tu danh muc Haravan vao form (sua dia chi cu).
  useEffect(() => {
    if (geoStatus !== "ready") return;
    const countryItem = countries.find(
      (item) => item.id === selectedCountryId
    );
    const provinceItem = provinces?.find(
      (item) => item.id === selectedProvinceId
    );
    const districtItem = districts?.find(
      (item) => item.id === selectedDistrictId
    );
    const wardItem = wards?.find((item) => item.id === selectedWardId);
    const patch: Partial<GeoAddressValue> = {};
    const next: Record<string, string | null | undefined> = {
      country: countryItem?.name,
      country_code: countryItem?.code,
      province: provinceItem?.name,
      province_code: provinceItem?.code,
      district: districtItem?.name,
      district_code: districtItem?.code,
      ward: wardItem?.name,
      ward_code: wardItem?.code,
    };
    for (const key of GEO_KEYS) {
      const incoming = next[key];
      if (incoming != null && incoming !== value[key]) {
        patch[key] = incoming;
      }
    }
    if (Object.keys(patch).length > 0) onChange(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    geoStatus,
    countries,
    provinces,
    districts,
    wards,
    selectedCountryId,
    selectedProvinceId,
    selectedDistrictId,
    selectedWardId,
  ]);

  function resetGeoSelection() {
    setProvinceId(null);
    setDistrictId(null);
    setWardId(null);
  }

  function changeCountry(id: number | null) {
    setCountryId(id);
    resetGeoSelection();
    setDistricts(null);
    setWards(null);
    const item = countries.find((country) => country.id === id) ?? null;
    onChange({
      country: item?.name ?? "",
      country_code: item?.code ?? "",
      province: "",
      province_code: "",
      district: "",
      district_code: "",
      ward: "",
      ward_code: "",
    });
  }

  function changeProvince(id: number | null) {
    setProvinceId(id);
    resetGeoSelection();
    setWards(null);
    const item = provinces?.find((province) => province.id === id) ?? null;
    onChange({
      province: item?.name ?? "",
      province_code: item?.code ?? "",
      district: "",
      district_code: "",
      ward: "",
      ward_code: "",
    });
  }

  function changeDistrict(id: number | null) {
    setDistrictId(id);
    setWardId(null);
    const item = districts?.find((district) => district.id === id) ?? null;
    onChange({
      district: item?.name ?? "",
      district_code: item?.code ?? "",
      ward: "",
      ward_code: "",
    });
  }

  function changeWard(id: number | null) {
    setWardId(id);
    const item = wards?.find((ward) => ward.id === id) ?? null;
    onChange({
      ward: item?.name ?? "",
      ward_code: item?.code ?? "",
    });
  }

  if (geoStatus === "failed") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <AddressField
            label="Địa chỉ"
            required={address1Required}
            placeholder="Số nhà, tên đường"
            value={value.address1}
            onChange={(next) => onChange({ address1: next })}
          />
        </div>
        <AddressField
          label="Địa chỉ (dòng 2)"
          placeholder="Toà nhà, căn hộ, khu vực..."
          value={value.address2}
          onChange={(next) => onChange({ address2: next })}
        />
        <AddressField
          label="Quốc gia"
          value={value.country}
          onChange={(next) => onChange({ country: next })}
        />
        <AddressField
          label="Tỉnh / Thành phố"
          value={value.province}
          onChange={(next) => onChange({ province: next })}
        />
        <AddressField
          label="Thành phố / Thị xã"
          value={value.city}
          onChange={(next) => onChange({ city: next })}
        />
        <AddressField
          label="Quận / Huyện"
          value={value.district}
          onChange={(next) => onChange({ district: next })}
        />
        <AddressField
          label="Phường / Xã"
          value={value.ward}
          onChange={(next) => onChange({ ward: next })}
        />
        <AddressField
          label="Mã bưu điện"
          value={value.zip}
          onChange={(next) => onChange({ zip: next })}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <AddressField
        label="Địa chỉ"
        required={address1Required}
        placeholder="Số nhà, tên đường"
        value={value.address1}
        onChange={(next) => onChange({ address1: next })}
      />
      <AddressField
        label="Địa chỉ (dòng 2)"
        placeholder="Toà nhà, căn hộ, khu vực..."
        value={value.address2}
        onChange={(next) => onChange({ address2: next })}
      />
      <GeoSelect
        label="Quốc gia"
        items={countries}
        value={selectedCountryId}
        placeholder="Chọn quốc gia"
        onChange={changeCountry}
      />
      <GeoSelect
        label="Tỉnh / Thành phố"
        required
        items={provinces ?? []}
        value={selectedProvinceId}
        placeholder={provinces ? "Chọn Tỉnh / Thành phố" : "Đang tải..."}
        loading={!provinces}
        onChange={changeProvince}
      />
      <AddressField
        label="Thành phố / Thị xã"
        placeholder="Tên thành phố/thị xã (nếu có)"
        value={value.city}
        onChange={(next) => onChange({ city: next })}
      />
      <GeoSelect
        label="Quận / Huyện"
        items={districts ?? []}
        value={selectedDistrictId}
        placeholder={
          selectedProvinceId == null
            ? "Chọn trước Tỉnh / Thành phố"
            : districts
              ? "Chọn Quận / Huyện"
              : "Đang tải..."
        }
        disabled={selectedProvinceId == null}
        loading={selectedProvinceId != null && !districts}
        onChange={changeDistrict}
      />
      <GeoSelect
        label="Phường / Xã"
        required
        items={wards ?? []}
        value={selectedWardId}
        placeholder={
          selectedDistrictId == null
            ? "Chọn trước Quận / Huyện"
            : wards
              ? "Chọn Phường / Xã"
              : "Đang tải..."
        }
        disabled={selectedDistrictId == null}
        loading={selectedDistrictId != null && !wards}
        onChange={changeWard}
      />
      <AddressField
        label="Mã bưu điện"
        value={value.zip}
        onChange={(next) => onChange({ zip: next })}
      />
    </div>
  );
}
