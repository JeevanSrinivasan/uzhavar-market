'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/app/context/LanguageContext'
import LanguageToggle from '@/app/components/LanguageToggle'
import { supabase } from '../../lib/supabase'
import { showToast } from '../components/Toast'

export default function ForgotPassword() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [sentEmail, setSentEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search)
      const qEmail = sp.get('email')
      if (qEmail) {
        setEmail(qEmail.trim())
      }
    }
  }, [])

  async function handleReset(e) {
    e.preventDefault()

    setMessage('')
    setLoading(true)

    const targetEmail = email.trim()
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/reset-password`
      : 'https://uzhavarmarket.netlify.app/reset-password'

    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo,
    })

    if (error) {
      const isRateLimit =
        error.status === 429 ||
        error.message?.toLowerCase().includes('rate limit') ||
        error.message?.toLowerCase().includes('over_email_send_rate_limit')

      const displayError = isRateLimit
        ? t('auth.rateLimitErr')
        : error.message

      setMessage({ text: displayError, isError: true })
      showToast(displayError, 'error', 6000)
      setLoading(false)
      return
    }

    const successMsg = t('auth.resetLinkSentToEmail', { email: targetEmail }) || t('auth.resetLinkSent')
    setMessage({ text: successMsg, isError: false })
    showToast(successMsg, 'success', 6000)
    setSentEmail(targetEmail)
    setEmail('')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] flex justify-center items-center p-4 sm:p-8 font-sans relative">
      <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-lg">
        <div className="flex justify-end mb-4">
          <LanguageToggle variant="compact" />
        </div>
        <div className="text-center text-xl sm:text-2xl font-bold text-green-800 mb-6">🌾 {t('brand')}</div>

        <h1 className="text-center text-2xl sm:text-3xl font-semibold text-gray-800 mb-2">{t('auth.forgotTitle')}</h1>

        <p className="text-center text-gray-500 mb-8 leading-relaxed">
          {t('auth.forgotDesc')}
        </p>

        <form onSubmit={handleReset}>
          <label className="block text-sm font-semibold text-gray-700 mb-2 mt-4">{t('auth.emailLabel')}</label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            required
            style={{ color: '#111827', backgroundColor: '#ffffff' }}
            className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-600"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 mt-6 rounded-lg bg-green-800 text-white text-base font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? t('auth.sending') : `✉️ ${t('auth.sendResetLink')}`}
          </button>
        </form>

        {message?.text && (
          <div
            className={`mt-5 p-4 rounded-xl text-center text-sm font-medium ${
              message.isError
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            <p className="m-0 mb-2">{message.text}</p>
            {!message.isError && (
              <div className="mt-3 pt-3 border-t border-emerald-200/60 flex flex-col gap-2">
                <span className="text-xs text-emerald-700">
                  💡 Check your spam/promotions folder if not seen within 2 minutes.
                </span>
                <a
                  href="https://mail.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block py-2 px-3 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                >
                  📬 {t('auth.openGmail')}
                </a>
              </div>
            )}
          </div>
        )}

        <p className="text-center mt-6 text-sm text-gray-500">
          {t('auth.rememberPassword')}{' '}
          <a href="/login" className="text-green-800 font-semibold hover:underline">
            {t('auth.backToLogin')}
          </a>
        </p>
      </div>
    </main>
  )
}