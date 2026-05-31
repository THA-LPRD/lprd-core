import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.convex.cloud',
            },
        ],
    },
    output: 'standalone',
    // Required for standalone output to correctly trace files outside apps/web
    // (e.g. packages/shared) relative to the monorepo root.
    outputFileTracingRoot: path.join(__dirname, '../../'),
    transpilePackages: ['@lprd/backend', '@lprd/lprd-shared', '@lprd/ui'],
};

export default nextConfig;
