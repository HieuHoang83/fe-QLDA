import Themefull from "@/components/Theme/Theme";
import NextAuthWrapper from "@/library/nextauth.provider";
import ThemeProvider from "@/library/ThemeProvider";
import NProgressWrapper from "@/library/nextprogressBar.wrapper";
import ReactQueryProvider from "@/lib/providers/ReactQueryProvider";
import { Toaster } from "@/components/ui/primitives/sonner";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "./globals.css";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primeicons/primeicons.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "University App",
  description: "Ứng dụng quản lý đại học",
};

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NProgressWrapper>
          <NextIntlClientProvider messages={messages}>
            <NextAuthWrapper>
              <ReactQueryProvider>
                <ThemeProvider>
                  <Themefull>
                    {children}
                    <Toaster />
                  </Themefull>
                </ThemeProvider>
              </ReactQueryProvider>
            </NextAuthWrapper>
          </NextIntlClientProvider>
        </NProgressWrapper>
      </body>
    </html>
  );
}
