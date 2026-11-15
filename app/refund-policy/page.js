import RefundContent from './RefundContent'

export const metadata = {
  title: 'Refund & Cancellation Policy | Uzhavar Market',
  description:
    'Cancellation, quality assurance, and refund policy for farm-fresh agricultural goods and verified farmers in Tamil Nadu.',
  alternates: {
    canonical: '/refund-policy',
  },
  openGraph: {
    title: 'Refund & Cancellation Policy | Uzhavar Market',
    description:
      'Cancellation, quality assurance, and refund policy for farm-fresh agricultural goods and verified farmers in Tamil Nadu.',
    url: 'https://uzhavarmarket.netlify.app/refund-policy',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Refund & Cancellation Policy | Uzhavar Market',
    description:
      'Cancellation, quality assurance, and refund policy for farm-fresh agricultural goods and verified farmers in Tamil Nadu.',
  },
}

export default function RefundPolicyPage() {
  return <RefundContent />
}
