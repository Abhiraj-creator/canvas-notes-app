import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './context/ThemeContext'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import { SharedCanvas } from './pages/SharedCanvas'
import { ProtectedRoute } from './components/ProtectedRoute'
import InstantCanvasDemo from './components/InstantCanvasDemo'

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
  )
}

export default App
