import type { Metadata } from "next";

import Login from "@/components/auth/auth.signin";

export const metadata: Metadata = {
  title: "Dang nhap",
  description: "Dang nhap bang so dien thoai hoac tai khoan Haravan",
};

/**
 * Trang dang nhap: chon mot trong hai cach.
 *
 *   1. Tai khoan co san trong he thong (so dien thoai + mat khau).
 *   2. Tai khoan Haravan (Nut "Dang nhap bang Haravan").
 */
export default function LoginPage() {
  return <Login />;
}
