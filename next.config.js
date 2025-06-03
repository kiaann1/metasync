/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://avatars.githubusercontent.com https://vercel.live",
              "font-src 'self' data:",
              "connect-src 'self' https://api.github.com https://vercel.live wss://ws-us3.pusher.com",
              "frame-src 'self' https://vercel.live",
            ].join('; ')
          }
        ]
      }
    ];
  }
}

module.exports = nextConfig