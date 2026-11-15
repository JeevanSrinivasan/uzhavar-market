'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { ensureFarmerAccess } from '../../lib/farmerAuth'
import { useLanguage } from '@/app/context/LanguageContext'
import LanguageToggle from '@/app/components/LanguageToggle'
import LoginHandshakeModal from '@/app/components/LoginHandshakeModal'
import { showToast } from '../components/Toast'

export default function Login() {
  const router = useRouter()
  const { t, locale } = useLanguage()

  const videoRef = useRef(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [handshakeData, setHandshakeData] = useState(null)

  // Forgot Password Modal States
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotFeedback, setForgotFeedback] = useState(null)

  // Banned Farmer Appeal States
  const [bannedUser, setBannedUser] = useState(null)
  const [bannedProfile, setBannedProfile] = useState(null)
  const [appealReason, setAppealReason] = useState('')
  const [voiceFile, setVoiceFile] = useState(null)
  const [voicePreview, setVoicePreview] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [submittingAppeal, setSubmittingAppeal] = useState(false)

  const [resending, setResending] = useState(false)
  const [showResend, setShowResend] = useState(false)

  useEffect(() => {
    async function checkExistingAuth() {
      if (typeof window === 'undefined') return
      const hash = window.location.hash || ''
      const search = window.location.search || ''

      if (
        hash.includes('type=recovery') ||
        search.includes('type=recovery')
      ) {
        router.replace('/reset-password' + search + hash)
        return
      }

      if (
        hash.includes('access_token') ||
        search.includes('code=') ||
        search.includes('token_hash=') ||
        hash.includes('token_hash=') ||
        search.includes('token=') ||
        search.includes('type=signup') ||
        hash.includes('type=signup')
      ) {
        router.replace('/auth/callback' + search + hash)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        const effective = await ensureFarmerAccess(profile, user)
        if (effective.role === 'farmer' || user.user_metadata?.role === 'farmer') {
          router.replace('/farmer')
        } else if (effective.role === 'admin') {
          router.replace('/admin')
        } else if (effective.role === 'customer') {
          router.replace('/customer')
        }
      }
    }
    checkExistingAuth()
  }, [router])

  useEffect(() => {
    const v = videoRef.current
    if (v) {
      v.defaultMuted = true
      v.muted = true
      v.playsInline = true

      // Explicitly ensure fresh cache-busted src and trigger load for seamless transitions
      if (!v.src || !v.src.includes('/login-bg.mp4')) {
        v.src = '/login-bg.mp4?v=2'
      }
      try {
        v.load()
      } catch (e) {}

      const attemptPlay = () => {
        if (v && v.paused) {
          const playPromise = v.play()
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              console.warn('Video autoplay notice:', err)
            })
          }
        }
      }

      attemptPlay()
      v.addEventListener('loadeddata', attemptPlay, { once: true })
      v.addEventListener('canplay', attemptPlay, { once: true })

      const resumeOnInteraction = () => {
        attemptPlay()
        window.removeEventListener('click', resumeOnInteraction)
        window.removeEventListener('touchstart', resumeOnInteraction)
      }
      window.addEventListener('click', resumeOnInteraction, { once: true })
      window.addEventListener('touchstart', resumeOnInteraction, { once: true })

      return () => {
        v.removeEventListener('loadeddata', attemptPlay)
        v.removeEventListener('canplay', attemptPlay)
        window.removeEventListener('click', resumeOnInteraction)
        window.removeEventListener('touchstart', resumeOnInteraction)
      }
    }
  }, [])

  useEffect(() => {
    let interval = null
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 120) {
            stopRecording()
            return 120
          }
          return prev + 1
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording, mediaRecorder])

  async function handleResendConfirmation() {
    if (!email) {
      alert(t('auth.enterEmailForResend'))
      return
    }
    setResending(true)
    const { error: resendErr } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setResending(false)
    if (resendErr) {
      alert(t('auth.resendFailed', { msg: resendErr.message }))
    } else {
      alert(t('auth.resendSuccess'))
    }
  }

  function handleOpenForgotModal() {
    setForgotEmail(email.trim() || '')
    setForgotFeedback(null)
    setShowForgotModal(true)
  }

  async function handleSendForgotEmail(e) {
    e.preventDefault()
    setForgotFeedback(null)

    const targetEmail = forgotEmail.trim()
    if (!targetEmail) {
      const err = t('auth.enterEmailForResend') || 'Please enter your email'
      setForgotFeedback({ text: err, isError: true })
      showToast(err, 'error')
      return
    }

    setForgotLoading(true)

    try {
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : 'http://localhost:3000/reset-password'

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

        setForgotFeedback({ text: displayError, isError: true })
        showToast(displayError, 'error', 6000)
        setForgotLoading(false)
        return
      }

      const successMsg = t('auth.resetLinkSentToEmail', { email: targetEmail }) || t('auth.resetLinkSent')
      setForgotFeedback({ text: successMsg, isError: false })
      showToast(successMsg, 'success', 6000)
    } catch (err) {
      console.error('Forgot password exception:', err)
      const errText = err.message || 'Failed to send reset link'
      setForgotFeedback({ text: errText, isError: true })
      showToast(errText, 'error')
    } finally {
      setForgotLoading(false)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()

    setMessage('')
    setShowResend(false)
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message && error.message.toLowerCase().includes('email not confirmed')) {
        setMessage(t('auth.emailNotConfirmed'))
        setShowResend(true)
      } else {
        setMessage(error.message)
      }
      setLoading(false)
      return
    }

    const user = data.user

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const effectiveProfile = await ensureFarmerAccess(profile, user)

    if (effectiveProfile.is_banned) {
      setBannedUser(user)
      setBannedProfile(effectiveProfile)
      setLoading(false)
      return
    }

    setMessage(t('auth.loginSuccess'))

    setEmail('')
    setPassword('')
    setLoading(false)

    // Trigger celebratory Handshake animation between Tamil farmer and customer
    setHandshakeData({
      role: effectiveProfile.role,
      name: effectiveProfile.full_name || '',
      destination:
        effectiveProfile.role === 'admin'
          ? '/admin'
          : effectiveProfile.role === 'farmer' || user.user_metadata?.role === 'farmer'
          ? '/farmer'
          : '/', // As requested: Customer automatically navigates to home page after animation
    })
  }

  function handleHandshakeComplete() {
    const dest = handshakeData?.destination || '/'
    router.push(dest)
  }

  async function startRecording() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Audio recording is not supported on your browser. Please upload an audio file instead.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks = []

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setVoiceFile(blob)
        setVoicePreview(url)
        stream.getTracks().forEach((track) => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setRecordingSeconds(0)
    } catch (err) {
      console.error('Microphone error:', err)
      alert('Microphone access denied or not available. You can upload an audio file instead.')
    }
  }

  function stopRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }

  function handleVoiceFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setVoiceFile(file)
    setVoicePreview(url)
  }

  function removeVoiceNote() {
    if (voicePreview) {
      try {
        URL.revokeObjectURL(voicePreview)
      } catch (e) {}
    }
    setVoiceFile(null)
    setVoicePreview(null)
    const fileInput = document.getElementById('voice-file-input')
    if (fileInput) fileInput.value = ''
  }

  async function handleSubmitAppeal(e) {
    e.preventDefault()
    if (!appealReason.trim()) {
      alert(t('auth.appealReasonPlaceholder'))
      return
    }

    setSubmittingAppeal(true)

    try {
      let voiceUrl = null

      if (voiceFile) {
        const ext = voiceFile.name ? (voiceFile.name.split('.').pop() || 'webm') : 'webm'
        const fileName = `appeal-voice-${bannedUser.id}-${Date.now()}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('product-images')
          .upload(fileName, voiceFile)

        if (uploadErr) {
          console.warn('Voice upload error:', uploadErr)
        } else {
          const { data: pubData } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName)
          voiceUrl = pubData.publicUrl
        }
      }

      const appealData = {
        reason: appealReason.trim(),
        voice_url: voiceUrl,
        status: 'pending',
        created_at: new Date().toISOString(),
      }

      const { error: appealErr } = await supabase
        .from('profiles')
        .update({ appeal: appealData })
        .eq('id', bannedUser.id)

      if (appealErr) {
        if (appealErr.message && appealErr.message.includes('appeal')) {
          alert('Database note: Please run the SQL command in Supabase: ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS appeal JSONB;')
        }
        throw appealErr
      }

      setBannedProfile((prev) => ({
        ...prev,
        appeal: appealData,
      }))
      alert('Appeal submitted successfully! Admin will review your appeal.')
    } catch (err) {
      console.error('Submit appeal error:', err)
      alert('Failed to submit appeal: ' + err.message)
    } finally {
      setSubmittingAppeal(false)
    }
  }

  async function handleBannedLogout() {
    await supabase.auth.signOut()
    setBannedUser(null)
    setBannedProfile(null)
    setMessage('')
    setVoiceFile(null)
    setVoicePreview(null)
    setAppealReason('')
  }

  // ==========================================
  // RENDER BANNED / APPEAL VIEW
  // ==========================================
  if (bannedProfile) {
    const hasPendingAppeal = bannedProfile.appeal && bannedProfile.appeal.status === 'pending'
    const hasRejectedAppeal = bannedProfile.appeal && bannedProfile.appeal.status === 'rejected'
    const formattedAppealDate = bannedProfile.appeal?.created_at
      ? new Date(bannedProfile.appeal.created_at).toLocaleDateString(locale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : ''

    return (
      <main className="min-h-screen bg-[#f7f8f5] flex justify-center items-center p-4 sm:p-8 font-sans">
        <div className="w-full max-w-lg bg-white p-6 sm:p-8 rounded-2xl border border-red-200 shadow-xl">
          <div className="flex justify-end mb-3">
            <LanguageToggle variant="compact" />
          </div>
          <div className="text-center text-4xl mb-3">🛑</div>
          <h1 className="text-center text-2xl font-bold text-red-700 mb-1">
            {t('auth.accountSuspended')}
          </h1>
          <p className="text-center text-gray-600 text-sm mb-6">
            {t('auth.suspendedDesc', { name: bannedProfile.full_name || t('common.farmer') })}
          </p>

          {hasPendingAppeal ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 text-center">
              <div className="text-3xl mb-2">⏳</div>
              <h3 className="m-0 text-base font-bold text-amber-900 mb-1">{t('auth.appealUnderReview')}</h3>
              <p className="m-0 text-xs text-amber-800 leading-relaxed mb-4">
                {t('auth.appealSubmittedOn', { date: formattedAppealDate })}
              </p>

              <div className="bg-white/90 p-4 rounded-lg text-left text-xs text-gray-700 border border-amber-100 shadow-sm">
                <span className="block font-bold text-gray-500 uppercase text-[10px] mb-1">
                  {t('auth.statedReason')}
                </span>
                <p className="m-0 text-sm text-gray-800 italic leading-relaxed">&ldquo;{bannedProfile.appeal.reason}&rdquo;</p>
                {bannedProfile.appeal.voice_url && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="block font-bold text-gray-500 uppercase text-[10px] mb-1">
                      {t('auth.attachedVoiceNote')}
                    </span>
                    <audio controls src={bannedProfile.appeal.voice_url} className="w-full mt-1" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitAppeal} className="flex flex-col gap-4 mb-6">
              {hasRejectedAppeal && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 leading-relaxed">
                  <strong className="block font-bold mb-0.5">✕ {t('auth.prevAppealRejected')}</strong>
                  {t('auth.prevAppealRejectedDesc')}
                </div>
              )}

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 text-xs text-emerald-800">
                💡 {t('auth.submitAppealBanner')}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  {t('auth.appealReasonLabel')}
                </label>
                <textarea
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder={t('auth.appealReasonPlaceholder')}
                  rows={4}
                  required
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700 resize-y"
                />
              </div>

              <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/70">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  {t('auth.voiceNoteOptional')}
                </label>
                <p className="text-[11px] text-gray-500 mb-3">
                  {t('auth.voiceNoteDesc')}
                </p>

                {voicePreview ? (
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-700">{t('auth.audioPreview')}</span>
                      <button
                        type="button"
                        onClick={removeVoiceNote}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        ✕ {t('auth.remove')}
                      </button>
                    </div>
                    <audio controls src={voicePreview} className="w-full" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      {isRecording ? (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 shadow-sm animate-pulse"
                        >
                          <span className="w-2.5 h-2.5 bg-white rounded-full"></span>
                          {t('auth.stopRecording', {
                            time: `${Math.floor(recordingSeconds / 60)}:${(recordingSeconds % 60).toString().padStart(2, '0')}`,
                          })}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-xs font-bold hover:bg-green-800 shadow-sm transition-colors"
                        >
                          <span>🎙️</span> {t('auth.recordVoiceNote')}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="text-[10px] uppercase font-bold text-gray-400">{t('auth.or')}</span>
                      <input
                        id="voice-file-input"
                        type="file"
                        accept="audio/*"
                        onChange={handleVoiceFileUpload}
                        className="text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submittingAppeal}
                className="w-full p-3 rounded-xl bg-green-800 text-white text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-50 shadow-md mt-1"
              >
                {submittingAppeal ? t('auth.submittingAppeal') : `✉️ ${t('auth.submitAppealBtn')}`}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-gray-100 flex justify-center">
            <button
              type="button"
              onClick={handleBannedLogout}
              className="text-xs text-gray-500 hover:text-gray-800 font-semibold transition-colors py-1 px-3 rounded hover:bg-gray-100"
            >
              ← {t('auth.backToLoginLogout')}
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ==========================================
  // STANDARD LOGIN VIEW
  // ==========================================
  return (
    <main className="min-h-screen flex justify-center items-center p-4 sm:p-8 font-sans relative overflow-hidden bg-[#0a170e]">
      {/* 1. RICH DARK AGRICULTURAL BACKDROP (PREVENTS ANY WHITE/GREY BLINK) */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0e2314] via-[#09170e] to-[#040805] z-0 pointer-events-none" />

      {/* 2. BACKGROUND VIDEO (FULL-SCREEN AUTO-LOOPING) */}
      <video
        ref={videoRef}
        src="/login-bg.mp4?v=2"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none"
      >
        <source src="/login-bg.mp4?v=2" type="video/mp4" />
      </video>

      {/* 3. SUBTLE OVERLAY FOR CONTRAST & LEGIBILITY */}
      <div className="fixed inset-0 bg-black/20 z-0 pointer-events-none" />

      {/* 4. ULTRA-TRANSPARENT GLASS CARD (SEE-THROUGH VIDEO) */}
      <div className="w-full max-w-md bg-black/20 backdrop-blur-[2px] p-6 sm:p-8 rounded-3xl border border-white/25 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] relative z-10 transition-all duration-300 text-white">
        <div className="flex justify-end mb-4">
          <LanguageToggle variant="dark" />
        </div>

        <div className="text-center text-xl sm:text-2xl font-bold text-emerald-300 mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          🌾 {t('brand')}
        </div>

        <h1 className="text-center text-2xl sm:text-3xl font-extrabold text-white mb-2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
          {t('auth.welcomeBack')}
        </h1>

        <p className="text-center text-white font-medium mb-8 text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          {t('auth.loginSubtitle')}
        </p>

        <form onSubmit={handleLogin}>
          <label className="block text-sm font-bold text-white mb-2 mt-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {t('auth.emailLabel')}
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            required
            style={{ color: '#111827', backgroundColor: '#ffffff' }}
            className="w-full p-3.5 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 focus:border-emerald-500 rounded-xl text-base outline-none focus:ring-4 focus:ring-emerald-500/30 shadow-md font-medium transition-all"
          />

          <label className="block text-sm font-bold text-white mb-2 mt-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {t('auth.passwordLabel')}
          </label>

          <div className="relative w-full">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              required
              style={{ color: '#111827', backgroundColor: '#ffffff' }}
              className="w-full h-12 px-3.5 pr-11 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 focus:border-emerald-500 rounded-xl text-base outline-none focus:ring-4 focus:ring-emerald-500/30 shadow-md font-medium transition-all"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="eye-toggle-btn absolute inset-y-0 right-0 pr-3.5 flex items-center justify-center cursor-pointer bg-transparent border-0 outline-none text-gray-500 hover:text-emerald-700 transition-colors z-20"
              style={{ top: 0, bottom: 0, right: 0, transform: 'none' }}
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-emerald-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-gray-500 hover:text-gray-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>

          <p className="text-right mt-2 mb-1 text-sm">
            <button
              type="button"
              onClick={handleOpenForgotModal}
              className="text-emerald-300 hover:text-emerald-200 font-bold hover:underline bg-transparent border-0 p-0 cursor-pointer text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
            >
              {t('auth.forgotPasswordLink')}
            </button>
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3.5 mt-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-base font-bold shadow-lg shadow-emerald-950/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? t('auth.loggingIn') : t('auth.loginBtn')}
          </button>
        </form>

        {message && (
          <p className="mt-5 p-3 rounded-xl bg-red-500/80 backdrop-blur-sm text-white text-center text-sm font-semibold border border-red-400/50">
            {message}
          </p>
        )}

        {showResend && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resending}
              className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-semibold hover:bg-white/30 transition-colors cursor-pointer disabled:opacity-50 border border-white/30 backdrop-blur-sm"
            >
              {resending ? t('auth.sendingEmail') : `✉️ ${t('auth.resendConfirmationBtn')}`}
            </button>
          </div>
        )}

        <p className="text-center mt-6 text-sm text-white font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          {t('auth.noAccount')}{' '}
          <a
            href="/register"
            className="text-emerald-300 hover:text-emerald-200 font-bold hover:underline drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
          >
            {t('auth.createAccountLink')}
          </a>
        </p>
      </div>

      {/* 3. CELEBRATORY HANDSHAKE MODAL WITH AUTOMATIC SCROLL UP ON SUCCESS */}
      <LoginHandshakeModal
        isOpen={Boolean(handshakeData)}
        role={handshakeData?.role}
        userName={handshakeData?.name}
        locale={locale}
        onComplete={handleHandshakeComplete}
      />

      {/* 4. FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !forgotLoading) {
              setShowForgotModal(false)
            }
          }}
        >
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-green-100 relative">
            {/* Close Button */}
            <button
              type="button"
              disabled={forgotLoading}
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-green-100 text-green-800 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 shadow-xs">
                🌾
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 m-0">
                {t('auth.forgotModalTitle')}
              </h2>
              <p className="text-gray-500 text-xs sm:text-sm mt-1 mb-0 leading-relaxed">
                {t('auth.forgotModalDesc')}
              </p>
            </div>

            {forgotFeedback?.isError === false ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3">
                <div className="text-4xl animate-bounce">📬</div>
                <h3 className="text-base sm:text-lg font-bold text-emerald-900 m-0">
                  {t('auth.resetLinkSent')}
                </h3>
                <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed m-0">
                  {forgotFeedback.text}
                </p>
                <div className="text-[11px] text-gray-600 bg-white/80 p-3 rounded-xl border border-emerald-100 leading-relaxed text-left">
                  💡 <strong>Tip:</strong> If you don&apos;t see the email within 1-2 minutes, check your <strong>Spam / Promotions</strong> folder. Click the secure link inside the email to choose a new password.
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <a
                    href="https://mail.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors inline-block text-center shadow-xs"
                  >
                    📬 {t('auth.openGmail')}
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {t('auth.close')}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendForgotEmail} className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                    {t('auth.emailLabel')} *
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                  />
                </div>

                {forgotFeedback?.isError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                    {forgotFeedback.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3 px-4 rounded-xl bg-green-800 text-white font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-md cursor-pointer"
                >
                  {forgotLoading ? t('auth.sending') : `✉️ ${t('auth.sendResetLink')}`}
                </button>

                <div className="text-center pt-2">
                  <a
                    href={`/forgot-password${forgotEmail ? `?email=${encodeURIComponent(forgotEmail)}` : ''}`}
                    className="text-xs text-gray-500 hover:text-green-800 font-medium underline"
                  >
                    {t('auth.openFullForgotPage')}
                  </a>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
