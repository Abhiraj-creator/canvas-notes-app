-- URGENT FIX: Allow collaborators to see their own records
-- Run this in Supabase SQL Editor immediately

-- Step 1: Drop existing SELECT policy
DROP POLICY IF EXISTS "canvas_collab_select" ON canvas_collaborators;
DROP POLICY IF EXISTS "Users can view canvas collaborators" ON canvas_collaborators;

-- Step 2: Create helper function to get user email (no recursion)
CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Ensure is_note_owner function exists
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

-- Step 4: Create SELECT policy that allows email-based access
-- Note: We check email match directly in the policy to avoid recursion
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
    OR
    -- User's email matches the collaborator email (allows collaborators to see their own record)
    -- We use LOWER and TRIM for case-insensitive matching
    LOWER(TRIM(collaborator_email)) = LOWER(TRIM(get_current_user_email()))
  );

-- Test: This should now work for collaborators
-- SELECT * FROM canvas_collaborators WHERE note_id = 'your-note-id';

