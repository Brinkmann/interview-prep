import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interview Prep",
  description: "Get ready for your interview, using what you've already done.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-NZ">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
