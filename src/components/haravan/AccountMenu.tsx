"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";

export default function AccountMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          title="Tài khoản"
          aria-label="Mở menu tài khoản"
          aria-expanded={open}
          className="grid h-9 w-9 place-items-center rounded-md bg-[#34b49b] font-bold text-white hover:brightness-95"
        >
          {session?.user?.name?.charAt(0) || "A"}
        </button>
        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-[#e2e7ef] bg-white p-2 shadow-xl">
            <button
              type="button"
              onClick={() => { setOpen(false); setProfileOpen(true); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#344054] hover:bg-[#f5f7fa]"
            >
              <i className="pi pi-user-edit" aria-hidden="true" />Chỉnh sửa thông tin
            </button>
            <button
              type="button"
              onClick={() => void signOut({ redirect: false })}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#b42318] hover:bg-[#fff3f2]"
            >
              <i className="pi pi-sign-out" aria-hidden="true" />Đăng xuất
            </button>
          </div>
        )}
      </div>

      {profileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-title"
          className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setProfileOpen(false); }}
        >
          <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 id="profile-title" className="text-lg font-bold text-[#20231f]">Chỉnh sửa thông tin</h2>
              <button type="button" onClick={() => setProfileOpen(false)} aria-label="Đóng" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-[#f5f7fa]"><i className="pi pi-times" /></button>
            </div>
            <label className="mb-4 block text-sm font-medium text-[#475467]">Tên tài khoản<input defaultValue={session?.user?.name || ""} className="mt-1.5 h-11 w-full rounded-lg border border-[#d0d5dd] px-3 outline-none focus:border-[#527b49]" /></label>
            <label className="block text-sm font-medium text-[#475467]">Số điện thoại<input defaultValue={session?.user?.phone || ""} className="mt-1.5 h-11 w-full rounded-lg border border-[#d0d5dd] px-3 outline-none focus:border-[#527b49]" /></label>
            <div className="mt-6 flex justify-end"><button type="button" onClick={() => setProfileOpen(false)} className="h-10 rounded-lg border border-[#d0d5dd] px-4 text-sm font-semibold">Đóng</button></div>
          </section>
        </div>
      )}
    </>
  );
}
