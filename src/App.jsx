import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { SharedCanvas } from './pages/SharedCanvas';
import { ProtectedRoute } from './components/ProtectedRoute';
import InstantCanvasDemo from './components/InstantCanvasDemo';
import { useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';

// This component handles the OAuth callback tokens from the URL hash.
// It can handle the callback on any route, making it very robust.
function AuthTokenProcessor() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Only process the tokens once to avoid loops
    if (location.hash.includes('access_token') && !hasProcessed.current) {
      hasProcessed.current = true;

      const hashParams = new URLSearchParams(location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const error = hashParams.get('error');

      if (error) {
        console.error('OAuth Error:', hashParams.get('error_description'));
        navigate('/login', { replace: true });
        return;
      }

      if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).then(({ error: sessionError }) => {
          if (sessionError) {
            console.error('Error setting session:', sessionError);
            navigate('/login', { replace: true });
          } else {
            // On success, navigate to the dashboard, replacing the URL to remove the hash
            navigate('/dashboard', { replace: true });
          }
        });
      }
    }
  }, [location, navigate]);

  return null; // This component does not render anything
}


function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        {/* This component will process OAuth tokens from the URL on any page */}
        <AuthTokenProcessor />
        
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
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
  );
}

export default App;
