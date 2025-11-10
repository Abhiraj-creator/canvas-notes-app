# How to Set Up Database Tables in Supabase

## Step-by-Step Guide

### Step 1: Open SQL Editor in Supabase

1. Log in to [supabase.com](https://supabase.com)
2. Select your project from the dashboard
3. In the left sidebar, look for **"SQL Editor"** 
   - It's usually in the main menu (icon looks like a code/file symbol)
   - If you don't see it, click on the menu to expand it

### Step 2: Open a New Query

1. Click on **"SQL Editor"** in the left sidebar
2. You'll see a SQL editor interface
3. Click **"New query"** button (top left) or just start typing in the editor

### Step 3: Copy the SQL Code

1. Open the `supabase-setup.sql` file from your project
2. **Select all** the SQL code (Ctrl+A / Cmd+A)
3. **Copy** it (Ctrl+C / Cmd+C)

OR manually copy this SQL:

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;

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
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);
CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes(updated_at DESC);

-- Enable Realtime for notes table
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
```

### Step 4: Paste and Run the SQL

1. **Paste** the SQL code into the SQL Editor (Ctrl+V / Cmd+V)
2. Review the code to make sure it's all there
3. Click the **"RUN"** button (usually green, bottom right)
   - Or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)

### Step 5: Verify the Setup

After running the SQL, you should see:

✅ **Success message**: "Success. No rows returned" or similar

To verify everything was created:

1. Go to **"Table Editor"** in the left sidebar
2. You should see a table named **"notes"**
3. Click on it to see the columns:
   - `id` (uuid)
   - `user_id` (uuid)
   - `title` (text)
   - `content` (text)
   - `canvas_data` (jsonb)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

### Step 6: Verify Row Level Security (Optional but Recommended)

1. Go to **"Authentication"** → **"Policies"** in the left sidebar
2. Click on the **"notes"** table
3. You should see 4 policies:
   - Users can view their own notes
   - Users can insert their own notes
   - Users can update their own notes
   - Users can delete their own notes

## Visual Guide

The SQL Editor interface looks like this:

```
┌─────────────────────────────────────────────┐
│  SQL Editor                    [New query]  │
├─────────────────────────────────────────────┤
│                                             │
│  [SQL Code Editor - Paste your SQL here]   │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│                    [RUN]  [Save]  [Help]    │
└─────────────────────────────────────────────┘
```

## Troubleshooting

### Error: "relation already exists"
- This means the table already exists
- The SQL uses `CREATE TABLE IF NOT EXISTS`, so this should be safe
- You can continue - it won't break anything

### Error: "permission denied"
- Make sure you're logged in as the project owner
- Check that your project is fully set up (can take a few minutes)

### Error: "column does not exist"
- Make sure you copied the entire SQL code
- Try running it again - sometimes Supabase needs the code in a specific order

### Error: "publication supabase_realtime does not exist"
- This is rare, but can happen on new projects
- Wait a few minutes and try again
- Or contact Supabase support

### No error but table not showing?
1. Refresh the page
2. Check the "Table Editor" in the left sidebar
3. Make sure you're looking at the right project

### Still having issues?
1. Make sure your project is fully set up (wait 2-3 minutes after creation)
2. Try running the SQL in smaller chunks:
   - First: Create the table
   - Second: Enable RLS and create policies
   - Third: Create indexes and enable Realtime

## What This SQL Does

1. **Creates the `notes` table** with columns for:
   - `id`: Unique identifier for each note
   - `user_id`: Links note to the user who created it
   - `title`: Note title
   - `content`: Note content/text
   - `canvas_data`: JSON data for Excalidraw drawings
   - `created_at`: When the note was created
   - `updated_at`: When the note was last updated

2. **Enables Row Level Security (RLS)**: 
   - Ensures users can only see/modify their own notes

3. **Creates Security Policies**:
   - Users can only SELECT (view) their own notes
   - Users can only INSERT (create) notes for themselves
   - Users can only UPDATE (edit) their own notes
   - Users can only DELETE their own notes

4. **Creates Indexes**:
   - Makes queries faster by indexing `user_id` and `updated_at`

5. **Enables Realtime**:
   - Allows real-time synchronization of notes across multiple clients

## Next Steps

After running the SQL successfully:

1. ✅ Your database is set up!
2. ✅ Go back to your app and try creating a note
3. ✅ The app should now be able to save and retrieve notes

## Quick Reference

**Location**: Supabase Dashboard → SQL Editor → New Query

**File to use**: `supabase-setup.sql` from your project root

**Action**: Copy → Paste → Run (Ctrl+Enter)

