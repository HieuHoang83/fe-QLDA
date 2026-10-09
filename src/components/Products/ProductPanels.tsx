import type { ReactNode } from "react";

/** Khung panel dÃ¹ng chung: tieu de + noi dung. */
export function Frame({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col overflow-hidden rounded-2xl border border-[#e8e9e2] bg-white shadow-[0_4px_24px_rgba(30,40,25,0.045)] dark:border-[#363b31] dark:bg-[#20231f] ${className}`}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-[#eeefe9] px-5 py-4 dark:border-[#363b31]">
        <i className={`pi ${icon} text-[#71836a]`} aria-hidden="true" />
        <h2 className="font-extrabold">{title}</h2>
      </header>
      <div className="flex-1 px-5 py-4">{children}</div>
    </section>
  );
}

/** Một dòng thông tin căn phải. */
export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#f2f3ef] py-2.5 text-sm last:border-0 dark:border-[#30342e]">
      <span className="shrink-0 text-[#858a80] dark:text-[#aeb4a8]">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

