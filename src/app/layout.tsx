import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { LanguageProvider } from "@/lib/language/LanguageProvider";
// import { DevPersistencePanel } from "@/components/dev/DevPersistencePanel"; // Temporairement désactivé pour la démo

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://luciformresearch.com'),
  title: {
    default: "LR Hub™ - Intelligence Artificielle & Développement",
    template: "%s | LR Hub™"
  },
  description: "Plateforme d'intelligence artificielle avancée avec agents conversationnels, mémoire hiérarchique et outils de développement. Créé par Lucie Defraiteur.",
  keywords: ["IA", "Intelligence Artificielle", "Chatbot", "Développement", "Lucie Defraiteur", "LR Hub"],
  authors: [{ name: "Lucie Defraiteur", url: "https://luciformresearch.com" }],
  creator: "Lucie Defraiteur",
  publisher: "Luciform Research",
  
  // Open Graph
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://luciformresearch.com",
    siteName: "LR Hub™",
    title: "LR Hub™ - Intelligence Artificielle & Développement",
    description: "Plateforme d'intelligence artificielle avancée avec agents conversationnels, mémoire hiérarchique et outils de développement.",
    images: [
      {
        url: "/banner.jpeg",
        width: 1200,
        height: 630,
        alt: "LR Hub™ - Plateforme d'IA",
      },
    ],
  },
  
  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "LR Hub™ - Intelligence Artificielle & Développement",
    description: "Plateforme d'intelligence artificielle avancée avec agents conversationnels et outils de développement.",
    images: ["/banner.jpeg"],
    creator: "@luciformresearch",
  },
  
  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  
  // Verification
  verification: {
    google: "your-google-verification-code", // À remplacer si tu en as un
  },
  
  // Icons
  icons: {
    icon: [
      { url: "/pentagram_icon_transparent.png", sizes: "32x32", type: "image/png" },
      { url: "/pentagram_icon_transparent.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/pentagram_icon_transparent.png", sizes: "180x180", type: "image/png" },
    ],
  },
  
  // Manifest
  manifest: "/manifest.json",
  
  // Métadonnées spécifiques par route
  alternates: {
    canonical: "https://luciformresearch.com",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          <ThemeProvider>
            <AuthProvider>
              {children}
              {/* <DevPersistencePanel /> */} {/* Temporairement désactivé pour la démo */}
            </AuthProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
