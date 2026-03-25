import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PrivyProvider from "@/components/auth/PrivyProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fishing Frenzy — Chapter 3: Guild Wars",
  description:
    "It's time for Guild Wars. Drop your pin, rep your guild, and rally your crew for Chapter 3 of Fishing Frenzy.",
  openGraph: {
    title: "Fishing Frenzy — Chapter 3: Guild Wars",
    description:
      "It's time for Guild Wars. Drop your pin, rep your guild, and rally your crew.",
    type: "website",
    siteName: "Fishing Frenzy",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fishing Frenzy — Chapter 3: Guild Wars",
    description: "It's time for Guild Wars. Rep your guild.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden page-bg text-[#F0F4F8]">
        <PrivyProvider>{children}</PrivyProvider>
      </body>
    </html>
  );
}
