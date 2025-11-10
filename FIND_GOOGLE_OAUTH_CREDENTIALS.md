# How to Find Google OAuth Client ID and Client Secret

## Step-by-Step Guide

### Step 1: Go to Google Cloud Console

1. Open your web browser
2. Go to [Google Cloud Console](https://console.cloud.google.com/)
3. Sign in with your Google account

### Step 2: Select or Create a Project

1. **If you already have a project:**
   - Click the project dropdown at the top of the page (shows "Select a project")
   - Click on your project name

2. **If you need to create a project:**
   - Click the project dropdown
   - Click **"New Project"**
   - Enter a project name (e.g., "Notes App")
   - Click **"Create"**
   - Wait a few seconds for the project to be created
   - Select the new project from the dropdown

### Step 3: Enable Google+ API (Optional but Recommended)

1. In the left sidebar, click **"APIs & Services"** → **"Library"**
2. Search for **"Google+ API"** in the search box
3. Click on **"Google+ API"** from the results
4. Click the **"Enable"** button
5. Wait for it to enable (usually takes a few seconds)

**Note:** This step is optional but recommended for OAuth to work properly.

### Step 4: Configure OAuth Consent Screen (Required First Time)

1. In the left sidebar, click **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (unless you have a Google Workspace account)
3. Click **"Create"**
4. Fill in the required information:
   - **App name**: Your app name (e.g., "Notes App")
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **"Save and Continue"**
6. **Scopes** (Step 2): Click **"Save and Continue"** (default scopes are fine)
7. **Test users** (Step 3): 
   - Click **"Add Users"** if you want to add test users
   - Add your email address or other test emails
   - Click **"Save and Continue"**
8. **Summary** (Step 4): Review and click **"Back to Dashboard"**

**Important:** For development, you can use "Testing" mode. For production, you'll need to publish your app.

### Step 5: Create OAuth 2.0 Credentials

1. In the left sidebar, click **"APIs & Services"** → **"Credentials"**
2. You'll see a page with your credentials (might be empty if it's a new project)
3. Click **"Create Credentials"** button (usually at the top)
4. Select **"OAuth client ID"** from the dropdown

### Step 6: Configure OAuth Client

1. **Application type**: Select **"Web application"**

2. **Name**: Enter a name for your OAuth client (e.g., "Notes App Web Client")

3. **Authorized JavaScript origins**:
   - Click **"+ ADD URI"**
   - Add: `http://localhost:5173` (for development)
   - Click **"+ ADD URI"** again
   - Add: `https://yourdomain.com` (for production - replace with your actual domain)

4. **Authorized redirect URIs** (IMPORTANT):
   - First, get your Supabase project reference:
     - Go to your Supabase dashboard
     - Look at your project URL: `https://abcdefghijklmnop.supabase.co`
     - The part before `.supabase.co` is your project reference (e.g., `abcdefghijklmnop`)
   - Click **"+ ADD URI"**
   - Add: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Replace `YOUR_PROJECT_REF` with your actual project reference
   - Example: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`

5. Click **"Create"** button

### Step 7: Copy Your Credentials

After clicking "Create", a popup will appear with your credentials:

```
┌─────────────────────────────────────────┐
│  OAuth client created                   │
├─────────────────────────────────────────┤
│                                         │
│  Your Client ID                         │
│  xxxxxx-xxxxx.apps.googleusercontent.com│
│  [Copy]                                 │
│                                         │
│  Your Client Secret                     │
│  xxxxxx-xxxxx                           │
│  [Copy]                                 │
│                                         │
│  [OK]                                   │
└─────────────────────────────────────────┘
```

1. **Copy the Client ID**: 
   - Click the **"Copy"** button next to "Your Client ID"
   - Or manually select and copy the ID (looks like: `123456789-abcdefg.apps.googleusercontent.com`)
   - Save this somewhere safe (you'll need it for Supabase)

2. **Copy the Client Secret**:
   - Click the **"Copy"** button next to "Your Client Secret"
   - Or manually select and copy the secret (looks like: `GOCSPX-xxxxxxxxxxxxx`)
   - Save this somewhere safe (you'll need it for Supabase)

**⚠️ Important:** 
- The Client Secret is only shown **once** when you create the credentials
- If you lose it, you'll need to create new credentials
- Keep these credentials secure and never commit them to version control

### Step 8: View Credentials Later (If Needed)

If you need to view your credentials again:

1. Go to **"APIs & Services"** → **"Credentials"**
2. Under **"OAuth 2.0 Client IDs"**, you'll see your client
3. Click on the client name (or the edit/pencil icon)
4. You can see the **Client ID** here
5. **Client Secret** will show as hidden - click the eye icon or "Reset secret" if needed

**Note:** If you reset the secret, you'll get a new one and need to update it in Supabase.

## Visual Guide - Where to Find Everything

### Navigation Path:

```
Google Cloud Console
├── Project Dropdown (Top) → Select/Create Project
├── APIs & Services
│   ├── Library → Enable Google+ API
│   ├── OAuth consent screen → Configure consent screen
│   └── Credentials → Create OAuth client ID ← HERE!
```

### Credentials Page Layout:

```
┌─────────────────────────────────────────┐
│  Credentials                            │
├─────────────────────────────────────────┤
│  [Create Credentials ▼]                 │
│    ├── API key                          │
│    ├── OAuth client ID        ← Click   │
│    ├── Service account                  │
│    └── ...                              │
│                                          │
│  OAuth 2.0 Client IDs:                  │
│  ┌───────────────────────────────────┐  │
│  │ Notes App Web Client              │  │
│  │ Client ID: xxxxx.apps.google...   │  │
│  │ [Edit] [Delete]                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### OAuth Client Creation Form:

