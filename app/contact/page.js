import ContactContent from './ContactContent'

export const metadata = {
  title: 'Contact Us | Uzhavar Market',
  description:
    'Get in touch with Uzhavar Market for customer inquiries, farmer partnerships, or support for direct farm purchases in Tamil Nadu.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact Us | Uzhavar Market',
    description:
      'Get in touch with Uzhavar Market for customer inquiries, farmer partnerships, or support for direct farm purchases in Tamil Nadu.',
    url: 'https://uzhavarmarket.netlify.app/contact',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Us | Uzhavar Market',
    description:
      'Get in touch with Uzhavar Market for customer inquiries, farmer partnerships, or support for direct farm purchases in Tamil Nadu.',
  },
}

export default function ContactPage() {
  return <ContactContent />
}
