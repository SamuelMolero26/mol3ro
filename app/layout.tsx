import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { EB_Garamond, Geist_Mono, JetBrains_Mono } from "next/font/google";
import { DOMAIN } from "@/lib/site";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const title = "Samuel Molero — Software Engineer";
const description =
  "Software engineer · new grad. Retro desktop OS portfolio — github, shell, and contact.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL(`https://${DOMAIN}`),
  openGraph: { title, description, type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${jetbrainsMono.variable} ${ebGaramond.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
