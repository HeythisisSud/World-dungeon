import type { Metadata, Viewport } from "next";
import { Cinzel, IM_Fell_English } from "next/font/google";
import "./globals.css";
import { QuestProvider } from "@/context/QuestContext";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  weight: ["400", "600", "700", "900"],
  display: "swap",
});

const imFellEnglish = IM_Fell_English({
  subsets: ["latin"],
  variable: "--font-lore",
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WORLD DUNGEON",
  description: "Your neighborhood holds secrets. Walk them.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WORLD DUNGEON",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cinzel.variable} ${imFellEnglish.variable}`}>
      <body className="bg-dungeon-bg text-dungeon-parchment antialiased selection:bg-dungeon-gold selection:text-dungeon-bg">
        <QuestProvider>{children}</QuestProvider>
      </body>
    </html>
  );
}
