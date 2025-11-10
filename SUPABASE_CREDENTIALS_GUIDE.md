# How to Find Your Supabase Credentials

## Step-by-Step Guide

### Step 1: Log in to Supabase
1. Go to [https://supabase.com](https://supabase.com)
2. Sign in to your account (or create a free account if you don't have one)

### Step 2: Create or Select a Project
1. If you don't have a project yet:
   - Click **"New Project"** button
   - Enter a project name
   - Enter a database password (save this securely!)
   - Select a region closest to you
   - Click **"Create new project"**
   - Wait 2-3 minutes for the project to be set up

2. If you already have a project:
   - Click on your project from the dashboard

### Step 3: Navigate to API Settings
1. In your project dashboard, look at the left sidebar
2. Click on **"Settings"** (gear icon at the bottom)
3. Click on **"API"** under the Project Settings section

### Step 4: Find Your Credentials
On the API settings page, you'll see:

#### Project URL
- Look for **"Project URL"** section
- Copy the URL (it looks like: `https://xxxxxxxxxxxxx.supabase.co`)
- This is your `VITE_SUPABASE_URL`

#### API Keys
- Look for **"Project API keys"** section
- You'll see two keys:
  - **`anon` `public`** key - This is the one you need!
  - `service_role` `secret` key - Do NOT use this in frontend code (it's secret!)

- Copy the **`anon` `public`** key (it's a long string starting with `eyJ...`)
- This is your `VITE_SUPABASE_ANON_KEY`

### Step 5: Create Your .env File
1. In your project root directory, create a file named `.env`
2. Add these two lines (replace with your actual values):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Example:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.example_key_here
```

### Step 6: Verify Your .env File
- Make sure the `.env` file is in the root directory (same level as `package.json`)
- Make sure there are **no spaces** around the `=` sign
- Make sure the values are **not wrapped in quotes** (unless they contain spaces, which they shouldn't)
- Restart your development server after creating/updating `.env`

## Visual Guide

The API settings page will look something like this:

```
Project Settings
├── General
├── API          ← Click here!
├── Database
├── Auth
└── ...

Project URL
https://xxxxxxxxxxxxx.supabase.co  ← Copy this

Project API keys
┌─────────────────────────────────────────┐
│ anon        public                      │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... │ ← Copy this
│ [Reveal] [Copy]                         │
└─────────────────────────────────────────┘

service_role  secret  ← Don't use this one!
```

## Troubleshooting

### Can't find the API section?
- Make sure you're logged in
- Make sure you've selected your project
- The Settings icon is usually at the bottom of the left sidebar

### The URL or key looks wrong?
- Make sure you copied the entire string (they can be very long)
- Don't add any extra spaces or characters
- The URL should start with `https://` and end with `.supabase.co`
- The anon key should start with `eyJ`

### Still having issues?
1. Make sure your project is fully set up (can take 2-3 minutes)
2. Try refreshing the page
3. Check that you're looking at the correct project
4. Verify you're copying the `anon` `public` key, not the `service_role` key

## Security Note
⚠️ **Important**: The `anon` key is safe to use in frontend code, but:
- Never commit your `.env` file to version control (it's already in `.gitignore`)
- Never share your `service_role` key publicly
- The `anon` key is restricted by Row Level Security (RLS) policies you'll set up
