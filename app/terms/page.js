import TermsContent from './TermsContent'

export const metadata = {
  title: 'Terms & Conditions | Uzhavar Market',
  description:
    'Terms of service, platform rules, and guidelines for buyers and farmers on Uzhavar Market.',
  alternates: {
    canonical: '/terms',
  },
  openGraph: {
    title: 'Terms & Conditions | Uzhavar Market',
    description:
      'Terms of service, platform rules, and guidelines for buyers and farmers on Uzhavar Market.',
    url: 'https://uzhavarmarket.netlify.app/terms',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms & Conditions | Uzhavar Market',
    description:
      'Terms of service, platform rules, and guidelines for buyers and farmers on Uzhavar Market.',
  },
}

export default function TermsPage() {
  return <TermsContent />
}
