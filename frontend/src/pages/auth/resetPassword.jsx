import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  UserPlus,
} from 'lucide-react'
import { getApiBaseUrl } from '../../lib/apiBaseUrl'
import loginBackground from '../../assets/loginbackground.jpg'

// Match landing page & auth palette
const navy = '#081F5C'
const navyMuted = '#0b2b73'
const navyBright = '#1447a6'
const navyGlow = '#2a63cc'

const bvPeriwinkle = '#e0e7ff'
const bvViolet = '#a5b4fc'

const borderNavySoft = 'rgba(8, 31, 92, 0.12)'
const textBodyOnLight = 'rgba(8, 31, 92, 0.72)'

const gradientNavyButton = `linear-gradient(135deg, ${navy} 0%, ${navyMuted} 42%, ${navyBright} 78%, ${navyGlow} 100%)`

function ResetPassword() {
  const [forgotStep, setForgotStep] = useState('request') // "request" | "verify_and_reset" | "success"
  const [resetEmail, setResetEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [unregisteredError, setUnregisteredError] = useState(null)
  const [resetError, setResetError] = useState(null)

  useEffect(() => {
    // Extract token or email from URL if present
    const hash = window.location.hash || ''
    let extractedEmail = ''
    if (hash.includes('?')) {
      const queryString = hash.split('?')[1]
      const urlParams = new URLSearchParams(queryString)
      extractedEmail = urlParams.get('email') || ''
    }
    if (!extractedEmail) {
      const searchParams = new URLSearchParams(window.location.search)
      extractedEmail = searchParams.get('email') || ''
    }
    if (extractedEmail) {
      setResetEmail(extractedEmail)
    }
  }, [])

  // Resend Countdown Timer for OTP
  useEffect(() => {
    let timer
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [resendCountdown])

  // Handle Step 1: Send OTP to Email
  const handleRequestResetOtp = async (e) => {
    if (e) e.preventDefault()
    setUnregisteredError(null)
    setResetError(null)

    if (!resetEmail || !resetEmail.trim()) {
      setResetError('Please enter your registered email address.')
      return
    }

    const cleanEmail = resetEmail.trim().toLowerCase()
    setIsSendingReset(true)

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 404) {
          setUnregisteredError(data.message || 'This email address is not registered in E-Paayos.')
          return
        }
        throw new Error(data.message || 'Failed to send verification code.')
      }

      setOtp('')
      setForgotStep('verify_and_reset')
      setResendCountdown(60)
    } catch (err) {
      setResetError(err.message || 'An error occurred while communicating with the server.')
    } finally {
      setIsSendingReset(false)
    }
  }

  // Handle Resend OTP Code
  const handleResendOtp = async () => {
    if (resendCountdown > 0 || isSendingReset) return
    setIsSendingReset(true)
    setResetError(null)
    try {
      const cleanEmail = resetEmail.trim().toLowerCase()
      const res = await fetch(`${getApiBaseUrl()}/api/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.message || 'Failed to resend verification code.')
      }

      setResendCountdown(60)
    } catch (err) {
      setResetError(err.message || 'Failed to resend verification code.')
    } finally {
      setIsSendingReset(false)
    }
  }

  // Handle Step 2: Verify OTP and Save New Password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault()
    setResetError(null)

    if (!otp || otp.trim().length < 6) {
      setResetError('Please enter the complete 6-digit verification code from your email.')
      return
    }

    if (!newPassword) {
      setResetError('Please enter your new password.')
      return
    }

    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match. Please retype and confirm.')
      return
    }

    setIsResettingPassword(true)

    try {
      const cleanEmail = resetEmail.trim().toLowerCase()
      const res = await fetch(`${getApiBaseUrl()}/api/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          otp: otp.trim(),
          newPassword: newPassword.trim(),
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.message || 'Failed to reset password.')
      }

      setForgotStep('success')
    } catch (err) {
      setResetError(err.message || 'Invalid or expired verification code.')
    } finally {
      setIsResettingPassword(false)
    }
  }

  return (
    <div
      className="min-h-screen relative flex items-center justify-center p-0 sm:p-4 overflow-x-hidden overflow-y-auto"
      style={{
        backgroundImage: `url(${loginBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        color: '#ffffff',
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 hidden sm:block"
        style={{ backgroundColor: 'rgba(4, 19, 61, 0.35)' }}
      />
      <div className="w-full min-h-screen sm:min-h-0 sm:max-w-md relative z-10 flex flex-col justify-center">
        <Card
          className="w-full min-h-screen sm:min-h-0 flex flex-col justify-center border-0 sm:border shadow-none sm:shadow-2xl rounded-none bg-white sm:bg-white"
          style={{
            borderColor: 'rgba(255, 255, 255, 0.22)',
          }}
        >
          <CardHeader className="text-center rounded-none px-6 pt-8 pb-4 sm:p-6 sm:pb-3">
            <div className="flex justify-start">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer"
                style={{ color: navy }}
                onClick={() => { window.location.hash = '#/login' }}
                aria-label="Back to Login"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sm:inline">Back to Sign In</span>
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-3 mb-1">
              <div
                className="size-8 rounded-none flex items-center justify-center border"
                style={{ backgroundColor: bvPeriwinkle, borderColor: bvViolet, color: navy }}
              >
                <Lock className="size-4" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight" style={{ color: navy }}>
                {forgotStep === 'success' ? 'Password Updated' : 'Reset Password'}
              </CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm" style={{ color: textBodyOnLight }}>
              {forgotStep === 'request'
                ? 'Enter your registered email to receive a 6-digit verification code.'
                : forgotStep === 'verify_and_reset'
                  ? 'Enter the 6-digit code sent to your email to set your new password.'
                  : 'Your account password has been updated successfully.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-8 pt-2 sm:p-6 sm:pt-0 flex-1 sm:flex-initial flex flex-col justify-center">
            {/* Unregistered Email Alert Banner */}
            {unregisteredError && (
              <div className="p-3 rounded-none border text-xs space-y-1.5 mb-4 animate-in fade-in-50 duration-200 bg-rose-50 border-rose-200 text-rose-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="size-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1 text-[11px] leading-relaxed">
                    <span className="font-bold block text-xs">Account Not Found</span>
                    {unregisteredError}
                  </div>
                </div>
                <div className="pt-0.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => { window.location.hash = '#/register' }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    <UserPlus className="size-3" />
                    Create New Account
                  </button>
                </div>
              </div>
            )}

            {/* General Reset Error Banner */}
            {resetError && (
              <div className="p-3 rounded-none border text-xs mb-4 animate-in fade-in-50 duration-200 bg-red-50 border-red-200 text-red-700 flex items-start gap-2">
                <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed">{resetError}</span>
              </div>
            )}

            {/* STEP 1: Request Code Form */}
            {forgotStep === 'request' && (
              <form onSubmit={handleRequestResetOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reset-page-email" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Registered Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      id="reset-page-email"
                      type="email"
                      placeholder="name@example.com"
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value)
                        if (unregisteredError) setUnregisteredError(null)
                        if (resetError) setResetError(null)
                      }}
                      required
                      autoFocus
                      className="pl-10 h-10.5 text-sm rounded-none bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { window.location.hash = '#/login' }}
                    className="h-10.5 text-xs font-semibold px-4 rounded-none cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSendingReset}
                    className="flex-1 h-10.5 text-white font-bold text-xs uppercase tracking-wider rounded-none shadow-md transition-all cursor-pointer border-0"
                    style={{ backgroundImage: gradientNavyButton }}
                  >
                    {isSendingReset ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" />
                        Sending Code...
                      </>
                    ) : (
                      'Send Verification Code'
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 2: Verify Code and Reset Password Form */}
            {forgotStep === 'verify_and_reset' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200">
                  <span className="truncate mr-2 text-slate-600">
                    Code sent to <span className="font-bold text-blue-800">{resetEmail}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep('request')
                      setUnregisteredError(null)
                      setResetError(null)
                    }}
                    className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer shrink-0"
                  >
                    Change Email
                  </button>
                </div>

                <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                  {/* 6-Digit OTP */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="reset-page-otp" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Verification Code (from your email)
                      </Label>
                      <button
                        type="button"
                        disabled={resendCountdown > 0 || isSendingReset}
                        onClick={handleResendOtp}
                        className={`text-[11px] font-semibold ${
                          resendCountdown > 0
                            ? 'text-slate-400 cursor-not-allowed'
                            : 'text-blue-700 hover:underline cursor-pointer'
                        }`}
                      >
                        {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'}
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        id="reset-page-otp"
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => {
                          setOtp(e.target.value.replace(/\D/g, ''))
                          if (resetError) setResetError(null)
                        }}
                        required
                        autoFocus
                        className="pl-10 h-10 text-center font-mono text-base tracking-[0.3em] font-bold rounded-none bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1">
                    <Label htmlFor="reset-page-new-pwd" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      New Password (min. 6 chars)
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        id="reset-page-new-pwd"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value)
                          if (resetError) setResetError(null)
                        }}
                        required
                        minLength={6}
                        className="pl-10 pr-10 h-10 text-xs rounded-none bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1">
                    <Label htmlFor="reset-page-confirm-pwd" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        id="reset-page-confirm-pwd"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Retype new password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          if (resetError) setResetError(null)
                        }}
                        required
                        minLength={6}
                        className="pl-10 pr-10 h-10 text-xs rounded-none bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-[11px] text-rose-600 font-semibold pt-0.5">
                        Passwords do not match.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { window.location.hash = '#/login' }}
                      className="h-10.5 text-xs font-semibold px-4 rounded-none cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isResettingPassword || (newPassword && newPassword !== confirmPassword)}
                      className="flex-1 h-10.5 text-white font-bold text-xs uppercase tracking-wider rounded-none shadow-md transition-all cursor-pointer border-0"
                      style={{ backgroundImage: gradientNavyButton }}
                    >
                      {isResettingPassword ? (
                        <>
                          <Loader2 className="size-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        'Save New Password'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 3: Success View */}
            {forgotStep === 'success' && (
              <div className="py-2 text-center space-y-4">
                <div
                  className="size-14 rounded-none flex items-center justify-center mx-auto border"
                  style={{ backgroundColor: bvPeriwinkle, borderColor: bvViolet, color: navy }}
                >
                  <CheckCircle2 className="size-7" />
                </div>
                <div>
                  <h4 className="text-lg font-bold" style={{ color: navy }}>
                    Password Reset Complete!
                  </h4>
                  <p className="text-xs mt-1.5 leading-relaxed text-slate-600">
                    Your password for <span className="font-bold text-slate-900">{resetEmail}</span> has been successfully updated.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => { window.location.hash = '#/login' }}
                  className="w-full h-11 text-white font-bold text-xs uppercase tracking-wider rounded-none shadow-lg transition-all cursor-pointer border-0"
                  style={{ backgroundImage: gradientNavyButton }}
                >
                  Proceed to Sign In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ResetPassword
