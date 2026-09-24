import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const splash = [
  [1170, 2532, 390, 844],
  [1179, 2556, 393, 852],
  [1206, 2622, 402, 874],
  [1290, 2796, 430, 932],
  [750, 1334, 375, 667],
] as const;

export const metadata: Metadata = {
  title: { default: "AIVA — Seu segundo cérebro", template: "%s · AIVA" },
  description: "AIVA organiza sua vida, trabalho e conteúdo num só sistema inteligente — com IA e voz.",
  applicationName: "AIVA",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "AIVA",
    statusBarStyle: "black-translucent",
    startupImage: splash.map(([w, h, dw, dh]) => ({
      url: `/icons/splash-${w}x${h}.png`,
      media: `(device-width: ${dw}px) and (device-height: ${dh}px) and (-webkit-device-pixel-ratio: ${Math.round(w / dw)}) and (orientation: portrait)`,
    })),
  },
  formatDetection: { telephone: false },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#07070c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="aiva-ambient antialiased">{children}</body>
    </html>
  );
}
