'use client'

import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { DollarSign, Mail, Lock, User, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'

export default function AuthPage() {
  const { login, signup } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    const result = isLogin
      ? await login(formData.email, formData.password)
      : await signup(formData.email, formData.password, formData.name)

    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.error || 'An error occurred')
    }
    setIsLoading(false)
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    setError('')
    setFormData({ email: '', password: '', name: '', confirmPassword: '' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center p-4 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
      </div>

      {/* Floating dollar signs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute text-yellow-500/10 animate-float"
            style={{
              left: `${15 + i * 15}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${4 + i}s`,
            }}
          >
            <DollarSign size={40 + i * 10} />
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="relative w-full max-w-md">
        {/* Success animation overlay */}
        {success && (
          <div className="absolute inset-0 bg-neutral-900/95 rounded-2xl flex items-center justify-center z-10 animate-fadeIn">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-4 animate-scaleIn">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {isLogin ? 'Welcome back!' : 'Account created!'}
              </h3>
              <p className="text-neutral-400">Redirecting you...</p>
            </div>
          </div>
        )}

        <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-700/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-8 pb-6 text-center relative">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/25 mb-4 animate-bounce-slow">
              <DollarSign className="w-8 h-8 text-neutral-900" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Budget Planner</h1>
            <p className="text-neutral-400">
              {isLogin ? 'Welcome back! Sign in to continue.' : 'Create an account to get started.'}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="px-8">
            <div className="flex bg-neutral-800/50 rounded-xl p-1 relative">
              <div
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-yellow-500 rounded-lg transition-transform duration-300 ease-out"
                style={{
                  transform: isLogin ? 'translateX(0)' : 'translateX(100%)',
                }}
              />
              <button
                onClick={() => !isLoading && switchMode()}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg relative z-10 transition-colors duration-300 ${
                  isLogin ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => !isLoading && switchMode()}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg relative z-10 transition-colors duration-300 ${
                  !isLogin ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 pt-6 space-y-4">
            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm animate-shake">
                {error}
              </div>
            )}

            {/* Name field (signup only) */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                isLogin ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'
              }`}
            >
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                  required={!isLogin}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email field */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password field */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>

            {/* Confirm password field (signup only) */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                isLogin ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'
              }`}
            >
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                  required={!isLogin}
                  minLength={6}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-neutral-900 font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-yellow-500/25"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="px-8 pb-8 text-center">
            <p className="text-neutral-500 text-sm">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => !isLoading && switchMode()}
                className="text-yellow-500 hover:text-yellow-400 font-medium transition-colors"
                disabled={isLoading}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-6 flex items-center justify-center gap-6 text-neutral-500 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            </div>
            Secure
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            </div>
            Encrypted
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            </div>
            Free
          </div>
        </div>
      </div>

      {/* Custom styles for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translateX(-4px);
          }
          20%, 40%, 60%, 80% {
            transform: translateX(4px);
          }
        }
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.4s ease-out;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
