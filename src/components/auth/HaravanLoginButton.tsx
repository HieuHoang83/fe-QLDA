"use client";

import { useEffect, useState } from "react";
import {
  getHaravanLoginConfig,
  haravanLoginUrl,
} from "@/services/api/auth";

/**
 * Nut dang nhap bang tai khoan Haravan, dung chung cho cac man hinh dang nhap.
 *
 * App co nhieu man dang nhap (dashboard don hang, trang `/auth/login`), neu moi noi viet rieng
 * mot lan thi se lech nhau ngay khi doi mot trong hai.
 *
 * Mac dinh hien, chi an khi backend tra `enabled: false`. Neu mac dinh an thi chi mot loi mang
 * (backend chua chay, CORS) cung lam bien mat luon tinh nang ma nguoi dung khong hieu vi sao.
 */
let configPromise: ReturnType<typeof getHaravanLoginConfig> | null = null;

/** Hoi backend mot lan cho ca phien, cac man hinh sau dung lai ket qua. */
function loadConfig() {
  if (!configPromise) {
    configPromise = getHaravanLoginConfig().catch(() => null);
  }
  return configPromise;
}

export default function HaravanLoginButton({
  className = "",
}: {
  className?: string;
}) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    void loadConfig().then((config) => {
      if (config) setEnabled(config.enabled);
    });
  }, []);

  if (!enabled) return null;

  /**
   * Chuyen trinh duyet sang Haravan.
   *
   * Phai dung `location.assign` chu khong phai router.push: phai ra khoi may chu NextAuth sang
   * domain khac, router client-side khong lam duoc.
   */
  function startLogin() {
    const url = haravanLoginUrl();
    if (url) window.location.assign(url);
  }

  return (
    <div className={className}>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[#9aa39a]">
        <span className="h-px flex-1 bg-current opacity-30" />
        <span>Hoặc</span>
        <span className="h-px flex-1 bg-current opacity-30" />
      </div>
      <button
        type="button"
        onClick={startLogin}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#d7dcd0] bg-white px-5 text-sm font-bold text-[#344054] transition hover:bg-[#f5f7f2] dark:border-[#40453b] dark:bg-[#191c18] dark:text-[#e6eadf] dark:hover:bg-[#262a24]"
      >
        <img
          src="https://img.shields.io/badge/Haravan-ff6a00?style=for-the-badge&logo=haravan&logoColor=white"
          alt="Haravan"
          className="h-6"
        />
      </button>
      <p className="mt-2 text-center text-xs text-[#8b9389] dark:text-[#9aa39a]">
        Dùng tài khoản Haravan, không cần mật khẩu
      </p>
    </div>
  );
}
