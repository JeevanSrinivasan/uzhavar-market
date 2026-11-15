'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { showToast } from '../components/Toast'
import { useLanguage } from '@/app/context/LanguageContext'
import LanguageToggle from '@/app/components/LanguageToggle'
import LoginHandshakeModal from '@/app/components/LoginHandshakeModal'

export default function Register() {
  const router = useRouter()
  const { t, locale } = useLanguage()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState('customer')
  const [address, setAddress] = useState('')
  const [village, setVillage] = useState('')
  const [district, setDistrict] = useState('')
  const [pincode, setPincode] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [handshakeData, setHandshakeData] = useState(null)

  async function handleRegister(e) {
    e.preventDefault()

    setMessage('')
    setLoading(true)

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/
    if (!passwordRegex.test(password)) {
      const pwdMsg = t('auth.passwordRuleHint')
      setMessage({ text: pwdMsg, isError: true })
      showToast(pwdMsg, 'error')
      setLoading(false)
      return
    }

    try {
      const cleanEmail = email.trim().toLowerCase()
      const cleanFullName = fullName.trim()
      const cleanPhone = phone.trim()

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanFullName,
            phone: cleanPhone,
            role: role,
            address: role === 'farmer' ? address.trim() : null,
            village: role === 'farmer' ? village.trim() : null,
            district: role === 'farmer' ? district.trim() : null,
            pincode: role === 'farmer' ? pincode.trim() : null,
          },
        },
      })

      if (error) {
        let displayError = error.message
        if (
          error.status === 429 ||
          error.message?.toLowerCase().includes('rate limit') ||
          error.message?.toLowerCase().includes('over_email_send_rate_limit')
        ) {
          displayError = t('auth.rateLimitErr')
        } else if (
          error.message?.toLowerCase().includes('already registered') ||
          error.message?.toLowerCase().includes('already in use')
        ) {
          displayError = 'This email is already registered. Please log in.'
        }

        setMessage({ text: displayError, isError: true })
        showToast(displayError, 'error', 6000)
        setLoading(false)
        return
      }

      const user = data?.user
      if (!user) {
        setMessage({ text: 'Unable to create account. Please try again.', isError: true })
        setLoading(false)
        return
      }

      // If session not established immediately, sign in with password
      let session = data?.session
      if (!session) {
        try {
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          })
          session = signInData?.session
        } catch (signInErr) {
          console.warn('Auto sign-in notice:', signInErr)
        }
      }

      // Upsert profile in public.profiles table
      try {
        await supabase.from('profiles').upsert(
          {
            id: user.id,
            full_name: cleanFullName,
            phone: cleanPhone,
            role: role,
            is_banned: false,
            address: role === 'farmer' ? address.trim() : null,
            village: role === 'farmer' ? village.trim() : null,
            district: role === 'farmer' ? district.trim() : null,
            pincode: role === 'farmer' ? pincode.trim() : null,
          },
          { onConflict: 'id' }
        )
      } catch (upsertErr) {
        console.warn('Profile upsert notice:', upsertErr)
      }

      const successMsg =
        role === 'farmer'
          ? t('auth.regSuccessFarmer')
          : t('auth.regSuccessCustomer')

      showToast(successMsg, 'success', 3500)

      // Trigger celebratory direct Handshake modal and instant auto-navigation
      setHandshakeData({
        role: role,
        name: cleanFullName,
        destination: role === 'farmer' ? '/farmer' : '/',
      })
    } catch (err) {
      console.error('Registration exception:', err)
      const errText = err.message || 'Registration failed'
      setMessage({ text: errText, isError: true })
      showToast(errText, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] flex justify-center items-center p-4 sm:p-8 font-sans relative">
      <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-lg">
        <div className="flex justify-end mb-4">
          <LanguageToggle variant="compact" />
        </div>

        <div className="text-center text-xl sm:text-2xl font-bold text-green-800 mb-6">
          🌾 {t('brand')}
        </div>

        <h1 className="text-center text-2xl sm:text-3xl font-semibold text-gray-800 mb-2">
          {t('auth.createAccountTitle')}
        </h1>

        <p className="text-center text-gray-500 mb-8">
          {t('auth.joinSubtitle')}
        </p>

        <form onSubmit={handleRegister}>
          <label className="block text-sm font-semibold text-gray-700 mb-2 mt-4">
            {t('auth.fullNameLabel')}
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t('auth.fullNamePlaceholder')}
            required
            className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-600"
          />

          <label className="block text-sm font-semibold text-gray-700 mb-2 mt-4">
            {t('auth.phoneLabel')}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('auth.phonePlaceholder')}
            required
            pattern="[0-9]{10}"
            className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-600"
          />

          <label className="block text-sm font-semibold text-gray-700 mb-2 mt-4">
            {t('auth.emailLabel')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            required
            className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-600"
          />

          <label className="block text-sm font-semibold text-gray-700 mb-2 mt-4">
            {t('auth.passwordLabel')}
          </label>
          <div className="relative w-full">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              required
              className="w-full h-12 px-3 pr-10 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {t('auth.passwordRuleHint')}
          </p>

          <label className="block text-sm font-semibold text-gray-700 mb-2 mt-4">
            {t('auth.iAmA')}
          </label>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => setRole('customer')}
              className={`p-3 rounded-lg border font-semibold text-sm transition-colors cursor-pointer ${
                role === 'customer'
                  ? 'bg-green-100 border-green-600 text-green-900 shadow-xs'
                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              🛒 {t('auth.roleCustomer')}
            </button>
            <button
              type="button"
              onClick={() => setRole('farmer')}
              className={`p-3 rounded-lg border font-semibold text-sm transition-colors cursor-pointer ${
                role === 'farmer'
                  ? 'bg-green-100 border-green-600 text-green-900 shadow-xs'
                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              👨‍🌾 {t('auth.roleFarmer')}
            </button>
          </div>

          {role === 'farmer' && (
            <>
              <label className="block text-sm font-semibold text-gray-700 mb-2 mt-4">
                {t('auth.farmAddressLabel')}
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t('auth.addressPlaceholder')}
                required
                className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-600"
              />

              <label className="block text-sm font-semibold text-gray-700 mb-2 mt-4">
                {t('auth.villageLabel')}
              </label>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder={t('auth.villagePlaceholder')}
                required
                className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-600"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 mt-4">
                    {t('auth.districtLabel')}
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder={t('auth.districtPlaceholder')}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 mt-4">
                    {t('auth.pincodeLabel')}
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder={t('auth.pincodePlaceholder')}
                    required
                    pattern="[0-9]{6}"
                    className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 mt-6 rounded-lg bg-green-800 text-white text-base font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? t('auth.creatingAccount') : t('auth.createAccountTitle')}
          </button>
        </form>

        {message?.text && (
          <div
            className={`mt-5 p-3 rounded-lg text-center text-sm font-medium ${
              message.isError
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-green-50 text-green-800 border border-green-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <p className="text-center mt-6 text-sm text-gray-500">
          {t('auth.alreadyHaveAccount')}{' '}
          <a
            href="/login"
            className="text-green-800 font-semibold hover:underline"
          >
            {t('auth.loginBtn')}
          </a>
        </p>
      </div>

      {/* CELEBRATORY HANDSHAKE MODAL WITH AUTOMATIC SCROLL UP ON SUCCESS */}
      <LoginHandshakeModal
        isOpen={Boolean(handshakeData)}
        role={handshakeData?.role}
        userName={handshakeData?.name}
        locale={locale}
        onComplete={() => {
          const dest = handshakeData?.destination || '/'
          router.push(dest)
        }}
      />
    </main>
  )
}
