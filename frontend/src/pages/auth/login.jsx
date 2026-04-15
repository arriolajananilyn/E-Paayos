import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Checkbox } from '../../components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react'

// Match landing page palette
const navyDeep = '#04133d'
const navy = '#081F5C'
const navyMuted = '#0b2b73'
const navyBright = '#1447a6'
const navyGlow = '#2a63cc'

const bvIce = '#eef2ff'
const bvPeriwinkle = '#e0e7ff'
const bvLilac = '#e9e5ff'
const bvSoft = '#c7d2fe'
const bvViolet = '#a5b4fc'

const borderNavySoft = 'rgba(8, 31, 92, 0.12)'
const borderBvSoft = 'rgba(99, 102, 241, 0.18)'
const textBodyOnLight = 'rgba(8, 31, 92, 0.72)'

/** Gradient navy blue — match landing page hero */
const gradientNavyBlue = `linear-gradient(135deg, ${navyDeep} 0%, ${navy} 35%, ${navyMuted} 62%, ${navyBright} 100%)`

/** Hero mesh: navy atmosphere + light blue-violet glows (landing page) */
const gradientHeroMesh = `
  radial-gradient(ellipse 85% 65% at 100% -8%, rgba(147, 197, 253, 0.28) 0%, transparent 52%),
  radial-gradient(ellipse 75% 55% at -5% 105%, rgba(167, 139, 250, 0.22) 0%, transparent 50%),
  radial-gradient(ellipse 55% 45% at 88% 92%, ${navyGlow}44 0%, transparent 52%),
  radial-gradient(ellipse 70% 50% at 15% 20%, rgba(255, 255, 255, 0.07) 0%, transparent 48%)
`

const gradientNavyButton = `linear-gradient(135deg, ${navy} 0%, ${navyMuted} 42%, ${navyBright} 78%, ${navyGlow} 100%)`
const gradientLightBlueViolet = `linear-gradient(155deg, #ffffff 0%, ${bvIce} 28%, ${bvPeriwinkle} 55%, ${bvLilac} 100%)`
const gradientBlueVioletButton = `linear-gradient(135deg, ${bvPeriwinkle} 0%, ${bvSoft} 45%, ${bvViolet} 100%)`

function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
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
    setIsLoading(true)
    try {
      const rawApiUrl = import.meta?.env?.VITE_API_URL
      const baseApiUrl = rawApiUrl ? rawApiUrl.replace(/\/$/, '') : ''
      const loginUrl = `${baseApiUrl}/api/users/login`
      const res = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
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
      } else if (data.role === 'independent-mechanic-technician') {
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
      className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden"
      style={{ backgroundImage: gradientNavyBlue, color: '#ffffff' }}
    >
      <style>{`
        @keyframes epaayosSlowGradientMove {
          0% { background-position: 0% 0%, 0% 50%; transform: translate3d(0, 0, 0) scale(1.02); }
          50% { background-position: 0% 0%, 100% 50%; transform: translate3d(-1.2%, 0.8%, 0) scale(1.04); }
          100% { background-position: 0% 0%, 0% 50%; transform: translate3d(0, 0, 0) scale(1.02); }
        }
        @media (prefers-reduced-motion: reduce) {
          .epaayos-animated-bg { animation: none !important; transform: none !important; }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 epaayos-animated-bg"
        style={{
          backgroundImage: `${gradientHeroMesh},
            radial-gradient(ellipse 70% 60% at 50% 40%, rgba(255, 255, 255, 0.10) 0%, transparent 55%),
            linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.14) 50%, transparent 60%)`,
          backgroundSize: 'auto, 140% 140%, 240% 240%',
          animation: 'epaayosSlowGradientMove 32s ease-in-out infinite',
          opacity: 0.92,
          filter: 'saturate(1.05) brightness(1.08)',
          willChange: 'background-position, transform'
        }}
      />
      <div className="w-full max-w-md relative z-10">
        <Card
          className="border shadow-2xl"
          style={{
            borderColor: 'rgba(255, 255, 255, 0.22)',
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(10px)',
            boxShadow:
              '0 28px 70px rgba(0,0,0,0.35), 0 10px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.75)'
          }}
        >
          <CardHeader className="text-center">
            <div className="flex justify-start">
              <button
                type="button"
                className="inline-flex items-center hover:opacity-80"
                style={{ color: navy }}
                onClick={() => { window.location.hash = '#/' }}
                aria-label="Back to Home"
                title="Back to Home"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
            <CardTitle className="text-2xl" style={{ color: navy }}>Welcome Back</CardTitle>
            <CardDescription style={{ color: textBodyOnLight }}>
              Sign in to your E‑Paayos account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && (
                <div
                  className={`rounded-lg border p-4 ${
                    errors.isPendingApproval
                      ? 'border-amber-300 bg-amber-50'
                      : errors.isRejection
                        ? 'border-red-300 bg-red-50'
                        : 'border-red-200 bg-red-50'
                  }`}
                >
                  <p
                    className={`text-sm ${
                      errors.isPendingApproval
                        ? 'font-medium text-amber-900'
                        : errors.isRejection
                          ? 'font-medium text-red-800'
                          : 'text-red-700'
                    }`}
                  >
                    {errors.general}
                  </p>
                  {errors.isRejection && (
                    <p className="mt-2 text-xs text-red-600">
                      Please register with reliable information about yourself.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" style={{ color: navy }}>Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`pl-10 ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                    required
                  />
                </div>
                {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" style={{ color: navy }}>Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`pl-10 pr-10 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(v) => setRememberMe(Boolean(v))}
                  />
                  <Label htmlFor="remember" className="text-sm" style={{ color: textBodyOnLight }}>
                    Remember me
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="text-sm font-medium hover:opacity-80"
                  style={{ color: navy }}
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full border-0 shadow-md hover:brightness-110 hover:shadow-lg"
                style={{ backgroundImage: gradientNavyButton, color: '#ffffff' }}
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>

              <div className="text-center text-sm" style={{ color: textBodyOnLight }}>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  className="font-medium hover:opacity-80"
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
          className="border"
          style={{ borderColor: borderNavySoft, backgroundColor: '#ffffff' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: navy }}>Reset password</DialogTitle>
            <DialogDescription style={{ color: textBodyOnLight }}>
              Enter your account email and we&apos;ll send you a reset link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-email" style={{ color: navy }}>Email</Label>
            <Input id="reset-email" type="email" placeholder="you@email.com" />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowForgotPasswordModal(false)}
              style={{ borderColor: borderNavySoft, color: navy }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => { setShowForgotPasswordModal(false); alert('If this were connected, we would send a reset link.'); }}
              className="border-0 shadow-md hover:brightness-110 hover:shadow-lg"
              style={{ backgroundImage: gradientBlueVioletButton, color: navy }}
            >
              Send reset link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Login

