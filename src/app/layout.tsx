import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Stands in for SF Pro, which Apple does not license for the web. Inter's
// proportions are close enough that the chrome still reads as macOS on a
// machine that has never had SF installed.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Digitizing Market — Machine embroidery designs",
  description:
    "Hand-digitized machine embroidery designs in every format, delivered the moment you buy. DST, PES, JEF, VP3 and EXP with a colour chart.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // The desktop is a fixed surface; letting it zoom breaks window dragging.
  maximumScale: 1,
  themeColor: "#2b6d80",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