```
┌─────────────────────────────────────────┐
│  Create OAuth client ID                 │
├─────────────────────────────────────────┤
│  Application type:                      │
│  ○ Desktop app                          │
│  ● Web application            ← Select  │
│  ○ ...                                  │
│                                          │
│  Name:                                  │
│  [Notes App Web Client]                 │
│                                          │
│  Authorized JavaScript origins:         │
│  - http://localhost:5173                │
│  - https://yourdomain.com               │
│  [+ ADD URI]                            │
│                                          │
│  Authorized redirect URIs:              │
│  - https://YOUR_REF.supabase.co/        │
│    auth/v1/callback                     │
│  [+ ADD URI]                            │
│                                          │
│  [Cancel]  [Create] ← Click            │
└─────────────────────────────────────────┘
```

## Quick Reference - What You Need

### From Google Cloud Console:
- ✅ **Client ID**: Looks like `123456789-abc.apps.googleusercontent.com`
- ✅ **Client Secret**: Looks like `GOCSPX-xxxxxxxxxxxxx`

### From Supabase:
- ✅ **Project Reference**: The part before `.supabase.co` in your URL
  - Example: If URL is `https://abcdefgh.supabase.co`, then reference is `abcdefgh`
- ✅ **Redirect URI**: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

## Common Issues

### "I can't find the Credentials page"
- Make sure you've selected a project first
- Look for "APIs & Services" in the left sidebar
- Click "Credentials" under "APIs & Services"

### "I don't see 'Create Credentials' button"
- Make sure you have the right permissions
- Try refreshing the page
- Make sure a project is selected

### "Client Secret is hidden/not showing"
- The secret is only shown once when created
- If you need it again, you can reset it (this creates a new one)
- Or check if you saved it somewhere

### "I lost my Client Secret"
- Go to Credentials page
- Click on your OAuth client
- Click "Reset secret" to generate a new one
- Update the new secret in Supabase

### "Redirect URI mismatch error"
- Double-check the redirect URI format: `https://YOUR_REF.supabase.co/auth/v1/callback`
- Make sure there are no typos
- Make sure the project reference is correct

## Security Reminders

1. ⚠️ **Never commit credentials to Git** - They should be in `.env` or environment variables
2. ⚠️ **Keep Client Secret secure** - It's like a password
3. ⚠️ **Don't share credentials publicly** - Keep them private
4. ⚠️ **Use different credentials for dev/prod** - Create separate OAuth clients
5. ⚠️ **Rotate secrets regularly** - Especially if compromised

## Next Steps

After you have your Client ID and Client Secret:

1. ✅ Go to Supabase dashboard
2. ✅ Go to Authentication → Providers → Google
3. ✅ Enable Google provider
4. ✅ Paste your Client ID
5. ✅ Paste your Client Secret
6. ✅ Click Save
7. ✅ Test Google sign-in in your app

## Summary

**To find your Google OAuth credentials:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select/Create a project
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure as "Web application"
6. Add redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
7. Click **Create**
8. **Copy Client ID and Client Secret** from the popup
9. Use them in Supabase Google provider settings

That's it! You now have your Google OAuth credentials ready to use. 🎉
