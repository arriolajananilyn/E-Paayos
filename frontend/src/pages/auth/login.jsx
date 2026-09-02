import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Checkbox } from '../../components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { getApiBaseUrl } from '../../lib/apiBaseUrl'
import loginBackground from '../../assets/loginbackground.jpg'

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
const gradientBlueVioletButton = `linear-gradient(135deg, ${bvPeriwinkle} 0%, ${bvSoft} 45%, ${bvViolet} 100%)`

function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)
  const [rejectionNotice, setRejectionNotice] = useState(null)

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
    if (rejectionNotice) setRejectionNotice(null)
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
    setIsLoading(true)
    try {
      const loginUrl = `${getApiBaseUrl()}/api/users/login`
      const res = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
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
        : (error?.message || 'Invalid email or password')
      const lower = errorMessage.toLowerCase()
      const isRejection = lower.includes('not approved') || lower.includes('rejected')
      const isPendingApproval = lower.includes('waiting for admin approval') || lower.includes('admin approval')
      setErrors({ general: errorMessage, isRejection, isPendingApproval })
    } finally {
      setIsLoading(false)
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
          className="w-full min-h-screen sm:min-h-0 flex flex-col justify-center border-0 sm:border shadow-none sm:shadow-2xl rounded-none bg-white sm:bg-[rgba(255,255,255,0.96)] sm:backdrop-blur-md"
          style={{
            borderColor: 'rgba(255, 255, 255, 0.22)',
            boxShadow: undefined,
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
                    placeholder="Enter your email"
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
                    placeholder="Enter your password"
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
                  onClick={() => setShowForgotPasswordModal(true)}
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

      <Dialog open={showForgotPasswordModal} onOpenChange={setShowForgotPasswordModal}>
        <DialogContent
          className="border rounded-none max-w-sm sm:max-w-md"
          style={{ borderColor: borderNavySoft, backgroundColor: '#ffffff' }}
        >
          <DialogHeader className="rounded-none">
            <DialogTitle className="text-lg sm:text-xl font-bold" style={{ color: navy }}>Reset password</DialogTitle>
            <DialogDescription className="text-sm" style={{ color: textBodyOnLight }}>
              Enter your account email and we&apos;ll send you a reset link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reset-email" className="text-sm font-medium" style={{ color: navy }}>Email</Label>
            <Input id="reset-email" type="email" placeholder="you@email.com" className="h-10 text-sm rounded-none" />
          </div>
          <DialogFooter className="grid grid-cols-2 sm:flex sm:flex-row gap-2 rounded-none">
            <Button
              variant="outline"
              onClick={() => setShowForgotPasswordModal(false)}
              className="rounded-none text-sm font-medium"
              style={{ borderColor: borderNavySoft, color: navy }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => { setShowForgotPasswordModal(false); alert('If this were connected, we would send a reset link.'); }}
              className="border-0 shadow-md hover:brightness-110 hover:shadow-lg rounded-none text-sm font-medium"
              style={{ backgroundImage: gradientBlueVioletButton, color: navy }}
            >
              Send link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Login

