import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

// preload: false — иначе браузер ругается на неиспользованный preload одного из двух сабсетов (latin/cyrillic).
const inter = Inter({ subsets: ["latin", "cyrillic"], preload: false });

export const metadata: Metadata = {
  title: "VPN Platform Admin",
  description: "Внутренняя административная панель VPN Platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru" suppressHydrationWarning><body className={inter.className}><Providers>{children}</Providers></body></html>;
}
