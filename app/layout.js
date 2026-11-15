import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TactileFeedback from "./components/TactileFeedback";
import ToastContainer from "./components/Toast";
import { LanguageProvider } from "./context/LanguageContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://uzhavarmarket.netlify.app"),
  title: {
    default: "Uzhavar Market | Buy Directly from Farmers in Tamil Nadu",
    template: "%s | Uzhavar Market",
  },
  description:
    "Discover fresh farm products, seeds and organic fertilizers at Uzhavar Market. Connect directly with farmers and support local agriculture.",
  keywords: [
    "Uzhavar Market",
    "Tamil Nadu farmers",
    "buy directly from farmers",
    "fresh farm products",
    "organic fertilizers",
    "farm seeds",
    "agricultural marketplace",
    "Tamil Nadu agriculture",
    "direct farm to doorstep",
    "Karupatti",
    "country sugar",
    "naatu sakkarai",
  ],
  authors: [{ name: "Uzhavar Market", url: "https://uzhavarmarket.netlify.app" }],
  creator: "Uzhavar Market",
  publisher: "Uzhavar Market",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://uzhavarmarket.netlify.app",
    siteName: "Uzhavar Market",
    title: "Uzhavar Market | Buy Directly from Farmers in Tamil Nadu",
    description:
      "Discover fresh farm products, seeds and organic fertilizers at Uzhavar Market. Connect directly with farmers and support local agriculture.",
    images: [
      {
        url: "/hero-banner.jpg",
        width: 1200,
        height: 630,
        alt: "Uzhavar Market - Fresh Farm Direct from Tamil Nadu Farmers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Uzhavar Market | Buy Directly from Farmers in Tamil Nadu",
    description:
      "Discover fresh farm products, seeds and organic fertilizers at Uzhavar Market. Connect directly with farmers and support local agriculture.",
    images: ["/hero-banner.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "google1bc3c659f21a5e1c",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://uzhavarmarket.netlify.app/#website",
      "name": "Uzhavar Market",
      "url": "https://uzhavarmarket.netlify.app",
      "description":
        "Discover fresh farm products, seeds and organic fertilizers at Uzhavar Market. Connect directly with farmers and support local agriculture.",
      "inLanguage": ["en-IN", "ta-IN"],
    },
    {
      "@type": "Organization",
      "@id": "https://uzhavarmarket.netlify.app/#organization",
      "name": "Uzhavar Market",
      "url": "https://uzhavarmarket.netlify.app",
      "logo": "https://uzhavarmarket.netlify.app/hero-banner.jpg",
      "image": "https://uzhavarmarket.netlify.app/hero-banner.jpg",
      "description":
        "Direct farm-to-consumer agricultural marketplace connecting Tamil Nadu farmers directly with consumers with zero middlemen.",
      "areaServed": "Tamil Nadu, India",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "Customer Support",
        "email": "jeevansrinivasan062@gmail.com",
        "availableLanguage": ["Tamil", "English"],
      },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  localStorage.removeItem('uzhavar_theme');
                  var mql = window.matchMedia('(prefers-color-scheme: dark)');
                  function updateTheme() {
                    if (mql.matches) {
                      document.documentElement.classList.add('dark');
                      document.documentElement.setAttribute('data-theme', 'dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                      document.documentElement.setAttribute('data-theme', 'light');
                    }
                  }
                  updateTheme();
                  if (mql.addEventListener) {
                    mql.addEventListener('change', updateTheme);
                  } else if (mql.addListener) {
                    mql.addListener(updateTheme);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <TactileFeedback />
          <ToastContainer />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
