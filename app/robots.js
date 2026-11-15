export default function robots() {
  const baseUrl = 'https://uzhavarmarket.netlify.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/*',
          '/farmer',
          '/farmer/*',
          '/customer',
          '/customer/*',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/auth/*',
          '/cart',
          '/checkout',
          '/orders',
          '/orders/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
