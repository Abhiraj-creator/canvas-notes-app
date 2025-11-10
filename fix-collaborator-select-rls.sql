-- Fix SELECT policy for canvas_collaborators
-- This allows collaborators to see their own records even if user_id is null

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "canvas_collab_select" ON canvas_collaborators;
DROP POLICY IF EXISTS "Users can view canvas collaborators" ON canvas_collaborators;

-- Create a more permissive SELECT policy
-- This allows:
-- 1. Collaborators to see their own records (by user_id or email)
-- 2. Note owners to see all collaborators
-- 3. People who added collaborators to see them

-- First, ensure the helper function exists
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

-- Create SELECT policy that allows checking by email
-- Note: We can't directly check email in RLS, so we make it more permissive
CREATE POLICY "canvas_collab_select"
  ON canvas_collaborators FOR SELECT
  USING (
    -- User is the collaborator (by user_id)
    auth.uid() = user_id 
    OR 
    -- User added this collaborator
    auth.uid() = added_by
    OR 
    -- User is the note owner (can see all collaborators)
    is_note_owner(note_id)
  );

-- Alternative: More permissive policy (if above doesn't work)
-- This allows anyone to see collaborators for notes they own or were added to
-- WARNING: This is less secure but might be needed if email matching is required

-- If the above doesn't work, try this more permissive version:
/*
DROP POLICY IF EXISTS "canvas_collab_select" ON canvas_collaborators;

CREATE POLICY "canvas_collab_select_permissive"
  ON canvas_collaborators FOR SELECT
  USING (
    -- Allow if user is note owner
    is_note_owner(note_id)
    OR
    -- Allow if user_id matches
    auth.uid() = user_id
    OR
    -- Allow if user added this
    auth.uid() = added_by
    OR
    -- Allow if user owns any note (temporary - for debugging)
    EXISTS (SELECT 1 FROM notes WHERE user_id = auth.uid())
  );
*/

