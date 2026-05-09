/** @type {import('next').NextConfig} */
const nextConfig = {
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        // Evita que la app se cargue en un iframe (clickjacking)
        { key: 'X-Frame-Options', value: 'DENY' },
        // Evita que el browser detecte el MIME type distinto al declarado
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        // Controla cuánta info de referrer se manda al navegar
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        // Deshabilita features del browser que no usamos
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
        },
        // Content Security Policy — restringe de dónde se pueden cargar recursos
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            // Next.js necesita inline scripts para hydration
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            // Estilos inline de Tailwind + Google Fonts
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            // Fuentes de Google Fonts
            "font-src 'self' https://fonts.gstatic.com",
            // Imágenes solo del mismo origen y data URIs
            "img-src 'self' data: blob:",
            // Conexiones permitidas: mismo origen + Supabase
            `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
            "frame-ancestors 'none'",
          ].join('; '),
        },
        // HSTS: fuerza HTTPS por 1 año en producción
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains',
        },
      ],
    },
  ],
}

module.exports = nextConfig
