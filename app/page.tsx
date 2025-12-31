'use client'

import { useAuth } from './context/AuthContext'
import BudgetPlanner from './ClientComponent'
import AuthPage from './(components)/AuthPage'
import { Loader2 } from 'lucide-react'

export default function Page() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  return <BudgetPlanner />
}