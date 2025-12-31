import '../styles/globals.css'
import { AuthProvider } from './context/AuthContext'

export const metadata = {
  title: 'Budget Planner',
  description: 'A simple budgeting application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-100 font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}