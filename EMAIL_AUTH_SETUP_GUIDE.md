# How to Enable Email Authentication in Supabase

## Step-by-Step Guide

### Step 1: Navigate to Authentication Settings

1. Log in to [supabase.com](https://supabase.com)
2. Select your project from the dashboard
3. In the left sidebar, click on **"Authentication"** (usually has a key/lock icon)
4. Click on **"Settings"** or **"Providers"** (depending on your Supabase version)

### Step 2: Enable Email Provider

1. You'll see a list of authentication providers
2. Look for **"Email"** provider in the list
3. **Toggle the switch** to enable it (it should turn green/blue)
4. The Email provider is usually enabled by default, but verify it's ON

### Step 3: Configure Email Settings (Optional but Recommended)

#### Enable Email Confirmation (Optional)

1. In the Authentication settings, look for **"Email Auth"** section
2. Find **"Enable email confirmations"** option
3. **Toggle it ON** if you want users to verify their email before signing in
   - **ON**: Users must verify email before they can sign in (more secure)
   - **OFF**: Users can sign in immediately after signup (faster for development)

#### Configure Email Templates (Optional)

1. In the left sidebar under Authentication, click **"Email Templates"**
2. You can customize:
   - **Confirm signup**: Email sent when user signs up
   - **Reset password**: Email sent when user requests password reset
   - **Magic link**: Email sent for passwordless login
   - **Change email address**: Email sent when user changes email

3. Click on any template to customize:
   - Subject line
   - Email body
   - Add your branding/logo

### Step 4: Set Up SMTP (For Production - Optional)

**For development/testing**: Supabase provides a default email service, but emails might go to spam.

**For production**: You should configure custom SMTP:

1. In Authentication settings, scroll to **"SMTP Settings"**
2. Click **"Configure SMTP"**
3. Enter your SMTP details:
   - **Host**: Your SMTP server (e.g., `smtp.gmail.com`)
   - **Port**: Usually `587` for TLS or `465` for SSL
   - **Username**: Your email address
   - **Password**: Your email password or app password
   - **Sender name**: Name to show in emails
   - **Sender email**: Email address to send from

**Popular SMTP Providers:**
- **Gmail**: `smtp.gmail.com`, Port `587`
- **SendGrid**: `smtp.sendgrid.net`, Port `587`
- **Mailgun**: `smtp.mailgun.org`, Port `587`
- **AWS SES**: `email-smtp.us-east-1.amazonaws.com`, Port `587`

### Step 5: Test Email Authentication

1. Go to your app's signup page
2. Try creating a new account with an email
3. Check your email inbox (and spam folder) for the confirmation email
4. If email confirmation is enabled, click the link to verify
5. Try signing in

## Visual Guide

### Authentication Settings Page Layout:

```
Supabase Dashboard
├── Authentication
│   ├── Users              ← Manage users
│   ├── Policies           ← RLS policies
│   ├── Providers          ← Click here!
│   │   ├── Email          ← Toggle ON
│   │   ├── Google
│   │   ├── GitHub
│   │   └── ...
│   ├── Email Templates    ← Customize emails
│   └── Settings           ← SMTP configuration
```

### Email Provider Settings:

```
┌─────────────────────────────────────────┐
│  Email Provider                         │
│  ┌───────────────────────────────────┐  │
│  │ Enable email provider    [ON] ✓   │  │
│  └───────────────────────────────────┘  │
│                                          │
│  Enable email confirmations:  [ON/OFF]  │
│  (Users must verify email before login)  │
│                                          │
│  [Save]                                  │
└─────────────────────────────────────────┘
```

## Configuration Options Explained

### Email Confirmation Options

**Enabled (Recommended for Production):**
- ✅ More secure
- ✅ Verifies user owns the email
- ✅ Prevents fake accounts
- ❌ Requires extra step for users

**Disabled (Good for Development/Testing):**
- ✅ Faster development
- ✅ Users can sign in immediately
- ❌ Less secure
- ❌ Can create accounts with fake emails

### Site URL Configuration

1. In Authentication settings, find **"Site URL"**
2. Set it to your app's URL:
   - **Development**: `http://localhost:5173`
   - **Production**: `https://yourdomain.com`
3. This is used for email confirmation links and redirects

### Redirect URLs (Important!)

1. In Authentication settings, find **"Redirect URLs"**
2. Add your app URLs where users should be redirected after:
   - Email confirmation
   - Password reset
   - OAuth login

**Add these URLs:**
```
http://localhost:5173/**
https://yourdomain.com/**
```

The `/**` allows all paths under that domain.

## Quick Setup for Development

**Minimum setup (for testing):**

1. ✅ Enable Email provider (usually already enabled)
2. ✅ Disable email confirmations (for faster testing)
3. ✅ Set Site URL to `http://localhost:5173`
4. ✅ Add redirect URL: `http://localhost:5173/**`

That's it! You can now test signup and login.

## Production Setup

**Recommended setup (for production):**

1. ✅ Enable Email provider
2. ✅ **Enable email confirmations** (for security)
3. ✅ Configure custom SMTP (for reliable email delivery)
4. ✅ Customize email templates (with your branding)
5. ✅ Set Site URL to your production domain
6. ✅ Add production redirect URLs

## Troubleshooting

### Emails not sending?

1. **Check spam folder** - Supabase default emails often go to spam
2. **Verify email provider is enabled** - Check the toggle is ON
3. **Check Site URL** - Make sure it's set correctly
4. **Check redirect URLs** - Ensure your app URL is added
5. **For production**: Set up custom SMTP for better deliverability

### "Invalid redirect URL" error?

1. Go to Authentication → Settings
2. Find "Redirect URLs"
3. Add your app URL with `/**` at the end
4. Example: `http://localhost:5173/**`

### Email confirmation link not working?

1. Check that Site URL is set correctly
2. Verify redirect URLs include your domain
3. Make sure the confirmation link isn't expired (usually expires in 24 hours)
4. Check browser console for errors

### Users can't sign in after signup?

1. If email confirmation is enabled, users must click the confirmation link first
2. Check that the confirmation email was sent (check spam)
3. Verify the confirmation link is clicked before it expires
4. Try disabling email confirmation temporarily to test

### SMTP configuration not working?

1. Verify SMTP credentials are correct
2. Check that your email provider allows SMTP access
3. For Gmail, you may need to:
   - Enable "Less secure app access" (not recommended)
   - Or use an "App Password" (recommended)
4. Test SMTP settings with a test email first

## Testing Email Authentication

### Test Signup Flow:

1. Go to your app's signup page
2. Enter email and password
3. Click "Sign up"
4. Check email for confirmation (if enabled)
5. Click confirmation link (if enabled)
6. Try signing in

### Test Login Flow:

1. Go to your app's login page
2. Enter email and password
3. Click "Sign in"
4. Should redirect to dashboard

### Test Password Reset:

1. Go to login page
2. Click "Forgot password" (if you have this feature)
3. Enter email
4. Check email for reset link
5. Click link and set new password

## Security Best Practices

1. ✅ **Enable email confirmation** in production
2. ✅ **Use strong password requirements** (configure in Auth settings)
3. ✅ **Set up rate limiting** to prevent abuse
4. ✅ **Use custom SMTP** for production emails
5. ✅ **Enable 2FA** (if available) for sensitive applications
6. ✅ **Monitor authentication logs** for suspicious activity

## Next Steps

After enabling email authentication:

1. ✅ Test signup and login in your app
2. ✅ Verify emails are being sent
3. ✅ Test email confirmation flow (if enabled)
4. ✅ Set up custom SMTP for production
5. ✅ Customize email templates with your branding

## Quick Reference

**Location**: Supabase Dashboard → Authentication → Providers → Email

**Minimum Setup**:
- Toggle Email provider ON
- Set Site URL
- Add redirect URLs

**Production Setup**:
- Enable email confirmations
- Configure custom SMTP
- Customize email templates
- Set proper Site URL and redirect URLs

## Step 1: Create SharedCanvas Component

Create `src/pages/SharedCanvas.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CanvasEditor } from '../components/CanvasEditor'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { LoadingSpinner } from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

export const SharedCanvas = () => {
  const { noteId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      if (!noteId) {
        toast.error('Invalid canvas link')
        navigate('/dashboard')
        return
      }

      if (!authLoading && !user) {
        toast.error('Please sign in to access this canvas')
        navigate(`/login?redirect=/canvas/${noteId}`)
        return
      }

      if (!user) return

      setLoading(true)

      try {
        const { data: noteData, error: noteError } = await supabase
          .from('notes')
          .select('*')
          .eq('id', noteId)
          .single()

        if (noteError || !noteData) {
          toast.error('Canvas not found')
          navigate('/dashboard')
          return
        }

        if (noteData.user_id === user.id) {
          setHasAccess(true)
          setLoading(false)
          return
        }

        const { data: collaboratorData, error: collabError } = await supabase
          .from('canvas_collaborators')
          .select('*')
          .eq('note_id', noteId)
          .or(`user_id.eq.${user.id},collaborator_email.eq.${user.email}`)
          .maybeSingle()

        if (!collabError && collaboratorData) {
          setHasAccess(true)
          setLoading(false)
          return
        }

        toast.error('You do not have access to this canvas')
        navigate('/dashboard')
      } catch (err) {
        console.error('Error checking access:', err)
        toast.error('Failed to load canvas')
        navigate('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [noteId, user, authLoading, navigate])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!hasAccess) {
    return null
  }

  return (
    <CanvasEditor
      noteId={noteId}
      onClose={() => navigate('/dashboard')}
    />
  )
}
