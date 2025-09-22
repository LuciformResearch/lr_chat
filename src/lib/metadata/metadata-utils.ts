import type { Metadata } from "next";

interface MetadataOptions {
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  keywords?: string[];
  noIndex?: boolean;
}

export function createPageMetadata({
  title,
  description,
  image = "/banner.jpeg",
  imageAlt = "LR Hub™",
  keywords = [],
  noIndex = false,
}: MetadataOptions): Metadata {
  const baseUrl = "https://luciformresearch.com";
  
  return {
    title,
    description,
    keywords: [...keywords, "LR Hub", "Intelligence Artificielle", "Lucie Defraiteur"],
    
    openGraph: {
      title: `${title} | LR Hub™`,
      description,
      url: baseUrl,
      siteName: "LR Hub™",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
      locale: "fr_FR",
      type: "website",
    },
    
    twitter: {
      card: "summary_large_image",
      title: `${title} | LR Hub™`,
      description,
      images: [image],
      creator: "@luciformresearch",
    },
    
    robots: noIndex ? {
      index: false,
      follow: false,
    } : {
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
  };
}

// Métadonnées prédéfinies pour les pages communes
export const commonMetadata = {
  chat: createPageMetadata({
    title: "Chat IA",
    description: "Interface de chat avec intelligence artificielle avancée - Algareth et autres agents conversationnels.",
    keywords: ["Chat", "IA", "Algareth", "Conversation", "Agent"],
  }),
  
  memory: createPageMetadata({
    title: "Mémoire",
    description: "Système de mémoire hiérarchique et persistante pour les conversations IA.",
    keywords: ["Mémoire", "IA", "Persistance", "Hiérarchique"],
  }),
  
  settings: createPageMetadata({
    title: "Paramètres",
    description: "Configuration de votre compte et préférences sur LR Hub™.",
    keywords: ["Paramètres", "Configuration", "Compte", "Préférences"],
  }),
  
  auth: createPageMetadata({
    title: "Authentification",
    description: "Connexion et inscription sur LR Hub™ - Plateforme d'intelligence artificielle.",
    keywords: ["Connexion", "Inscription", "Authentification", "Compte"],
    noIndex: true, // Ne pas indexer les pages d'auth
  }),
};