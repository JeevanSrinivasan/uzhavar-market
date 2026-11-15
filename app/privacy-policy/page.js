import PrivacyContent from './PrivacyContent'

export const metadata = {
  title: 'Privacy Policy | Uzhavar Market',
  description:
    'Learn how Uzhavar Market collects, uses, and safeguards customer and farmer data on our agricultural direct marketplace.',
  alternates: {
    canonical: '/privacy-policy',
  },
  openGraph: {
    title: 'Privacy Policy | Uzhavar Market',
    description:
      'Learn how Uzhavar Market collects, uses, and safeguards customer and farmer data on our agricultural direct marketplace.',
    url: 'https://uzhavarmarket.netlify.app/privacy-policy',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy | Uzhavar Market',
    description:
      'Learn how Uzhavar Market collects, uses, and safeguards customer and farmer data on our agricultural direct marketplace.',
  },
}

export default function PrivacyPolicyPage() {
  return <PrivacyContent />
}
