'use client'

import { useEffect } from 'react'

/**
 * Programmatic haptic trigger for supported mobile devices (Android / Chromium)
 * @param {number|number[]} pattern Duration in ms or vibration pattern
 */
export function triggerHaptic(pattern = 12) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern)
    } catch (err) {
      // Ignore if device policy or battery saver blocks vibration
    }
  }
}

/**
 * TactileFeedback
 * Provides micro-haptic vibration feedback on touch devices
 * whenever the user taps buttons, cards, or interactive controls.
 */
export default function TactileFeedback() {
  useEffect(() => {
    function handlePointerDown(e) {
      // Ignore desktop mouse clicks - only trigger for touch and stylus taps
      if (e.pointerType === 'mouse') return

      const target = e.target
      const targetEl = target instanceof Element ? target : target?.parentElement
      if (!targetEl || typeof targetEl.closest !== 'function') return

      // Find nearest interactive element
      const interactiveEl = targetEl.closest(
        'button, a, input[type="submit"], input[type="button"], [role="button"], .cursor-pointer, tr.cursor-pointer, select, input[type="checkbox"], input[type="radio"]'
      )

      if (interactiveEl) {
        // Do not vibrate for disabled elements
        if (interactiveEl.disabled || interactiveEl.getAttribute('aria-disabled') === 'true') {
          return
        }

        // Trigger micro-haptic pulse on supported mobile hardware (Android/Chrome/Samsung/etc.)
        triggerHaptic(12)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  return null
}
