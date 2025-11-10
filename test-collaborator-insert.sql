-- Test script to verify collaborator INSERT works
-- Replace the values with your actual data

-- Step 1: Get your user ID (run this while logged in as the note owner)
SELECT auth.uid() as current_user_id;

-- Step 2: Get a note ID you own (replace with your actual user ID)
SELECT id, title, user_id 
FROM notes 
WHERE user_id = auth.uid()
LIMIT 1;

-- Step 3: Test if you can insert a collaborator (replace note_id with actual ID)
-- This should work if RLS policies are correct
INSERT INTO canvas_collaborators (note_id, collaborator_email, added_by)
VALUES (
  'your-note-id-here',  -- Replace with actual note ID
  'test@example.com',   -- Test email
  auth.uid()            -- Your user ID
)
RETURNING *;

-- Step 4: Check if the insert worked
SELECT * FROM canvas_collaborators 
WHERE note_id = 'your-note-id-here';

-- Step 5: Clean up test data (optional)
-- DELETE FROM canvas_collaborators 
-- WHERE note_id = 'your-note-id-here' 
-- AND collaborator_email = 'test@example.com';

