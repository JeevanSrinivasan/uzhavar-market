'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/app/context/LanguageContext'
import LanguageToggle from '@/app/components/LanguageToggle'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { showToast } from '../../components/Toast'
import { ensureFarmerAccess } from '../../../lib/farmerAuth'

export default function FarmerProfile() {
  const router = useRouter()
  const { t } = useLanguage()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success') // 'success' | 'error'

  const [user, setUser] = useState(null)
  
  // Profile Fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [village, setVillage] = useState('')
  const [district, setDistrict] = useState('')
  const [pincode, setPincode] = useState('')

  // Security & Password Fields
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState({ text: '', isError: false })
  const [sendingResetLink, setSendingResetLink] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#security' && !loading) {
      const timer = setTimeout(() => {
        const el = document.getElementById('security')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [loading])

  async function loadProfile() {
    setLoading(true)
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !authUser) {
        router.replace('/login')
        return
      }

      setUser(authUser)

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      const effective = await ensureFarmerAccess(profileData, authUser)

      if (!effective.isAllowed && effective.role !== 'farmer') {
        router.replace('/login')
        return
      }

      setFullName(effective.full_name || '')
      setPhone(effective.phone || '')
      setEmail(effective.email || authUser.email || '')
      setAddress(effective.address || '')
      setVillage(effective.village || '')
      setDistrict(effective.district || '')
      setPincode(effective.pincode || '')

    } catch (err) {
      console.error(err)
      setMessage('An unexpected error occurred.')
      setMessageType('error')
    }
    setLoading(false)
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      if (!user) throw new Error('User not authenticated')

      const updates = {
        id: user.id,
        full_name: fullName,
        phone: phone,
        address: address,
        village: village,
        district: district,
        pincode: pincode,
        role: 'farmer',
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(updates, { onConflict: 'id' })

      if (error) {
        throw new Error(error.message || JSON.stringify(error))
      }

      const successText = `${t('farmer.profileSavedMsg')} ✅`
      setMessage(successText)
      setMessageType('success')
      showToast(successText, 'success', 4000)
    } catch (err) {
      console.error('PROFILE SAVE ERROR:', err)
      const errText = `Error: ${err.message}`
      setMessage(errText)
      setMessageType('error')
      showToast(errText, 'error', 4000)
    }
    setSaving(false)
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordFeedback({ text: '', isError: false })

    if (newPassword.length < 6) {
      const msg = t('farmer.passwordMinLength') || t('auth.passwordMinLen')
      setPasswordFeedback({ text: msg, isError: true })
      showToast(msg, 'error')
      return
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/
    if (!passwordRegex.test(newPassword)) {
      const msg = t('farmer.passwordComplexityErr') || t('auth.passwordRuleHint')
      setPasswordFeedback({ text: msg, isError: true })
      showToast(msg, 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      const msg = t('farmer.passwordMismatch') || t('auth.passwordMismatch')
      setPasswordFeedback({ text: msg, isError: true })
      showToast(msg, 'error')
      return
    }

    setUpdatingPassword(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        throw error
      }

      const successMsg = t('farmer.passwordUpdatedSuccess')
      setPasswordFeedback({ text: successMsg, isError: false })
      showToast(successMsg, 'success', 5000)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('Farmer password update error:', err)
      const errMsg = err.message || 'Failed to update password'
      setPasswordFeedback({ text: errMsg, isError: true })
      showToast(errMsg, 'error')
    } finally {
      setUpdatingPassword(false)
    }
  }

  async function handleSendResetEmail() {
    const targetEmail = user?.email || email
    if (!targetEmail) {
      showToast('No registered email found for this account.', 'error')
      return
    }

    setSendingResetLink(true)
    try {
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : 'https://uzhavarmarket.netlify.app/reset-password'

      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail.trim(), {
        redirectTo,
      })

      if (error) {
        throw error
      }

      const msg = t('farmer.resetEmailSentSuccess', { email: targetEmail })
      setPasswordFeedback({ text: msg, isError: false })
      showToast(msg, 'success', 5000)
    } catch (err) {
      console.error('Send reset email error:', err)
      const errMsg = err.message || 'Failed to send reset email'
      setPasswordFeedback({ text: errMsg, isError: true })
      showToast(errMsg, 'error')
    } finally {
      setSendingResetLink(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8f5] flex justify-center items-center font-sans">
        <p className="text-gray-500 text-lg animate-pulse">{t('profile.loadingProfile')}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] font-sans pb-10">
      {/* NAVBAR */}
      <nav className="bg-white border-b border-gray-200 py-4 px-4 sm:px-[6%] flex justify-between items-center flex-wrap gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/farmer')}
            className="text-gray-500 hover:text-green-800 transition-colors text-xl font-bold flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100"
          >
            &larr;
          </button>
          <div className="text-xl sm:text-2xl font-bold text-green-800">
            {t('farmer.myProfile')}
          </div>
        </div>
        <LanguageToggle variant="compact" />
      </nav>

      <section className="w-[95%] sm:w-[90%] max-w-4xl mx-auto pt-6 sm:pt-10">
        <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-sm border border-gray-200">
          
          <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
            <div className="w-16 h-16 bg-green-100 text-green-800 flex items-center justify-center rounded-full text-3xl">
              👨‍🌾
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 m-0">{t('farmer.farmProfileTitle')}</h1>
              <p className="text-gray-500 text-sm mt-1 mb-0">{t('farmer.farmProfileSubtitle')}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            
            {/* Personal Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-50 pb-2">
                {t('farmer.personalInfoSection')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('farmer.farmerNameLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('auth.fullNamePlaceholder')}
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('farmer.mobileNumberLabel')}
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('auth.phonePlaceholder')}
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('farmer.emailOptionalLabel')} <span className="text-gray-400 font-normal">{t('farmer.optionalTag')}</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Location Details Section */}
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-50 pb-2">
                {t('farmer.farmLocationSection')}
              </h3>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {t('auth.addressLabel')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows="3"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t('auth.addressPlaceholder')}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all resize-y min-h-[80px]"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('auth.villageLabel')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder={t('auth.villagePlaceholder')}
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('auth.districtLabel')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder={t('auth.districtPlaceholder')}
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                  />
                </div>
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('auth.pincodeLabel')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder={t('auth.pincodePlaceholder')}
                    pattern="[0-9]{6}"
                    title="Please enter a valid 6-digit pincode"
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.push('/farmer')}
                className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 rounded-lg bg-green-800 text-white font-bold hover:bg-green-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed min-w-[150px] shadow-sm"
              >
                {saving ? t('profile.saving') : t('farmer.saveProfileBtn')}
              </button>
            </div>

          </form>
        </div>

        {/* SECURITY & CHANGE PASSWORD SECTION */}
        <div id="security" className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-sm border border-gray-200 mt-8 scroll-mt-24">
          <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-5">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-800 flex items-center justify-center rounded-2xl text-2xl shadow-xs">
              🔐
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 m-0">
                {t('farmer.securitySectionTitle')}
              </h2>
              <p className="text-gray-500 text-xs sm:text-sm mt-1 mb-0">
                {t('farmer.securitySectionSubtitle')}
              </p>
            </div>
          </div>

          {/* Current Registered Email Display */}
          {(user?.email || email) && (
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5 mb-6 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 text-base">📧</span>
                <span className="text-xs font-semibold text-emerald-900">
                  {t('farmer.currentAccountEmail')}:
                </span>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  {user?.email || email}
                </span>
              </div>
              <span className="text-[11px] text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full font-medium">
                Verified Account
              </span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {t('farmer.newPasswordLabel')}
                </label>
                <div className="relative w-full">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('farmer.newPasswordPlaceholder')}
                    required
                    minLength={6}
                    className="w-full h-12 px-3.5 pr-11 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center justify-center cursor-pointer bg-transparent border-0 outline-none text-gray-400 hover:text-green-800 transition-colors"
                    aria-label={showNewPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {t('farmer.confirmPasswordLabel')}
                </label>
                <div className="relative w-full">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('farmer.confirmPasswordPlaceholder')}
                    required
                    minLength={6}
                    className="w-full h-12 px-3.5 pr-11 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center justify-center cursor-pointer bg-transparent border-0 outline-none text-gray-400 hover:text-green-800 transition-colors"
                    aria-label={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 m-0">
              💡 {t('farmer.passwordRuleNotice')}
            </p>

            {passwordFeedback.text && (
              <div
                className={`p-3 rounded-lg text-sm font-medium ${
                  passwordFeedback.isError
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {passwordFeedback.text}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <button
                type="submit"
                disabled={updatingPassword}
                className="px-6 py-3 rounded-lg bg-emerald-800 text-white font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm active:scale-95 cursor-pointer text-sm sm:text-base"
              >
                {updatingPassword ? t('farmer.updatingPassword') : `🔐 ${t('farmer.updatePasswordBtn')}`}
              </button>

              {(user?.email || email) && (
                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  disabled={sendingResetLink}
                  className="text-xs sm:text-sm text-emerald-800 hover:text-emerald-900 font-semibold underline disabled:opacity-50 cursor-pointer"
                >
                  {sendingResetLink ? t('farmer.sendingResetEmail') : `✉️ ${t('farmer.sendResetEmailOption')}`}
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}
