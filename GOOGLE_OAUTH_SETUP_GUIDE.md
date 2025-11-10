# How to Set Up Google OAuth in Supabase

## Step-by-Step Guide

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **Create a new project** (or select an existing one):
   - Click the project dropdown at the top
   - Click "New Project"
   - Enter a project name (e.g., "Notes App")
   - Click "Create"

3. **Enable Google+ API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click on it and click "Enable"

4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - If prompted, configure the OAuth consent screen first (see Step 2 below)
   - Select "Web application" as the application type
   - Give it a name (e.g., "Notes App Web Client")
   - **Authorized JavaScript origins**:
     - Add: `http://localhost:5173` (for development)
     - Add: `https://yourdomain.com` (for production)
   - **Authorized redirect URIs**:
     - Add: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
     - Replace `YOUR_PROJECT_REF` with your Supabase project reference
     - You can find this in your Supabase URL (e.g., `https://abcdefgh.supabase.co` → `abcdefgh`)
   - Click "Create"
   - **Copy the Client ID and Client Secret** (you'll need these in Step 3)

### Step 2: Configure OAuth Consent Screen (If Prompted)

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (unless you have a Google Workspace account)
3. Click "Create"
4. Fill in the required information:
   - **App name**: Your app name (e.g., "Notes App")
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "Save and Continue"
6. **Scopes** (optional): Click "Save and Continue" (default scopes are usually fine)
7. **Test users** (for development): Add test users if needed, then click "Save and Continue"
8. Click "Back to Dashboard"

### Step 3: Configure Google OAuth in Supabase

1. **Get your Supabase project reference**:
   - Go to your Supabase dashboard
   - Look at your project URL: `https://YOUR_PROJECT_REF.supabase.co`
   - The part before `.supabase.co` is your project reference

2. **Configure in Supabase**:
   - Go to **Authentication** → **Providers** in your Supabase dashboard
   - Find **"Google"** in the list of providers
   - **Toggle it ON**
   - Enter your **Client ID** (from Google Cloud Console)
     - 📖 **Don't know where to find it?** See `FIND_GOOGLE_OAUTH_CREDENTIALS.md` for detailed instructions
   - Enter your **Client Secret** (from Google Cloud Console)
     - 📖 **Don't know where to find it?** See `FIND_GOOGLE_OAUTH_CREDENTIALS.md` for detailed instructions
   - Click **"Save"**

3. **Verify Redirect URI**:
   - Make sure your Supabase redirect URI is added to Google Cloud Console
   - Format: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - This should match what you added in Step 1

### Step 4: Update Redirect URLs in Supabase

1. Go to **Authentication** → **Settings** in Supabase
2. In **"Redirect URLs"**, make sure you have:
   - `http://localhost:5173/**` (for development)
   - `https://yourdomain.com/**` (for production)
3. Click **"Save"**

### Step 5: Test Google OAuth

1. Start your development server: `npm run dev`
2. Go to the login or signup page
3. Click "Sign in with Google" or "Sign up with Google"
4. You should be redirected to Google's consent screen
5. Select your Google account
6. Grant permissions
7. You should be redirected back to your app and logged in

## Visual Guide

### Google Cloud Console - OAuth Credentials:

```
┌─────────────────────────────────────────┐
│  OAuth 2.0 Client IDs                   │
├─────────────────────────────────────────┤
│  Name: Notes App Web Client             │
│  Application type: Web application      │
│                                          │
│  Authorized JavaScript origins:         │
│  - http://localhost:5173                │
│  - https://yourdomain.com               │
│                                          │
│  Authorized redirect URIs:              │
│  - https://YOUR_REF.supabase.co/        │
│    auth/v1/callback                     │
│                                          │
│  Client ID: xxxxx.apps.googleusercontent.com │
│  Client secret: xxxxx                   │
└─────────────────────────────────────────┘
```

### Supabase - Google Provider Settings:

```
┌─────────────────────────────────────────┐
│  Google Provider                        │
│  ┌───────────────────────────────────┐  │
│  │ Enable Google provider  [ON] ✓    │  │
│  └───────────────────────────────────┘  │
│                                          │
│  Client ID (for OAuth):                 │
│  [xxxxx.apps.googleusercontent.com]     │
│                                          │
│  Client Secret (for OAuth):             │
│  [xxxxx]                                │
│                                          │
│  [Save]                                 │
└─────────────────────────────────────────┘
```

## Important Notes

### Redirect URI Format

The redirect URI in Google Cloud Console must be:
```
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

**To find your project reference:**
1. Go to Supabase dashboard
2. Your project URL is: `https://abcdefghijklmnop.supabase.co`
3. The project reference is: `abcdefghijklmnop`
4. So the redirect URI is: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`

### Development vs Production

**For Development:**
- Use `http://localhost:5173` in authorized origins
- Use `http://localhost:5173/**` in Supabase redirect URLs

**For Production:**
- Use your production domain (e.g., `https://yourdomain.com`)
- Update both Google Cloud Console and Supabase settings

### OAuth Consent Screen

- **Testing mode**: Only test users can sign in
- **In production**: You need to publish your app (requires verification)
- For development, add test users in OAuth consent screen settings

## Troubleshooting

### "Redirect URI mismatch" error

**Problem**: The redirect URI in Google Cloud Console doesn't match Supabase

**Solution**:
1. Check your Supabase project reference
2. Make sure the redirect URI in Google Cloud Console is exactly:
   - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
3. Make sure there are no typos or extra spaces

### "Access blocked" error

**Problem**: OAuth consent screen is in testing mode and user is not a test user

**Solution**:
1. Go to Google Cloud Console → OAuth consent screen
2. Add the user's email to "Test users"
3. Or publish the app (requires verification for production)

### "Invalid client" error

**Problem**: Client ID or Client Secret is incorrect

**Solution**:
1. Double-check the Client ID and Client Secret in Supabase
2. Make sure there are no extra spaces
3. Regenerate credentials in Google Cloud Console if needed

### OAuth not working in production

**Problem**: Production domain not configured

**Solution**:
1. Add production domain to Google Cloud Console authorized origins
2. Add production domain to Supabase redirect URLs
3. Update OAuth consent screen with production domain

### "Popup blocked" error

**Problem**: Browser is blocking the OAuth popup

**Solution**:
1. Allow popups for your site
2. Check browser settings
3. Try a different browser

## Security Best Practices

1. ✅ **Never commit credentials** - Keep Client ID and Secret secure
2. ✅ **Use environment variables** - For production, use secure storage
3. ✅ **Limit redirect URIs** - Only add trusted domains
4. ✅ **Enable OAuth consent screen** - Properly configure for production
5. ✅ **Review permissions** - Only request necessary scopes
6. ✅ **Monitor usage** - Check Google Cloud Console for suspicious activity

## Testing Checklist

- [ ] Google OAuth credentials created in Google Cloud Console
- [ ] Redirect URI added to Google Cloud Console
- [ ] Google provider enabled in Supabase
- [ ] Client ID and Secret added to Supabase
- [ ] Redirect URLs configured in Supabase
- [ ] Test user added (if in testing mode)
- [ ] Test sign in with Google on login page
- [ ] Test sign up with Google on signup page
- [ ] Verify user is redirected back to app
- [ ] Verify user is logged in after OAuth

## Quick Reference

**Google Cloud Console**: https://console.cloud.google.com/

**Supabase Dashboard**: https://app.supabase.com/

**Redirect URI Format**: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

**Required Scopes**: `email`, `profile` (automatically requested by Supabase)

## Next Steps

After setting up Google OAuth:

1. ✅ Test the sign-in flow
2. ✅ Test the sign-up flow
3. ✅ Verify user data is stored correctly
4. ✅ Test on production domain (when ready)
5. ✅ Publish OAuth consent screen (for production)

Your users can now sign in with their Google accounts! 🎉
