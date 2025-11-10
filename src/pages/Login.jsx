import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { Chrome } from 'lucide-react'

export const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      toast.error(error.message || 'Failed to sign in')
    } else {
      toast.success('Signed in successfully')
      const redirect = searchParams.get('redirect')
      navigate(redirect || '/dashboard')
    }

    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    if (error) {
      toast.error(error.message || 'Failed to sign in with Google')
      setGoogleLoading(false)
    }
    // Note: User will be redirected, so we don't need to navigate manually
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xl p-8 border border-black dark:border-[#333333]"
      >
        <h1 className="text-3xl font-bold text-center text-black dark:text-white mb-8">
          Welcome Back
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-black dark:border-[#333333] rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-[#666666] focus:border-black dark:focus:border-[#666666] bg-white dark:bg-[#1a1a1a] text-black dark:text-white"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-black dark:border-[#333333] rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-[#666666] focus:border-black dark:focus:border-[#666666] bg-white dark:bg-[#1a1a1a] text-black dark:text-white"
              placeholder="••••••••"
            />
          </div>
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-[#1a1a1a] border border-black dark:border-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </motion.button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-black dark:border-[#333333]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-[#1a1a1a] text-black dark:text-[#999999]">
              Or continue with
            </span>
          </div>
        </div>

        {/* Google Sign In Button */}
        <motion.button
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-black dark:border-[#333333] rounded-lg font-semibold text-black dark:text-white bg-white dark:bg-[#1a1a1a] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {googleLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <Chrome className="w-5 h-5" />
              Sign in with Google
            </>
          )}
        </motion.button>

        <p className="mt-6 text-center text-sm text-black dark:text-[#cccccc]">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="text-black dark:text-white hover:text-[#333333] dark:hover:text-[#cccccc] font-semibold"
          >
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
