import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Filson is the brand's primary face but needs a web licence; Inter (secondary, free) until then.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Ship Ease Hub", template: "%s · Ship Ease Hub" },
  description: "Ship from Nigeria to the world, and shop from the USA, UK and China to Nigeria.",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "Ship Ease Hub", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#00002E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
