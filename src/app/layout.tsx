import type { Metadata, Viewport } from "next";
import { Noto_Kufi_Arabic, Space_Grotesk } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({
  variable: "--font-grotesk-face",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const kufi = Noto_Kufi_Arabic({
  variable: "--font-kufi-face",
  subsets: ["arabic"],
  weight: ["600", "800"],
});

export const metadata: Metadata = {
  title: "SURA Dubai — Geospatial sky operating system",
  description:
    "From the guidance of stars to engineering the clouds. SURA divides Dubai's sky into addressed cells and engineers air routes through them.",
};

export const viewport: Viewport = {
  themeColor: "#0B1B33",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${grotesk.variable} ${kufi.variable} antialiased`}>{children}</body>
    </html>
  );
}
