import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const sans = Manrope({ subsets: ["latin"], variable: "--font-sans-family", display: "swap" });
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display-family",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "R Beauty OS", template: "%s · R Beauty OS" },
  description: "Command Center — sistema operacional interno da R Beauty.",
  robots: { index: false, follow: false },
  applicationName: "R Beauty OS",
};

export const viewport: Viewport = {
  themeColor: "#1e1a18",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
