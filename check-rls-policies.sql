-- Diagnostic SQL to check RLS policies for canvas_collaborators
-- Run this in Supabase SQL Editor to see current policies

-- 1. Check if the table exists and RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'canvas_collaborators';

-- 2. List all policies on canvas_collaborators
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'canvas_collaborators'
ORDER BY policyname;

-- 3. Check if the helper function exists
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname = 'is_note_owner';

-- 4. Test the function (replace with your actual note ID and user ID)
-- This will show if the function works
-- SELECT is_note_owner('your-note-id-here');

-- 5. Check current user context
SELECT 
  current_user,
  current_database(),
  session_user;

