# Full Stack Notes App

A modern, full-stack notes application with real-time collaboration, canvas drawing capabilities, and beautiful animations.

## Features

- 📝 **Notes Management**: Create, edit, and delete notes with rich text support
- 🎨 **Canvas Drawing**: Draw and create shapes using Excalidraw integration
- 👥 **Real-time Collaboration**: See updates from other users in real-time
- 🌓 **Dark/Light Theme**: Toggle between themes with smooth animations
- ✨ **Animations**: GSAP animations with ScrollTrigger
- 🔄 **Page Transitions**: Smooth page transitions with GSAP and React Router
- 🎯 **Microinteractions**: Modern UI with Framer Motion animations
- 🔐 **Authentication**: Secure authentication with Supabase Auth (Email & Google OAuth)
- 💾 **Real-time Sync**: Automatic synchronization using Supabase Realtime

## Tech Stack

- **Frontend**: React (JSX) with Vite
- **Styling**: Tailwind CSS
- **Animations**: GSAP with ScrollTrigger, Framer Motion
- **Page Transitions**: GSAP with React Router
- **Backend**: Supabase (Auth, Database, Realtime)
- **State Management**: Zustand
- **Canvas**: Excalidraw
- **Notifications**: React Hot Toast

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API and copy your URL and anon key
3. Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Create Database Tables

Run these SQL commands in your Supabase SQL Editor (or use the `supabase-setup.sql` file):

```sql
-- Create notes table
CREATE TABLE notes (
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

-- Create policy for users to only see their own notes
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

-- Create index for faster queries
CREATE INDEX notes_user_id_idx ON notes(user_id);
CREATE INDEX notes_updated_at_idx ON notes(updated_at DESC);

-- Enable Realtime for notes table
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
```

### 4. Configure Authentication

1. Enable Email authentication (usually enabled by default)
2. Set Site URL and Redirect URLs in Supabase
3. (Optional) Set up Google OAuth for social login

📖 See `SETUP.md` for detailed authentication setup instructions

### 5. Run the Development Server

```bash
npm run dev
```

## Project Structure

```
src/
├── components/          # React components
│   ├── CanvasEditor.jsx
│   ├── LoadingSpinner.jsx
│   ├── NoteCard.jsx
│   ├── NoteEditor.jsx
│   ├── NotesList.jsx
│   ├── ProtectedRoute.jsx
│   └── ThemeToggle.jsx
├── context/            # React context providers
│   └── ThemeContext.jsx
├── hooks/              # Custom React hooks
│   ├── useAuth.js
│   └── useNotes.js
├── lib/                # Library configurations
│   └── supabase.js
├── pages/              # Page components
│   ├── Dashboard.jsx
│   ├── Login.jsx
│   └── Signup.jsx
├── store/              # State management
│   └── useStore.js
├── utils/              # Utility functions
│   ├── animations.js
│   └── barba.js
├── App.jsx
├── App.css
├── main.jsx
└── index.css
```

## Features in Detail

### Real-time Collaboration

The app uses Supabase Realtime to sync notes and canvas data across all connected users in real-time. Changes are automatically reflected without page refresh.

### Canvas Drawing

Integrated Excalidraw allows users to:
- Draw freehand sketches
- Create shapes and diagrams
- Add text annotations
- Export drawings

### Theme Toggle

Smooth theme transitions with GSAP animations. The theme preference is persisted in local storage.

### Animations

- GSAP ScrollTrigger for scroll-based animations
- Framer Motion for component animations
- Barba.js for page transitions
- Microinteractions on buttons and cards

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel/Netlify

1. Push your code to GitHub
2. Connect your repository to Vercel/Netlify
3. Add environment variables
4. Deploy!

## License

MIT
