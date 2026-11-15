import GuidelinesContent from './GuidelinesContent'

export const metadata = {
  title: 'Community Guidelines | Uzhavar Market',
  description:
    'Ethical standards, transparent pricing, and mutual respect guidelines for farmers and consumers on Uzhavar Market.',
  alternates: {
    canonical: '/community-guidelines',
  },
  openGraph: {
    title: 'Community Guidelines | Uzhavar Market',
    description:
      'Ethical standards, transparent pricing, and mutual respect guidelines for farmers and consumers on Uzhavar Market.',
    url: 'https://uzhavarmarket.netlify.app/community-guidelines',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Community Guidelines | Uzhavar Market',
    description:
      'Ethical standards, transparent pricing, and mutual respect guidelines for farmers and consumers on Uzhavar Market.',
  },
}

export default function CommunityGuidelinesPage() {
  return <GuidelinesContent />
}
