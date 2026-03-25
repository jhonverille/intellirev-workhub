import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import { WorkHubProvider } from "@/lib/work-hub-store";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Work Hub",
  description:
    "A personal productivity dashboard for tasks, projects, notes, and quick links.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${newsreader.variable} antialiased`}>
        <WorkHubProvider>{children}</WorkHubProvider>
      </body>
    </html>
  );
}
