import AboutContent from './AboutContent'

export const metadata = {
  title: 'About Us | Uzhavar Market',
  description:
    'Learn how Uzhavar Market empowers Tamil Nadu farmers and consumers through direct farm-to-doorstep trade with zero middlemen.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About Us | Uzhavar Market',
    description:
      'Learn how Uzhavar Market empowers Tamil Nadu farmers and consumers through direct farm-to-doorstep trade with zero middlemen.',
    url: 'https://uzhavarmarket.netlify.app/about',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Us | Uzhavar Market',
    description:
      'Learn how Uzhavar Market empowers Tamil Nadu farmers and consumers through direct farm-to-doorstep trade with zero middlemen.',
  },
}

export default function AboutPage() {
  return <AboutContent />
}
