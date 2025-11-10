-- Create canvas_collaborators table for sharing canvas with other users
CREATE TABLE IF NOT EXISTS canvas_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  collaborator_email TEXT NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(note_id, collaborator_email)
);

-- Enable Row Level Security
ALTER TABLE canvas_collaborators ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view canvas collaborators" ON canvas_collaborators;
DROP POLICY IF EXISTS "Users can add canvas collaborators" ON canvas_collaborators;
DROP POLICY IF EXISTS "Users can remove canvas collaborators" ON canvas_collaborators;

-- Create policy for users to view collaborators of their notes or notes they collaborate on
CREATE POLICY "Users can view canvas collaborators"
  ON canvas_collaborators FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM notes WHERE id = canvas_collaborators.note_id
    ) OR
    auth.uid() = user_id OR
    auth.uid() = added_by
  );

-- Create policy for users to add collaborators to their own notes
CREATE POLICY "Users can add canvas collaborators"
  ON canvas_collaborators FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM notes WHERE id = canvas_collaborators.note_id
    ) OR
    auth.uid() = added_by
  );

-- Create policy for users to remove collaborators they added or from their own notes
CREATE POLICY "Users can remove canvas collaborators"
  ON canvas_collaborators FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM notes WHERE id = canvas_collaborators.note_id
    ) OR
    auth.uid() = added_by
  );

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS canvas_collaborators_note_id_idx ON canvas_collaborators(note_id);
CREATE INDEX IF NOT EXISTS canvas_collaborators_user_id_idx ON canvas_collaborators(user_id);
CREATE INDEX IF NOT EXISTS canvas_collaborators_email_idx ON canvas_collaborators(collaborator_email);

-- Enable Realtime for canvas_collaborators table (only if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'canvas_collaborators'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE canvas_collaborators;
  END IF;
END $$;

-- ============================================
-- COMPLETE FIX: Remove ALL circular dependencies
-- ============================================

-- STEP 1: Drop ALL policies on canvas_collaborators (including problematic ones)
ALTER TABLE canvas_collaborators DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view canvas collaborators" ON canvas_collaborators;
DROP POLICY IF EXISTS "Users can add canvas collaborators" ON canvas_collaborators;
DROP POLICY IF EXISTS "Users can remove canvas collaborators" ON canvas_collaborators;
DROP POLICY IF EXISTS "canvas_collab_select" ON canvas_collaborators;
DROP POLICY IF EXISTS "canvas_collab_insert" ON canvas_collaborators;
DROP POLICY IF EXISTS "canvas_collab_delete" ON canvas_collaborators;

-- STEP 2: Drop ALL policies on notes table
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;
DROP POLICY IF EXISTS "Collaborators can view shared notes" ON notes;
DROP POLICY IF EXISTS "Collaborators can update shared notes" ON notes;
DROP POLICY IF EXISTS "Users can view their own notes or shared notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes or shared notes" ON notes;
DROP POLICY IF EXISTS "notes_select" ON notes;
DROP POLICY IF EXISTS "notes_insert" ON notes;
DROP POLICY IF EXISTS "notes_update" ON notes;
DROP POLICY IF EXISTS "notes_delete" ON notes;
DROP POLICY IF EXISTS "notes_select_own" ON notes;
DROP POLICY IF EXISTS "notes_insert_own" ON notes;
DROP POLICY IF EXISTS "notes_update_own" ON notes;
DROP POLICY IF EXISTS "notes_delete_own" ON notes;

-- STEP 3: Create SIMPLE notes policies (NO queries to canvas_collaborators)
CREATE POLICY "notes_select_own"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notes_insert_own"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_update_own"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "notes_delete_own"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

-- STEP 4: Re-enable RLS on canvas_collaborators
ALTER TABLE canvas_collaborators ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create SIMPLE canvas_collaborators policies (NO queries to notes table)
CREATE POLICY "canvas_collab_select"
  ON canvas_collaborators FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = added_by
  );

CREATE POLICY "canvas_collab_insert"
  ON canvas_collaborators FOR INSERT
  WITH CHECK (auth.uid() = added_by);

CREATE POLICY "canvas_collab_delete"
  ON canvas_collaborators FOR DELETE
  USING (
    auth.uid() = user_id 
    OR auth.uid() = added_by
  );

-- Add collaborator support to notes policies (without circular dependency)

-- Drop existing simple policies
DROP POLICY IF EXISTS "notes_select_own" ON notes;
DROP POLICY IF EXISTS "notes_update_own" ON notes;

-- Create policies that allow both owners AND collaborators
-- Using EXISTS with a simple check to avoid recursion
CREATE POLICY "notes_select_own_or_collab"
  ON notes FOR SELECT
  USING (
    -- Owner can always see
    auth.uid() = user_id
    OR
    -- Collaborator can see (check canvas_collaborators without querying notes)
    EXISTS (
      SELECT 1 
      FROM canvas_collaborators cc
      WHERE cc.note_id = notes.id 
      AND cc.user_id = auth.uid()
    )
  );

CREATE POLICY "notes_update_own_or_collab"
  ON notes FOR UPDATE
  USING (
    -- Owner can always update
    auth.uid() = user_id
    OR
    -- Collaborator can update
    EXISTS (
      SELECT 1 
      FROM canvas_collaborators cc
      WHERE cc.note_id = notes.id 
      AND cc.user_id = auth.uid()
    )
  );

-- Keep insert and delete as owner-only
-- (These should already exist, but just in case)
DROP POLICY IF EXISTS "notes_insert_own" ON notes;
DROP POLICY IF EXISTS "notes_delete_own" ON notes;

CREATE POLICY "notes_insert_own"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_delete_own"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

-- Update canvas_collaborators policies to allow note owners to add collaborators
-- We'll use a function to check ownership safely

-- Drop existing policies
DROP POLICY IF EXISTS "canvas_collab_select" ON canvas_collaborators;
DROP POLICY IF EXISTS "canvas_collab_insert" ON canvas_collaborators;
DROP POLICY IF EXISTS "canvas_collab_delete" ON canvas_collaborators;

-- Create a helper function to check note ownership (avoids circular dependency)
CREATE OR REPLACE FUNCTION is_note_owner(note_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM notes 
    WHERE id = note_uuid 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now create policies using the function
CREATE POLICY "canvas_collab_select"
  ON canvas_collaborators FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = added_by
    OR is_note_owner(note_id)
  );

CREATE POLICY "canvas_collab_insert"
  ON canvas_collaborators FOR INSERT
  WITH CHECK (
    auth.uid() = added_by
    OR is_note_owner(note_id)
  );

CREATE POLICY "canvas_collab_delete"
  ON canvas_collaborators FOR DELETE
  USING (
    auth.uid() = user_id 
    OR auth.uid() = added_by
    OR is_note_owner(note_id)
  );

