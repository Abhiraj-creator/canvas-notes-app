import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { supabase } from './lib/supabase'

// Handle OAuth callback on app load
const handleInitialOAuth = async () => {
  if (window.location.hash && window.location.hash.includes('access_token')) {
    console.log('Initial OAuth detection in main.jsx')
    try {
      const hashString = window.location.hash.substring(1)
      const hashParams = new URLSearchParams(hashString)
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (accessToken && refreshToken) {
        console.log('Setting initial session...')
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (!error && data.session) {
          console.log('Initial OAuth session set successfully')
          // Clean up the URL
          window.history.replaceState({}, document.title, '/dashboard')
        }
      }
    } catch (error) {
      console.error('Initial OAuth handling error:', error)
    }
  }
}

// Call on app load
handleInitialOAuth()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

