import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Providers } from "./providers";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/lib/language-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "سويفت بيل — نظام نقاط البيع",
  description: "Gestiona Pro — نظام احترافي متكامل لتسيير وإدارة المتاجر. إدارة المبيعات، المخزون، الفواتير، الموردين والجرد بسهولة.",
  keywords: ["POS", "نقاط البيع", "فوترة", "تجزئة", "فاتورة", "باركود"],
  authors: [{ name: "SwiftBill" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Default to Arabic RTL — the LanguageProvider will manage dir/lang dynamically
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <Providers>
              {children}
            </Providers>
          </LanguageProvider>
        </ThemeProvider>
        <Toaster />
        <Sonner />
      </body>
    </html>
  );
}
