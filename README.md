# Canvas Notes App

This is a full-stack note-taking application with a real-time collaborative canvas feature. It is built with React, Vite, and Supabase, and is designed to be deployed on Vercel.

## Getting Started

To get started with the project, you will need to have Node.js and npm installed. You will also need a Supabase account.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd canvas-notes-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root of the project and add the following environment variables:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_REDIRECT_URL=http://localhost:5173
```

You can find your Supabase URL and anon key in your Supabase project settings.

### 4. Run the Development Server

```bash
npm run dev
```

This will start the development server at `http://localhost:5173`.

## Deployment

This project is designed to be deployed on Vercel. The `vercel.json` file in the root of the project is configured to handle the build and routing for you.

### 1. Push to GitHub

Commit your changes and push them to your GitHub repository.

### 2. Import Project on Vercel

Go to your Vercel dashboard and import the project from your GitHub repository.

### 3. Configure Environment Variables

In your Vercel project settings, add the following environment variables:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_REDIRECT_URL=https://your-vercel-app-url.vercel.app
```

### 4. Deploy

Vercel will automatically build and deploy your application. The `vercel.json` file will ensure that the build output is correctly configured and that all routes are rewritten to `index.html`.

## Troubleshooting

### 404 Not Found on Vercel

If you are seeing a 404 error on your deployed Vercel site, it is likely due to a misconfiguration in your Vercel project settings. The `vercel.json` file in this project is designed to prevent this issue, but if you are still experiencing it, please ensure that:

1.  Your Vercel project's **Build & Development Settings** are configured correctly. The **Output Directory** should be set to `dist`.
2.  Your `vercel.json` file is present in the root of your project and is correctly configured.

### OAuth Redirect Issues

If you are having issues with OAuth redirects, please ensure that:

1.  Your **Redirect URLs** in your Supabase project's authentication settings are correctly configured. You should have your Vercel deployment URL (`https://your-vercel-app-url.vercel.app`) and your local development URL (`http://localhost:5173`) in the list.
2.  Your `VITE_REDIRECT_URL` environment variable is correctly set in both your local `.env.local` file and your Vercel project settings.
