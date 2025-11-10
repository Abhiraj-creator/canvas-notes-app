-- Fix RLS Policies for canvas_collaborators to allow note owners to add collaborators
-- Run this in Supabase SQL Editor

-- Step 1: Drop existing INSERT policy
DROP POLICY IF EXISTS "canvas_collab_insert" ON canvas_collaborators;
DROP POLICY IF EXISTS "Users can add canvas collaborators" ON canvas_collaborators;

-- Step 2: Ensure the helper function exists and works correctly
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

-- Step 3: Create a simpler, more reliable INSERT policy
-- This allows:
-- 1. Users to insert if they're the one adding (auth.uid() = added_by)
-- 2. Note owners to add collaborators (using the helper function)
CREATE POLICY "canvas_collab_insert"
  ON canvas_collaborators FOR INSERT
  WITH CHECK (
    -- User is adding themselves (shouldn't happen, but safe)
    auth.uid() = added_by
    OR
    -- User is the owner of the note
    is_note_owner(note_id)
  );

-- Step 4: Also update SELECT policy to allow note owners to see all collaborators
DROP POLICY IF EXISTS "canvas_collab_select" ON canvas_collaborators;
DROP POLICY IF EXISTS "Users can view canvas collaborators" ON canvas_collaborators;

CREATE POLICY "canvas_collab_select"
  ON canvas_collaborators FOR SELECT
  USING (
    -- User is the collaborator themselves
    auth.uid() = user_id 
    OR 
    -- User added this collaborator
    auth.uid() = added_by
    OR 
    -- User is the note owner
    is_note_owner(note_id)
  );

-- Step 5: Verify the policies are correct
-- You can check this in Supabase Dashboard → Authentication → Policies

-- Test query (run this to verify it works):
-- SELECT * FROM canvas_collaborators WHERE note_id = 'your-note-id-here';
-- This should work if you're the note owner

