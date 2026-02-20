import type { Metadata } from "next";
import "./globals.css";
import LivePresenceWidget from "@/components/LivePresenceWidget";
import OfflineSyncManager from "@/components/OfflineSyncManager";

export const metadata: Metadata = {
  title: "FencingHub by StowAg",
  description: "Project, quotes, installs, and approvals in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
        <OfflineSyncManager />
        <LivePresenceWidget />
      </body>
    </html>
  );
}
