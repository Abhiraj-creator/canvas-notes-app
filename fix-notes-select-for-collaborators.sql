-- Fix notes SELECT policy to allow collaborators to read notes
-- Run this in Supabase SQL Editor

-- Step 1: Drop existing SELECT policies on notes
DROP POLICY IF EXISTS "notes_select_own_or_collab" ON notes;
DROP POLICY IF EXISTS "notes_select_own" ON notes;
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
DROP POLICY IF EXISTS "Users can view their own notes or shared notes" ON notes;

-- Step 2: Create helper functions with SECURITY DEFINER
-- This allows them to access auth.users table

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

-- Function to get current user's email (with SECURITY DEFINER to access auth.users)
CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is a collaborator by email (avoids direct auth.users query in policy)
CREATE OR REPLACE FUNCTION is_collaborator_by_email(note_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get user email using SECURITY DEFINER function
  SELECT get_current_user_email() INTO user_email;
  
  -- Check if collaborator exists with this email
  RETURN EXISTS (
    SELECT 1 
    FROM canvas_collaborators cc
    WHERE cc.note_id = note_uuid 
    AND (
      cc.user_id = auth.uid()
      OR
      LOWER(TRIM(cc.collaborator_email)) = LOWER(TRIM(user_email))
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create SELECT policy that allows both owners AND collaborators
-- Use the helper function to avoid direct auth.users query
CREATE POLICY "notes_select_own_or_collab"
  ON notes FOR SELECT
  USING (
    -- Owner can always see their notes
    auth.uid() = user_id
    OR
    -- Collaborator can see notes they're collaborating on
    -- Use helper function to check collaboration (avoids direct auth.users query)
    is_collaborator_by_email(notes.id)
  );

-- Step 4: Also update UPDATE policy to allow collaborators to update
DROP POLICY IF EXISTS "notes_update_own_or_collab" ON notes;
DROP POLICY IF EXISTS "notes_update_own" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes or shared notes" ON notes;

CREATE POLICY "notes_update_own_or_collab"
  ON notes FOR UPDATE
  USING (
    -- Owner can always update their notes
    auth.uid() = user_id
    OR
    -- Collaborator can update notes they're collaborating on
    -- Use helper function to check collaboration (avoids direct auth.users query)
    is_collaborator_by_email(notes.id)
  );

-- Test: This should now work for collaborators
-- SELECT * FROM notes WHERE id = 'your-note-id';
-- This should work if you're a collaborator

