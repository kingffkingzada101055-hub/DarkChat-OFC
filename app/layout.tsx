import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DarkChat",
  description: "DarkChat — sua IA, seu app.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0505",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-dc-black text-dc-white min-h-screen">{children}</body>
    </html>
  );
}
