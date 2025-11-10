# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase

1. Create account at [supabase.com](https://supabase.com)
2. Create a new project (wait 2-3 minutes for setup)
3. Go to **Settings** (gear icon) → **API**
4. Copy your credentials:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (click "Reveal" or "Copy" - starts with `eyJ...`)
5. Create `.env` file in project root:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

📖 **Detailed guide**: See `SUPABASE_CREDENTIALS_GUIDE.md` for step-by-step instructions

### 3. Set Up Database

1. In Supabase dashboard, click **"SQL Editor"** (left sidebar)
2. Click **"New query"**
3. Copy all SQL from `supabase-setup.sql` file
4. Paste into the editor and click **"RUN"** (or press `Ctrl+Enter`)
5. Verify success message appears

📖 **Need help?** See `DATABASE_SETUP_GUIDE.md` for detailed instructions

### 4. Configure Authentication (Important!)

1. In Supabase, go to **Authentication** → **Providers**
2. Ensure **Email** provider is enabled (usually already ON)
3. Go to **Authentication** → **Settings**
4. Set **Site URL** to `http://localhost:5173`
5. Add **Redirect URL**: `http://localhost:5173/**`
6. (Optional) Disable "Email confirmations" for faster testing

📖 **Detailed guide**: See `EMAIL_AUTH_SETUP_GUIDE.md`

### 5. (Optional) Set Up Google OAuth

1. Create Google OAuth credentials in Google Cloud Console
2. Add redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
3. Enable Google provider in Supabase and add credentials
4. Test Google sign-in

📖 **Detailed guide**: See `GOOGLE_OAUTH_SETUP_GUIDE.md`

### 6. Run the App

```bash
npm run dev
```

Visit `http://localhost:5173` and start creating notes!

## ✨ Features to Try

- **Create Notes**: Click "New Note" button
- **Edit Notes**: Click on any note card
- **Canvas Drawing**: Select a note and click "Canvas" button
- **Theme Toggle**: Click the sun/moon icon
- **Real-time Sync**: Open the same note in multiple tabs to see real-time updates

## 🎨 Customization

- Theme colors: Edit `tailwind.config.js`
- Animations: Modify `src/utils/animations.js`
- Components: Customize in `src/components/`

## 📦 Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

## 🐛 Troubleshooting

**Can't connect to Supabase?**
- Check your `.env` file has correct credentials
- Verify Supabase project is active

**Real-time not working?**
- Make sure you ran the SQL setup script
- Check Supabase Realtime is enabled (default)

**Canvas not saving?**
- Check browser console for errors
- Verify `canvas_data` column exists in notes table

## 📚 Next Steps

- Read [README.md](./README.md) for detailed documentation
- Check [SETUP.md](./SETUP.md) for advanced setup
- Deploy to Vercel, Netlify, or your preferred platform
