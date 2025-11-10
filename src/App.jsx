import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './context/ThemeContext'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import { SharedCanvas } from './pages/SharedCanvas'
import { ProtectedRoute } from './components/ProtectedRoute'
import InstantCanvasDemo from './components/InstantCanvasDemo'
import { useEffect } from 'react'
import { supabase } from './lib/supabase'

// OAuth Callback Handler Component
const OAuthCallbackHandler = () => {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // Handle OAuth callback with hash parameters
    const handleOAuthCallback = async () => {
      console.log('OAuth callback received, location:', location)
      
      if (location.hash) {
        try {
          console.log('Processing hash:', location.hash)
          
          // Parse hash parameters - handle both #key=value&key2=value2 format
          const hashString = location.hash.substring(1) // Remove the #
          const hashParams = new URLSearchParams(hashString)
          
          console.log('Parsed hash params:', Object.fromEntries(hashParams))
          
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          const expiresIn = hashParams.get('expires_in')
          const tokenType = hashParams.get('token_type')

          console.log('Extracted tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken })

          if (accessToken && refreshToken) {
            console.log('Setting session with tokens...')
            
            // Set the session with the tokens
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

            console.log('Session set result:', { data, error })

            if (error) {
              console.error('OAuth callback error:', error)
              navigate('/login')
            } else if (data.session) {
              console.log('Successfully authenticated, redirecting to dashboard')
              // Successfully authenticated, redirect to dashboard
              navigate('/dashboard')
            } else {
              console.log('No session data received')
              navigate('/login')
            }
          } else {
            console.log('No tokens found in hash')
            // No tokens in hash, redirect to login
            navigate('/login')
          }
        } catch (error) {
          console.error('Error handling OAuth callback:', error)
          navigate('/login')
        }
      } else {
        console.log('No hash parameters found')
        // No hash parameters, redirect to login
        navigate('/login')
      }
    }

    // Add a small delay to ensure everything is loaded
    const timer = setTimeout(() => {
      handleOAuthCallback()
    }, 100)

    return () => clearTimeout(timer)
  }, [location, navigate])

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '18px',
      color: '#333'
    }}>
      Processing Google login...
    </div>
  )
}

// Dashboard OAuth Handler - handles cases where OAuth redirects directly to dashboard
const DashboardOAuthHandler = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // Check if we have OAuth tokens in the URL hash when accessing dashboard
    if (location.hash && location.hash.includes('access_token')) {
      console.log('Found OAuth tokens in dashboard URL, redirecting to auth/callback')
      // Redirect to auth/callback to process the tokens
      navigate(`/auth/callback${location.hash}`)
    }
  }, [location, navigate])

  // If we have OAuth tokens, don't render children yet
  if (location.hash && location.hash.includes('access_token')) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#333'
      }}>
        Processing Google login...
      </div>
    )
  }

  return children
}

function App() {

  return (
    <ThemeProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/callback" element={<OAuthCallbackHandler />} />
          <Route
            path="/dashboard"
            element={
              <DashboardOAuthHandler>
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </DashboardOAuthHandler>
            }
          />
          <Route
            path="/canvas/:noteId"
            element={
              <ProtectedRoute>
                <SharedCanvas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instant-canvas-demo"
            element={
              <ProtectedRoute>
                <InstantCanvasDemo />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
              background: 'var(--toast-bg, #1a1a1a)',
              color: 'var(--toast-text, #ffffff)',
              border: '1px solid var(--toast-border, #333333)',
            },
            success: {
              iconTheme: {
                primary: '#ffffff',
                secondary: '#1a1a1a',
              },
            },
            error: {
              iconTheme: {
                primary: '#ffffff',
                secondary: '#1a1a1a',
              },
          },
        }}
      />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
