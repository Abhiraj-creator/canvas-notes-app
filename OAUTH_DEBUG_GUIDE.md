# OAuth 404 Error Debug Guide

## Current Issue: 404 Error After Google OAuth

### Step 1: Verify Environment Variables
Check your `.env.local` file for development:
```
VITE_REDIRECT_URL=http://localhost:5173
```

For production (`.env`):
```
VITE_REDIRECT_URL=https://canvas-notes-app.vercel.app
```

### Step 2: Verify Supabase Dashboard Settings

1. Go to your Supabase dashboard: https://pxqckyhjnhezwfiwvsnx.supabase.co
2. Navigate to Authentication → Settings → URL Configuration
3. Set these values:

**Site URL:**
- For development: `http://localhost:5173`
- For production: `https://canvas-notes-app.vercel.app`

**Redirect URLs:**
- `http://localhost:5173/auth/callback`
- `http://localhost:5173/**`
- `http://localhost:5173`
- `http://localhost:5173/dashboard`
- `https://canvas-notes-app.vercel.app/auth/callback`
- `https://canvas-notes-app.vercel.app/**`
- `https://canvas-notes-app.vercel.app`
- `https://canvas-notes-app.vercel.app/dashboard`

### Step 3: Test the OAuth Flow

1. **Local Development Test:**
   ```bash
   npm run dev
   ```
   Then go to `http://localhost:5173/login` and try Google OAuth

2. **Check Browser Console:**
   Look for these log messages:
   - "OAuth redirect URL: http://localhost:5173/auth/callback"
   - "Processing OAuth callback..."
   - "Session set successfully:"

3. **Check Network Tab:**
   Look for requests to:
   - `https://pxqckyhjnhezwfiwvsnx.supabase.co/auth/v1/authorize`
   - Callback URL with hash parameters

### Step 4: Common Issues

**Issue: 404 on `/auth/callback`**
- Solution: Ensure `vercel.json` is deployed with your app
- Solution: Check that React Router is handling the `/auth/callback` route

**Issue: Redirect to wrong URL**
- Solution: Check `VITE_REDIRECT_URL` in environment variables
- Solution: Verify Supabase dashboard settings

**Issue: Tokens not processed**
- Solution: Check browser console for error messages
- Solution: Verify OAuth callback handler is working

### Step 5: Manual Testing

You can manually test the OAuth callback by visiting:
```
http://localhost:5173/auth/callback#access_token=YOUR_TEST_TOKEN&refresh_token=YOUR_TEST_REFRESH_TOKEN&token_type=bearer&expires_in=3600
```

This should redirect you to `/dashboard`.

### Step 6: Check Deployed Version

For the Vercel deployment:
1. Ensure environment variables are set in Vercel dashboard
2. Check that `vercel.json` is deployed
3. Test OAuth on the live site and check browser console

### Debugging Commands

```bash
# Check current environment
echo $VITE_REDIRECT_URL

# Check if local server is running
curl -I http://localhost:5173/auth/callback

# Check if callback route exists
curl -I http://localhost:5173/dashboard
```