"use client";

import HaravanShell from "@/components/haravan/HaravanShell";

export default function InventoryUnsupportedPage({ title, icon, note }: { title: string; icon: string; note: string }) {
  return <HaravanShell title={title}><div className="mx-auto grid min-h-[50vh] w-full max-w-3xl place-items-center"><section className="w-full rounded-2xl border border-[#e6e9df] bg-white p-8 text-center dark:border-[#363b31] dark:bg-[#20231f]"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f3f5ef] text-2xl text-[#71836a] dark:bg-[#30392c]"><i className={`pi ${icon}`} /></span><h2 className="mt-4 text-lg font-bold">Chưa có API để đồng bộ {title.toLowerCase()}</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#73796f] dark:text-[#b3b9ad]">{note}</p><p className="mt-4 rounded-xl bg-[#fff8e8] px-4 py-3 text-xs leading-5 text-[#826624]">Trang đang hiển thị trạng thái chờ API; chưa tạo dữ liệu giả hoặc lưu thông tin cục bộ.</p></section></div></HaravanShell>;
}
