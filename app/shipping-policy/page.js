import ShippingContent from './ShippingContent'

export const metadata = {
  title: 'Shipping & Delivery Policy | Uzhavar Market',
  description:
    'Parcel logistics, dispatch timeframes, and courier delivery policy for farm-fresh agricultural goods across Tamil Nadu.',
  alternates: {
    canonical: '/shipping-policy',
  },
  openGraph: {
    title: 'Shipping & Delivery Policy | Uzhavar Market',
    description:
      'Parcel logistics, dispatch timeframes, and courier delivery policy for farm-fresh agricultural goods across Tamil Nadu.',
    url: 'https://uzhavarmarket.netlify.app/shipping-policy',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shipping & Delivery Policy | Uzhavar Market',
    description:
      'Parcel logistics, dispatch timeframes, and courier delivery policy for farm-fresh agricultural goods across Tamil Nadu.',
  },
}

export default function ShippingPolicyPage() {
  return <ShippingContent />
}
