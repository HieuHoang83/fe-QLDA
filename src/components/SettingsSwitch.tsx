"use client";

import { useSettings } from "@/context/SettingsContext";

interface SettingSwitchProps {
  key: keyof ReturnType<typeof useSettings>;
  label: string;
}

export default function SettingSwitch({ key, label }: SettingSwitchProps) {
  const { showCustomerOrderNumber, setShowCustomerOrderNumber } = useSettings();

  const value = showCustomerOrderNumber;
  const onChange = (checked: boolean) => setShowCustomerOrderNumber(checked);

  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-[#555b51] dark:text-[#d0d4ca]">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-[#c9cdc3] text-[#466d40] focus:ring-2 focus:ring-[#466d40] focus:ring-offset-2 dark:border-[#5a5f55] dark:bg-[#191c18] dark:focus:ring-offset-[#191c18]"
      />
      <span>{label}</span>
    </label>
  );
}