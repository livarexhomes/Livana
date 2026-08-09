
import { useState } from 'react'
import { Link, useLocation } from '@/lib/navigation'
import { Eye, EyeOff, CheckCircle2, Mail } from 'lucide-react'

/**
 * Password reset via OTP — the same mechanism that works for landlord
 * onboarding. Flow:
 *   1. User enters email → POST /api/send-password-reset (emails a 6-digit code)
 *   2. User enters the code → POST /api/verify-reset (validates code, updates password)
 */
export default function ResetPasswordPage() {
  const [location] = useLocation()
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email')
  // Prefill the email if the login page forwarded it (?email=...).
  const initialEmail = (() => {
    try {
      return new URLSearchParams((location || '').split('?')[1] ?? '').get('email') ?? ''
    } catch {
      return ''
    }
  })()
  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState('')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function requestCode(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    setSent(false)
    try {
      const res = await fetch('/api/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }
      setSent(true)
      setStep('code')
    } catch {
      setError('Could not reach the email service. Please try again.')
    }
    setLoading(false)
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/verify-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim(), password }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error ?? 'Invalid or expired code. Please try again.')
        setLoading(false)
        return
      }
      setStep('done')
    } catch {
      setError('Could not reach the server. Please try again.')
    }
    setLoading(false)
  }

  // Success
  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-7 h-7 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Password updated</h1>
          <p className="text-sm text-gray-500 mb-6">Your password has been changed. You can now sign in.</p>
          <Link href="/login" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm transition-all">
            Sign in now
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-md w-full">
        <Link href="/" className="inline-flex items-center mb-10">
          <img src="/livarex-logo.png" alt="LIVAREX" className="h-10 w-auto" />
        </Link>

        {step === 'email' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Reset your password</h1>
              <p className="text-gray-500 text-base">Enter your account email and we'll send you a one-time code.</p>
            </div>

            <form onSubmit={requestCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 pr-12 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">{error}</div>
              )}
              {sent && (
                <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                  Code sent! Check your email (it can take a few minutes). Don't see it? Check spam.
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/25 text-sm mt-2"
              >
                {loading ? 'Sending…' : 'Send reset code'}
              </button>

              <p className="text-center text-sm text-gray-400">
                Remembered it?{' '}
                <Link href="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
              </p>
            </form>
          </>
        )}

        {step === 'code' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Enter the code</h1>
              <p className="text-gray-500 text-base flex items-center gap-1.5">
                <Mail className="w-4 h-4" /> We sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span>
              </p>
            </div>

            <form onSubmit={verifyCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Verification code</label>
                <input
                  required
                  autoFocus
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all text-center text-xl font-bold tracking-[0.4em]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">New password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 pr-12 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Confirm password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="w-full px-4 py-3.5 pr-12 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/25 text-sm mt-2"
              >
                {loading ? 'Updating…' : 'Set new password'}
              </button>

              <p className="text-center text-sm text-gray-400">
                <button type="button" onClick={() => { setStep('email'); setSent(false) }}
                  className="text-blue-600 hover:underline font-medium">Request a new code</button>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
