import type { Metadata } from "next";

export const pageMetadata: Metadata = {
  title: "Accueil",
  description: "Bienvenue sur LR Hub™ - Plateforme d'intelligence artificielle avancée. Redirection vers le dashboard principal.",
  openGraph: {
    title: "LR Hub™ - Accueil",
    description: "Bienvenue sur LR Hub™ - Plateforme d'intelligence artificielle avancée avec agents conversationnels et outils de développement.",
    images: [
      {
        url: "/banner.jpeg",
        width: 1200,
        height: 630,
        alt: "LR Hub™ - Accueil",
      },
    ],
  },
  twitter: {
    title: "LR Hub™ - Accueil",
    description: "Bienvenue sur LR Hub™ - Plateforme d'intelligence artificielle avancée.",
    images: ["/banner.jpeg"],
  },
};

export const dashboardMetadata: Metadata = {
  title: "Dashboard",
  description: "Tableau de bord principal de LR Hub™ - Accédez à tous vos outils d'intelligence artificielle, conversations et paramètres.",
  openGraph: {
    title: "LR Hub™ - Dashboard",
    description: "Tableau de bord principal de LR Hub™ - Accédez à tous vos outils d'intelligence artificielle et conversations.",
    images: [
      {
        url: "/banner.jpeg",
        width: 1200,
        height: 630,
        alt: "LR Hub™ - Dashboard",
      },
    ],
  },
  twitter: {
    title: "LR Hub™ - Dashboard",
    description: "Tableau de bord principal de LR Hub™ - Accédez à tous vos outils d'IA.",
    images: ["/banner.jpeg"],
  },
};

export const cvMetadata: Metadata = {
  title: "CV - Lucie Defraiteur",
  description: "Découvrez le parcours professionnel de Lucie Defraiteur - Développeuse Full-Stack spécialisée en Intelligence Artificielle, React, Node.js et technologies modernes.",
  keywords: ["CV", "Lucie Defraiteur", "Développeuse", "Full-Stack", "IA", "React", "Node.js", "Parcours professionnel"],
  openGraph: {
    title: "CV - Lucie Defraiteur | LR Hub™",
    description: "Découvrez le parcours professionnel de Lucie Defraiteur - Développeuse Full-Stack spécialisée en Intelligence Artificielle.",
    images: [
      {
        url: "/photos_lucie/533471314_24132811813044480_7557385055835096359_n.jpg",
        width: 1200,
        height: 630,
        alt: "Lucie Defraiteur - Développeuse Full-Stack",
      },
    ],
  },
  twitter: {
    title: "CV - Lucie Defraiteur | LR Hub™",
    description: "Découvrez le parcours professionnel de Lucie Defraiteur - Développeuse Full-Stack spécialisée en IA.",
    images: ["/photos_lucie/533471314_24132811813044480_7557385055835096359_n.jpg"],
  },
};