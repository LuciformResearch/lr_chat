import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Utiliser le dossier vercel-app pour le build
  distDir: '.next-vercel',
  
  // Optimisations pour réduire la taille
  compress: true,
  poweredByHeader: false,
  
  // Désactiver le linting strict pour le déploiement
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Configuration pour exclure certaines pages du build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Configuration pour les modules Node.js côté client
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclure les modules Node.js côté client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        util: false,
        buffer: false,
        events: false,
        querystring: false,
        punycode: false,
        readline: false,
        child_process: false,
        cluster: false,
        dgram: false,
        dns: false,
        domain: false,
        module: false,
        perf_hooks: false,
        process: false,
        timers: false,
        tty: false,
        v8: false,
        vm: false,
        worker_threads: false,
      };
      
      // Exclure les dépendances côté client (fastembed supprimé)
      config.externals = config.externals || [];
      config.externals.push({
        'onnxruntime-node': 'commonjs onnxruntime-node',
        'tar': 'commonjs tar',
        'chownr': 'commonjs chownr',
        'mkdirp': 'commonjs mkdirp',
        'fs-minipass': 'commonjs fs-minipass',
        'pg': 'commonjs pg',
        'pg-connection-string': 'commonjs pg-connection-string',
        'pgpass': 'commonjs pgpass',
      });
      
      // Ignorer complètement les modules problématiques
      config.plugins = config.plugins || [];
      config.plugins.push(
        new (require('webpack')).IgnorePlugin({
          resourceRegExp: /^(onnxruntime-node|tar|chownr|mkdirp|fs-minipass|pg|pg-connection-string|pgpass)$/,
        })
      );
    }
    return config;
  },
  
  // Configuration pour les packages externes
  experimental: {
    // Optimisations pour réduire la taille
    optimizePackageImports: ['@google/genai', '@google/generative-ai', 'langchain'],
  },
  
  // Configuration pour les packages externes (hors experimental)
  serverExternalPackages: ['onnxruntime-node', 'tar', 'pg'],
  
};

export default nextConfig;
