import type { Metadata } from "next";
import "./globals.css";
import LivePresenceWidget from "@/components/LivePresenceWidget";
import { Toaster } from "sonner";

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
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700&family=Sora:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
        <Toaster theme="dark" position="bottom-right" />
        <LivePresenceWidget />
      </body>
    </html>
  );
}
