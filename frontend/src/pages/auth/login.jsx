import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Checkbox } from '../../components/ui/checkbox'
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
  X,
  UserPlus,
} from 'lucide-react'
import { getApiBaseUrl } from '../../lib/apiBaseUrl'
import loginBackground from '../../assets/loginbackground.jpg'
import { Dialog, DialogContent } from '../../components/ui/dialog'
import RestrictedAppealPanel from '../../components/moderation/RestrictedAppealPanel.jsx'
import { toast } from 'sonner'

// Match landing page palette
const navy = '#081F5C'
const navyMuted = '#0b2b73'
const navyBright = '#1447a6'
const navyGlow = '#2a63cc'

const bvPeriwinkle = '#e0e7ff'
const bvSoft = '#c7d2fe'
const bvViolet = '#a5b4fc'

const borderNavySoft = 'rgba(8, 31, 92, 0.12)'
const textBodyOnLight = 'rgba(8, 31, 92, 0.72)'

const gradientNavyButton = `linear-gradient(135deg, ${navy} 0%, ${navyMuted} 42%, ${navyBright} 78%, ${navyGlow} 100%)`

function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [rejectionNotice, setRejectionNotice] = useState(null)
  const [restrictionNotice, setRestrictionNotice] = useState(null)
  const [isRestrictionModalOpen, setIsRestrictionModalOpen] = useState(false)

  // Floating Reset Password Modal State (3-step OTP flow)
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
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

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
    if (rejectionNotice) setRejectionNotice(null)
    if (restrictionNotice) setRestrictionNotice(null)
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setRejectionNotice(null)
    setRestrictionNotice(null)
    setIsLoading(true)
    try {
      const loginUrl = `${getApiBaseUrl()}/api/users/login`
      const res = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (res.status === 403 && err?.code === 'ACCOUNT_RESTRICTED') {
          setErrors({})
          setRestrictionNotice({
            title: 'Account Restricted',
            message:
              typeof err?.message === 'string' && err.message.trim()
                ? err.message.trim()
                : 'Your account is currently restricted due to rule violations.',
            reason:
              typeof err?.reason === 'string' && err.reason.trim()
                ? err.reason.trim()
                : 'Repeated or severe violation of E-Paayos platform rules.',
            restrictionReason:
              typeof err?.reason === 'string' && err.reason.trim()
                ? err.reason.trim()
                : 'Repeated or severe violation of E-Paayos platform rules.',
            restrictedAt: err?.restrictedAt || null,
            restrictedUntil: err?.restrictedUntil || null,
            warningCount: Number(err?.warningCount || 0),
            relatedTicket: err?.relatedTicket || '',
            restrictionRelatedTicket: err?.relatedTicket || '',
            latestAppeal: err?.latestAppeal || null,
            action:
              typeof err?.action === 'string' && err.action.trim()
                ? err.action.trim()
                : 'You may submit an appeal or monitor your appeal status below.',
          })
          setIsRestrictionModalOpen(true)
          return
        }
        if (res.status === 403 && err?.code === 'ACCOUNT_REJECTED') {
          setErrors({})
          setRejectionNotice({
            title: 'Registration Not Approved',
            message:
              typeof err?.message === 'string' && err.message.trim()
                ? err.message.trim()
                : 'Your registration was not approved.',
            reason:
              typeof err?.reason === 'string' && err.reason.trim()
                ? err.reason.trim()
                : 'No specific reason was provided by the administrator.',
            action:
              typeof err?.action === 'string' && err.action.trim()
                ? err.action.trim()
                : 'Please submit a new registration using accurate details that match your registration information and valid ID.',
          })
          return
        }
        const msg =
          typeof err?.message === 'string' && err.message.trim()
            ? err.message
            : res.status === 403
              ? 'Access denied.'
              : 'Invalid email or password'
        throw new Error(msg)
      }
      const data = await res.json()
      localStorage.setItem('token', data.token)
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: data._id != null ? String(data._id) : undefined,
          email: data.email,
          role: data.role,
          fullName: data.fullName,
        }),
      )
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true')
      } else {
        localStorage.removeItem('rememberMe')
      }
      if (data.role === 'customer') {
        window.location.hash = '#/customer/dashboard'
      } else if (data.role === 'admin') {
        window.location.hash = '#/admin/dashboard'
      } else if (data.role === 'oncall-mechanic-technician') {
        window.location.hash = '#/independent/technician/dashboard'
      } else if (data.role === 'shop-owner') {
        window.location.hash = '#/provider/dashboard'
      } else if (data.role === 'mechanic-technician') {
        window.location.hash = '#/mechanic/technician/dashboard'
      } else {
        window.location.hash = '#/'
      }
    } catch (error) {
      const isNetworkError = error instanceof TypeError && /fetch/i.test(error?.message || '')
      const errorMessage = isNetworkError
        ? 'Cannot connect to server. Make sure backend is running and VITE_API_URL is correct.'
        : error?.message || 'Invalid email or password'
      const lower = errorMessage.toLowerCase()
      const isRejection = lower.includes('not approved') || lower.includes('rejected')
      const isPendingApproval = lower.includes('waiting for admin approval') || lower.includes('admin approval')
      setErrors({ general: errorMessage, isRejection, isPendingApproval })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitRestrictedAppeal = async ({ subject, reason, evidencePhotos }) => {
    const res = await fetch(`${getApiBaseUrl()}/api/users/restricted-appeal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
        subject,
        reason,
        evidencePhotos,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data?.message || 'Failed to submit appeal.')
    }
    toast.success(data?.message || 'Appeal submitted! You can monitor its status here.')
    setRestrictionNotice((prev) => ({
      ...(prev || {}),
      latestAppeal: data?.latestAppeal || data?.appeal || prev?.latestAppeal || null,
    }))
  }

  const handleRefreshRestrictedStatus = async () => {
    const res = await fetch(`${getApiBaseUrl()}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.email, password: formData.password }),
    })
    if (res.ok) {
      // Restriction lifted / appeal approved! Sign user in cleanly
      const data = await res.json()
      localStorage.setItem('token', data.token)
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: data._id != null ? String(data._id) : undefined,
          email: data.email,
          role: data.role,
          fullName: data.fullName,
        }),
      )
      setIsRestrictionModalOpen(false)
      setRestrictionNotice(null)
      if (data.role === 'customer') window.location.hash = '#/customer/dashboard'
      else if (data.role === 'oncall-mechanic-technician') window.location.hash = '#/independent/technician/dashboard'
      else if (data.role === 'shop-owner') window.location.hash = '#/provider/dashboard'
      else if (data.role === 'mechanic-technician') window.location.hash = '#/mechanic/technician/dashboard'
      else window.location.hash = '#/'
      return
    }
    const err = await res.json().catch(() => ({}))
    if (res.status === 403 && err?.code === 'ACCOUNT_RESTRICTED') {
      setRestrictionNotice((prev) => ({
        ...(prev || {}),
        latestAppeal: err?.latestAppeal || prev?.latestAppeal || null,
        restrictedUntil: err?.restrictedUntil || prev?.restrictedUntil || null,
      }))
    }
  }

  // Open Forgot Password Modal
  const handleOpenForgotPassword = () => {
    setResetEmail(formData.email.trim())
    setForgotStep('request')
    setUnregisteredError(null)
    setResetError(null)
    setOtp('')
    setNewPassword('')
    setConfirmPassword('')
    setIsForgotModalOpen(true)
  }

  // Close Forgot Password Modal
  const handleCloseForgotPassword = () => {
    setIsForgotModalOpen(false)
    setUnregisteredError(null)
    setResetError(null)
    setOtp('')
  }

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
      setFormData((prev) => ({ ...prev, email: cleanEmail, password: '' }))
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
                onClick={() => { window.location.hash = '#/' }}
                aria-label="Back to Home"
                title="Back to Home"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sm:inline">Back to Home</span>
              </button>
            </div>
            <CardTitle className="text-2xl sm:text-2xl font-bold tracking-tight mt-2" style={{ color: navy }}>
              Welcome Back
            </CardTitle>
            <CardDescription className="text-sm" style={{ color: textBodyOnLight }}>
              Sign in to your E‑Paayos account
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8 pt-2 sm:p-6 sm:pt-0 flex-1 sm:flex-initial flex flex-col justify-center">
            <form onSubmit={handleSubmit} className="space-y-4">
              {restrictionNotice && (
                <div className="relative overflow-hidden rounded-none border-2 border-rose-400 bg-linear-to-br from-rose-50 via-white to-amber-50 p-4 shadow-sm">
                  <div className="relative space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black tracking-wide text-rose-800 uppercase">
                        Access Restricted
                      </p>
                      {restrictionNotice.warningCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-rose-700 text-white">
                          {restrictionNotice.warningCount} Strike{restrictionNotice.warningCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-rose-950">{restrictionNotice.title}</h3>
                    <p className="text-xs text-rose-900 leading-relaxed">{restrictionNotice.message}</p>
                    <div className="rounded-none border border-rose-200 bg-white/95 p-3 space-y-1">
                      <p className="text-[10px] font-bold text-rose-700 uppercase">Restriction Reason</p>
                      <p className="text-xs font-semibold text-rose-950 whitespace-pre-wrap">{restrictionNotice.reason}</p>
                      <p className="text-[11px] text-slate-600 pt-1">
                        Duration:{' '}
                        <span className="font-bold text-slate-900">
                          {restrictionNotice.restrictedUntil
                            ? `Until ${new Date(restrictionNotice.restrictedUntil).toLocaleString('en-PH', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : 'Indefinite (Until Lifted by Administrator)'}
                        </span>
                      </p>
                      {restrictionNotice.relatedTicket && (
                        <p className="text-[11px] font-mono text-rose-800">
                          Ticket: #{restrictionNotice.relatedTicket}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-rose-800">{restrictionNotice.action}</p>
                    <button
                      type="button"
                      onClick={() => setIsRestrictionModalOpen(true)}
                      className="inline-flex items-center rounded-none bg-[#081F5C] hover:bg-[#1447a6] px-3 py-1.5 text-xs font-bold text-white transition cursor-pointer"
                    >
                      {restrictionNotice.latestAppeal ? 'Monitor Appeal Status' : 'Open Appeal & Details'}
                    </button>
                  </div>
                </div>
              )}
              {rejectionNotice && (
                <div className="relative overflow-hidden rounded-none border border-rose-300/70 bg-linear-to-br from-rose-50 via-white to-orange-50 p-4 shadow-xs">
                  <div className="absolute -top-10 -right-10 h-28 w-28 bg-rose-200/30 blur-2xl" aria-hidden />
                  <div className="relative space-y-2 text-sm">
                    <p className="text-xs font-bold tracking-wide text-rose-700 uppercase">
                      Account Update
                    </p>
                    <h3 className="text-base font-bold text-rose-900">{rejectionNotice.title}</h3>
                    <p className="text-rose-800">{rejectionNotice.message}</p>
                    <div className="rounded-none border border-rose-200 bg-white/90 p-3">
                      <p className="text-xs font-bold text-rose-700 uppercase">Admin message</p>
                      <p className="mt-0.5 text-sm text-rose-900">{rejectionNotice.reason}</p>
                    </div>
                    <p className="text-rose-800">{rejectionNotice.action}</p>
                    <button
                      type="button"
                      onClick={() => { window.location.hash = '#/register' }}
                      className="inline-flex items-center rounded-none border border-rose-300 bg-white px-3 py-1.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50 cursor-pointer"
                    >
                      Start New Registration
                    </button>
                  </div>
                </div>
              )}
              {errors.general && (
                <div
                  className={`rounded-none border p-4 ${errors.isPendingApproval
                      ? 'border-amber-300 bg-amber-50'
                      : errors.isRejection
                        ? 'border-red-300 bg-red-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                >
                  <p
                    className={`text-sm ${errors.isPendingApproval
                        ? 'font-semibold text-amber-900'
                        : errors.isRejection
                          ? 'font-semibold text-red-800'
                          : 'text-red-700'
                      }`}
                  >
                    {errors.general}
                  </p>
                  {errors.isRejection && (
                    <p className="mt-1.5 text-xs text-red-600">
                      Please register with reliable information about yourself.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium" style={{ color: navy }}>Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`pl-10 h-11 sm:h-10 text-sm rounded-none ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                    required
                  />
                </div>
                {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium" style={{ color: navy }}>Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`pl-10 pr-10 h-11 sm:h-10 text-sm rounded-none ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(v) => setRememberMe(Boolean(v))}
                    className="rounded-none"
                  />
                  <Label htmlFor="remember" className="text-sm cursor-pointer select-none" style={{ color: textBodyOnLight }}>
                    Remember me
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={handleOpenForgotPassword}
                  className="text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer"
                  style={{ color: navy }}
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-11 sm:h-10 text-sm font-semibold border-0 shadow-md hover:brightness-110 hover:shadow-lg rounded-none cursor-pointer"
                style={{ backgroundImage: gradientNavyButton, color: '#ffffff' }}
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>

              <div className="text-center text-sm pt-2" style={{ color: textBodyOnLight }}>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  className="font-semibold underline hover:opacity-80 transition-opacity cursor-pointer"
                  style={{ color: navy }}
                  onClick={() => { window.location.hash = '#/register' }}
                >
                  Sign up
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* RESTRICTED ACCOUNT & APPEAL MONITOR MODAL                                 */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(isRestrictionModalOpen && restrictionNotice)}
        onOpenChange={(open) => {
          if (!open) setIsRestrictionModalOpen(false)
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-h-[92vh] max-w-[calc(100vw-1.5rem)] sm:max-w-xl overflow-hidden flex flex-col p-0 border-2 border-rose-500 bg-white shadow-2xl rounded-none z-50"
        >
          <RestrictedAppealPanel
            restriction={restrictionNotice}
            onSubmitAppeal={handleSubmitRestrictedAppeal}
            onRefreshStatus={handleRefreshRestrictedStatus}
            onSignOut={() => setIsRestrictionModalOpen(false)}
            onContinueApproved={handleRefreshRestrictedStatus}
            signOutLabel="Sign Out / Back"
          />
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* FLOATING 3-STEP OTP RESET PASSWORD MODAL OVERLAY (NO BLUR, SHARP BG)     */}
      {/* ========================================================================= */}
      {isForgotModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 animate-in fade-in-0 duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseForgotPassword()
          }}
        >
          {/* Floating Modal Box */}
          <div
            className="w-full max-w-md relative p-6 sm:p-7 rounded-none border shadow-2xl animate-in zoom-in-95 duration-200 transition-all bg-white text-slate-900 border-slate-200"
            style={{ borderColor: borderNavySoft }}
          >
            {/* Close Button "X" */}
            <button
              type="button"
              onClick={handleCloseForgotPassword}
              className="absolute top-4 right-4 p-1.5 rounded-none text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="size-4.5" />
            </button>

            {/* Modal Header */}
            <div className="mb-5 pr-6">
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="size-7 rounded-none flex items-center justify-center border"
                  style={{ backgroundColor: bvPeriwinkle, borderColor: bvViolet, color: navy }}
                >
                  <Lock className="size-3.5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight" style={{ color: navy }}>
                  {forgotStep === 'success' ? 'Password Updated' : 'Reset Password'}
                </h3>
              </div>
              <p className="text-xs" style={{ color: textBodyOnLight }}>
                {forgotStep === 'request'
                  ? 'Enter your registered email to receive a 6-digit verification code.'
                  : forgotStep === 'verify_and_reset'
                    ? 'Enter the 6-digit code sent to your email to set your new password.'
                    : 'Your account password has been updated successfully.'}
              </p>
            </div>

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
                    onClick={() => {
                      handleCloseForgotPassword()
                      window.location.hash = '#/register'
                    }}
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
                  <Label htmlFor="reset-modal-email" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Registered Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      id="reset-modal-email"
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
                    onClick={handleCloseForgotPassword}
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
                      <Label htmlFor="reset-modal-otp" className="text-xs font-bold uppercase tracking-wider text-slate-700">
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
                        id="reset-modal-otp"
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
                    <Label htmlFor="reset-modal-new-pwd" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      New Password (min. 6 chars)
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        id="reset-modal-new-pwd"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="New password"
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
                    <Label htmlFor="reset-modal-confirm-pwd" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        id="reset-modal-confirm-pwd"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm password"
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
                      onClick={handleCloseForgotPassword}
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
                  onClick={handleCloseForgotPassword}
                  className="w-full h-11 text-white font-bold text-xs uppercase tracking-wider rounded-none shadow-lg transition-all cursor-pointer border-0"
                  style={{ backgroundImage: gradientNavyButton }}
                >
                  Proceed to Sign In
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
