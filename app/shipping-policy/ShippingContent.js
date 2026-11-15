'use client'

import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import { useLanguage } from '@/app/context/LanguageContext'

export default function ShippingContent() {
  const { t } = useLanguage()
  const s1Items = t('shipping.s1Items')
  const s2Items = t('shipping.s2Items')
  const s5Items = t('shipping.s5Items')

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f8f5] text-gray-800">
      <Navbar />

      <section className="bg-gradient-to-b from-[#15341c] to-[#1c4826] text-white py-12 sm:py-16 px-4 sm:px-[6%] text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 bg-green-900/80 border border-green-700/60 px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-green-300 mb-4">
            {t('shipping.badge')}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            {t('shipping.title')}
          </h1>
          <p className="text-sm sm:text-base text-gray-200 max-w-xl mx-auto leading-relaxed">
            {t('shipping.subtitle')}
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-10 shadow-xs space-y-8 text-sm sm:text-base text-gray-700 leading-relaxed">
          
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <h2 className="text-base sm:text-lg font-bold text-green-900 mb-1.5">
              {t('shipping.guaranteeTitle')}
            </h2>
            <p className="text-sm text-green-800">{t('shipping.guaranteeDesc')}</p>
          </div>

          {/* SECTION 1 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">{t('shipping.s1Title')}</h2>
            <ul className="list-disc pl-5 space-y-2">
              {Array.isArray(s1Items) &&
                s1Items.map((item, idx) => (
                  <li key={idx}>
                    <strong className="text-gray-900">{item.bold}</strong> {item.text}
                  </li>
                ))}
            </ul>
          </section>

          {/* SECTION 2 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">{t('shipping.s2Title')}</h2>
            <p className="mb-3">{t('shipping.s2Intro')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
              {Array.isArray(s2Items) &&
                s2Items.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm">
                    <strong className="text-gray-900 block font-bold mb-1">{item.bold}</strong>
                    <span className="text-gray-700">{item.text}</span>
                  </div>
                ))}
            </div>
          </section>

          {/* SECTION 3 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">{t('shipping.s3Title')}</h2>
            <p>{t('shipping.s3Body')}</p>
          </section>

          {/* SECTION 4 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">{t('shipping.s4Title')}</h2>
            <p className="mb-3">{t('shipping.s4Body')}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-950 flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong>Parcel Tracking Support:</strong> Tracking docket details are provided upon courier handover so customers can monitor transit milestones live.
              </div>
            </div>
          </section>

          {/* SECTION 5 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">{t('shipping.s5Title')}</h2>
            <p className="mb-3">{t('shipping.s5Intro')}</p>
            <ul className="list-disc pl-5 space-y-2">
              {Array.isArray(s5Items) && s5Items.map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </section>

          {/* SECTION 6 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">{t('shipping.s6Title')}</h2>
            <p>{t('shipping.s6Body')}</p>
          </section>

          {/* CTA BAR */}
          <div className="bg-green-900 text-white rounded-xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-bold text-lg">{t('shipping.ctaTitle')}</h3>
              <p className="text-xs sm:text-sm text-green-200 mt-0.5">{t('shipping.ctaSub')}</p>
            </div>
            <Link
              href="/contact"
              className="bg-white text-green-900 hover:bg-green-50 font-bold px-5 py-2.5 rounded-lg text-sm transition-colors shrink-0"
            >
              {t('shipping.ctaBtn')}
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
