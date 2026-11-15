'use client'

import React, { useEffect, useRef, useState } from 'react'

export default function LoginHandshakeModal({
  isOpen,
  role = 'customer',
  userName = '',
  locale = 'en',
  onComplete,
}) {
  const [stage, setStage] = useState('entering') // 'entering' | 'clasped' | 'exiting'
  const isTamil = locale === 'ta'
  const videoRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      setStage('entering')
      return
    }

    const v = videoRef.current
    let timeUpdateHandler = null
    if (v) {
      v.defaultMuted = true
      v.muted = true
      v.currentTime = 1.8
      const playPromise = v.play()
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Handshake video autoplay notice:', err)
        })
      }
      timeUpdateHandler = () => {
        if (v.currentTime >= 4.8) {
          v.pause()
        }
      }
      v.addEventListener('timeupdate', timeUpdateHandler)
    }

    // 1. Hands meet and clasp with starburst effect at 350ms
    const claspTimer = setTimeout(() => {
      setStage('clasped')
    }, 350)

    // 2. Exactly at 3 seconds (3000ms), trigger automatic scroll up & fly upward exit
    const exitTimer = setTimeout(() => {
      setStage('exiting')
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }, 3000)

    // 3. Complete navigation to destination page at 3650ms
    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete()
    }, 3650)

    return () => {
      clearTimeout(claspTimer)
      clearTimeout(exitTimer)
      clearTimeout(completeTimer)
      if (v && timeUpdateHandler) {
        v.removeEventListener('timeupdate', timeUpdateHandler)
      }
    }
  }, [isOpen, onComplete])

  if (!isOpen) return null

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-700 ${
        stage === 'exiting' ? 'bg-black/20 backdrop-blur-xs' : 'bg-black/80 backdrop-blur-md'
      }`}
      role="dialog"
      aria-modal="true"
    >
      <style>{`
        @keyframes burstPulse {
          0% { transform: scale(0.4); opacity: 0; }
          50% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes sparkleFloat {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-40px) scale(1.2); opacity: 0; }
        }
        @keyframes progressBarFill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .anim-burst { animation: burstPulse 0.9s ease-out infinite; }
        .anim-sparkle-1 { animation: sparkleFloat 1.8s ease-out infinite; }
        .anim-sparkle-2 { animation: sparkleFloat 2.2s ease-out infinite 0.4s; }
        .anim-progress { animation: progressBarFill 3s linear forwards; }
      `}</style>

      {/* CARD CONTAINER WITH AUTOMATIC SCROLL-UP / FLY-UP EXIT */}
      <div 
        className={`relative w-full max-w-lg bg-gradient-to-b from-[#183d21] via-[#122e19] to-[#0c1f11] text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-emerald-400/50 text-center overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          stage === 'exiting' 
            ? '-translate-y-[130vh] scale-90 opacity-0' 
            : 'translate-y-0 scale-100 opacity-100 animate-in fade-in zoom-in-95 duration-400'
        }`}
      >
        {/* BACKGROUND AMBIENT GLOW */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* TOP STATUS BADGE */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-xs font-bold text-emerald-300 uppercase tracking-wider mb-5 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>
            {isTamil 
              ? '🌾 உழவர் - நுகர்வோர் நேரடி பிணைப்பு' 
              : '🌾 Direct Farm-to-Consumer Trust Established'}
          </span>
        </div>

        {/* ========================================================
            REAL 3-SECOND HANDSHAKE VIDEO CLIP (FARMER & CUSTOMER)
           ======================================================== */}
        <div className="relative w-full max-w-[440px] aspect-[16/10] sm:aspect-video mx-auto mb-5 rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-[0_0_30px_rgba(16,185,129,0.35)] bg-black/60">
          <video
            ref={videoRef}
            src="/handshake.mp4?v=2#t=1.8,4.8"
            autoPlay
            playsInline
            muted
            preload="auto"
            className="w-full h-full object-cover"
          >
            <source src="/handshake.mp4?v=2#t=1.8,4.8" type="video/mp4" />
          </video>

          {/* CELEBRATION SHOCKWAVE / GOLDEN BURST OVER VIDEO */}
          {stage === 'clasped' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-36 h-36 rounded-full bg-gradient-to-r from-yellow-400/25 to-green-400/25 anim-burst blur-md" />
              <div className="absolute top-2 left-3 text-lg anim-sparkle-1">✨</div>
              <div className="absolute top-3 right-3 text-lg anim-sparkle-2">🌾</div>
              <div className="absolute bottom-10 left-4 text-base anim-sparkle-2">🌱</div>
              <div className="absolute bottom-10 right-4 text-lg anim-sparkle-1">💛</div>
            </div>
          )}

          {/* SOFT BOTTOM GRADIENT FOR LABELS */}
          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

          {/* FARMER AND CUSTOMER LABELS ON THE VIDEO */}
          <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between text-xs font-bold pointer-events-none">
            <span className="bg-emerald-950/85 text-emerald-200 border border-emerald-500/50 px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 text-[11px]">
              👨‍🌾 {isTamil ? 'விவசாயி' : 'Farmer'}
            </span>
            <span className="text-yellow-300 font-extrabold text-sm drop-shadow-md">🤝</span>
            <span className="bg-blue-950/85 text-blue-200 border border-blue-500/50 px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 text-[11px]">
              🛒 {isTamil ? 'வாடிக்கையாளர்' : 'Customer'}
            </span>
          </div>
        </div>

        {/* WELCOME HEADINGS */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2 drop-shadow-sm">
          {isTamil 
            ? 'வணக்கம்! உழவர் சந்தைக்கு நல்வரவு' 
            : 'Welcome to Uzhavar Market!'}
        </h2>

        <p className="text-sm sm:text-base text-emerald-200/90 max-w-md mx-auto mb-5 leading-relaxed drop-shadow-xs">
          {isTamil
            ? 'விவசாயியிடமிருந்து இடைத்தரகர்கள் இன்றி தூய பண்ணைப் பொருட்கள் நேரடியாக உங்கள் இல்லத்திற்கு!'
            : 'Direct, authentic farm-fresh goods from cultivating farmers to your doorstep.'}
        </p>

        {/* ROLE GREETING CARD */}
        <div className="bg-white/10 border border-emerald-500/30 rounded-2xl py-2.5 px-4 max-w-sm mx-auto mb-5 flex items-center justify-center gap-2.5 text-xs sm:text-sm font-semibold text-emerald-100">
          <span className="text-base">🤝</span>
          <span>
            {isTamil 
              ? `${userName ? `${userName}, ` : ''}வெற்றிகரமாக உள்நுழைந்துவிட்டீர்கள்!`
              : `Logged in successfully${userName ? ` as ${userName}` : ''}!`}
          </span>
        </div>

        {/* BOTTOM PROGRESS BAR & AUTOMATIC SCROLL NOTIFICATION */}
        <div className="w-full bg-emerald-950/80 rounded-full h-2.5 overflow-hidden border border-emerald-700/50 p-0.5 mb-2">
          <div className="h-full bg-gradient-to-r from-yellow-400 via-emerald-400 to-green-300 rounded-full anim-progress" />
        </div>

        <p className="text-[11px] text-emerald-300/80 flex items-center justify-center gap-1.5 m-0 font-medium">
          <span className="animate-bounce">↑</span>
          <span>
            {isTamil 
              ? 'முகப்பிற்கு தானாகச் செல்கிறது...' 
              : 'Automatically taking you to Home...'}
          </span>
        </p>

      </div>
    </div>
  )
}

