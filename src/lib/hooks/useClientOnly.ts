'use client';

import { useState, useEffect } from 'react';

/**
 * Hook pour éviter les problèmes d'hydratation
 * Ne rend le composant que côté client
 */
export function useClientOnly() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}