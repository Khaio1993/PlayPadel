import type { Metadata } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-digital",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "PlayPadel - Organisez vos tournois Americano",
  description: "Application pour organiser des tournois de padel Americano mixte",
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8ebed" },
    { media: "(prefers-color-scheme: dark)", color: "#1a212d" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PlayPadel",
  },
  icons: {
    icon: [
      { url: "/iconapp.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} ${orbitron.variable} antialiased`}
      >
        <AuthProvider>
        {children}
        </AuthProvider>
      </body>
    </html>
  );
}
