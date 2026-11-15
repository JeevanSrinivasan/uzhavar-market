import { supabase } from '../lib/supabase.js'

export default async function sitemap() {
  const baseUrl = 'https://uzhavarmarket.netlify.app'
  const currentDate = new Date().toISOString()

  // 1. Static Public Pages
  const staticRoutes = [
    {
      url: `${baseUrl}`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/shipping-policy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/refund-policy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/community-guidelines`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // 2. Dynamic Public Product Detail Pages
  let productRoutes = []
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, created_at')
      .eq('status', 'active')

    if (!error && Array.isArray(products)) {
      productRoutes = products.map((prod) => ({
        url: `${baseUrl}/products/${prod.id}`,
        lastModified: prod.created_at || currentDate,
        changeFrequency: 'weekly',
        priority: 0.9,
      }))
    }
  } catch (err) {
    console.warn('Sitemap dynamic products fetch note:', err)
  }

  // Fallback known active product IDs if network was unavailable during build
  if (productRoutes.length === 0) {
    const knownProductIds = [
      '210166e8-b0ac-4789-aedc-4445a6254780', // Karupatti
      'e1c4f9bb-85a2-41ab-a40b-0da5376f01af', // Seaweed liquid
      'cbc3fc3d-2c27-4843-a9e0-dcb5c60e0860', // Humic liquid
      '6b1fcd3b-6482-4bdb-9284-63d6bd93c931', // Organic complex
      '932a90c0-4b44-4cf4-9706-d57fb823f107', // Fish amino acid
    ]
    productRoutes = knownProductIds.map((id) => ({
      url: `${baseUrl}/products/${id}`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    }))
  }

  return [...staticRoutes, ...productRoutes]
}
