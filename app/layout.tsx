import type { Metadata } from "next";
import type { ReactNode } from "react";
import { asset } from "@/lib/asset";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Platy Pirates | FRC Team 9181",
    template: "%s | Platy Pirates 9181",
  },
  description: "Platy Pirates — FRC Team 9181, an all-girls FIRST Robotics Competition team.",
  icons: { icon: asset("/favicon.svg") },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600..900&family=Work+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
