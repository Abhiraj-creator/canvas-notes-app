# Setup Guide

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works - sign up at [supabase.com](https://supabase.com))

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set up Supabase

### 2.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the database to be set up

### 2.2 Get Your Supabase Credentials

1. In your Supabase project dashboard, click **"Settings"** (gear icon) in the left sidebar
2. Click **"API"** under Project Settings
3. You'll see two important values:
   - **Project URL**: Copy this (looks like `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public key**: Click "Reveal" or "Copy" next to the `anon public` key (starts with `eyJ...`)
4. **Important**: Use the `anon public` key, NOT the `service_role secret` key

📖 **Need more help?** See the detailed guide in `SUPABASE_CREDENTIALS_GUIDE.md`

### 2.3 Set Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 2.4 Set up Database Tables

**Quick Steps:**
1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"** button
3. Open the `supabase-setup.sql` file from your project and copy all the SQL code
4. Paste it into the SQL Editor
5. Click **"RUN"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
6. You should see a success message

📖 **Detailed step-by-step guide**: See `DATABASE_SETUP_GUIDE.md` for complete instructions with troubleshooting

**The SQL code to run:**

```sql
-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  canvas_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);
CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes(updated_at DESC);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
```

### 2.5 Enable Email Authentication

**Quick Steps:**
1. In Supabase dashboard, click **"Authentication"** in the left sidebar
2. Click **"Providers"** (or "Settings")
3. Find **"Email"** provider and **toggle it ON** (usually already enabled)
4. (Optional) Disable "Email confirmations" for faster development/testing
5. Set **"Site URL"** to `http://localhost:5173` (for development)
6. Add **"Redirect URLs"**: `http://localhost:5173/**`

📖 **Detailed guide**: See `EMAIL_AUTH_SETUP_GUIDE.md` for complete instructions, SMTP setup, and troubleshooting

**Note**: Email authentication is usually enabled by default. You mainly need to configure Site URL and Redirect URLs for your app to work properly.

### 2.6 Enable Google OAuth (Optional)

**Quick Steps:**
1. Create Google OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google+ API
3. Create OAuth 2.0 Client ID with redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. In Supabase, go to **Authentication** → **Providers** → **Google**
5. Enable Google provider and add Client ID and Client Secret
6. Save and test

📖 **Detailed guide**: See `GOOGLE_OAUTH_SETUP_GUIDE.md` for complete step-by-step instructions

**Note**: Google OAuth is optional. Users can still sign in with email/password if Google OAuth is not configured.

## Step 3: Run the Development Server

```bash
npm run dev
```

The app should now be running at `http://localhost:5173`

## Step 4: Create Your First Account

1. Navigate to the signup page
2. Create an account
3. Check your email for verification (if email confirmation is enabled)
4. Sign in and start creating notes!

## Troubleshooting

### Real-time not working?

- Make sure you've run the SQL to enable Realtime on the notes table
- Check that your Supabase project has Realtime enabled (it's enabled by default)

### Authentication issues?

- Verify your Supabase URL and anon key are correct in `.env`
- Check that email authentication is enabled in Supabase
- Make sure RLS policies are set up correctly

### Canvas not saving?

- Check browser console for errors
- Verify the notes table has a `canvas_data` column of type JSONB
- Ensure you have update permissions on the notes table

## Next Steps

- Customize the theme colors in `tailwind.config.js`
- Add more features like note sharing, tags, or folders
- Deploy to Vercel, Netlify, or your preferred hosting platform
