import { supabase } from '@/lib/supabase'
import ProductDetailsClient from './ProductDetailsClient'

async function getProduct(id) {
  try {
    const { data: product } = await supabase
      .from('products')
      .select('*, profiles (full_name, farm_name, district, village)')
      .eq('id', id)
      .eq('status', 'active')
      .single()
    return product || null
  } catch (err) {
    console.warn('Product metadata fetch note:', err)
    return null
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const product = await getProduct(id)

  if (!product) {
    return {
      title: 'Product Details | Uzhavar Market',
      description: 'Discover fresh farm products directly from Tamil Nadu farmers at Uzhavar Market.',
      alternates: {
        canonical: `/products/${id}`,
      },
      robots: {
        index: false,
        follow: true,
      },
    }
  }

  const farmerName = product.profiles?.farm_name || product.profiles?.full_name || 'Tamil Nadu Farmer'
  const price = Number(product.price || 0) + Number(product.commission_amount || 0)
  const title = `${product.name} - Farm Direct | Uzhavar Market`
  const description = product.description
    ? `${product.name} (₹${price.toFixed(2)}) - ${product.description.slice(0, 140)}. Directly from ${farmerName} on Uzhavar Market.`
    : `Buy fresh ${product.name} (₹${price.toFixed(2)}) directly from ${farmerName} in Tamil Nadu. Authentic farm produce with zero middlemen.`
  const imageUrl = product.image_url || 'https://uzhavarmarket.netlify.app/hero-banner.jpg'

  return {
    title,
    description,
    alternates: {
      canonical: `/products/${id}`,
    },
    openGraph: {
      title,
      description,
      url: `https://uzhavarmarket.netlify.app/products/${id}`,
      type: 'website',
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 600,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}

export default async function ProductPage({ params }) {
  const { id } = await params
  const product = await getProduct(id)

  let productStructuredData = null
  if (product) {
    const farmerName = product.profiles?.farm_name || product.profiles?.full_name || 'Tamil Nadu Farmer'
    const price = Number(product.price || 0) + Number(product.commission_amount || 0)
    const stock = Number(product.stock_quantity || 0)
    const imageUrl = product.image_url || 'https://uzhavarmarket.netlify.app/hero-banner.jpg'

    productStructuredData = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: [imageUrl],
      description: product.description || `Fresh ${product.name} directly from ${farmerName}`,
      sku: product.id,
      offers: {
        '@type': 'Offer',
        url: `https://uzhavarmarket.netlify.app/products/${product.id}`,
        priceCurrency: 'INR',
        price: price.toFixed(2),
        itemCondition: 'https://schema.org/NewCondition',
        availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Person',
          name: farmerName,
        },
      },
    }
  }

  return (
    <>
      {productStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productStructuredData) }}
        />
      )}
      <ProductDetailsClient />
    </>
  )
}
