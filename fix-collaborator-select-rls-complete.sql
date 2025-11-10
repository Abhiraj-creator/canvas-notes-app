-- Complete fix for canvas_collaborators SELECT policy
-- This allows collaborators to see their own records even when user_id is null

-- Step 1: Drop existing SELECT policies
DROP POLICY IF EXISTS "canvas_collab_select" ON canvas_collaborators;
DROP POLICY IF EXISTS "Users can view canvas collaborators" ON canvas_collaborators;
DROP POLICY IF EXISTS "canvas_collab_select_permissive" ON canvas_collaborators;

-- Step 2: Create a function to check if user's email matches collaborator email
-- This allows RLS to check email matches
CREATE OR REPLACE FUNCTION is_collaborator_by_email(note_uuid UUID, email_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM canvas_collaborators cc
    WHERE cc.note_id = note_uuid 
    AND LOWER(TRIM(cc.collaborator_email)) = LOWER(TRIM(email_to_check))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create a function to get user email from auth
CREATE OR REPLACE FUNCTION get_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create a more permissive SELECT policy
-- This allows:
-- 1. Collaborators to see their own records (by user_id or email)
-- 2. Note owners to see all collaborators
-- 3. People who added collaborators to see them
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
    -- User's email matches the collaborator email (for when user_id is null)
    is_collaborator_by_email(note_id, get_user_email())
  );

-- Step 5: Verify the policies
-- Run this to check:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'canvas_collaborators';

