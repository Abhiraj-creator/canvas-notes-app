-- Verify Realtime is enabled for notes table
-- Run this in Supabase SQL Editor to check if Realtime is enabled

-- Check if notes table is in the Realtime publication
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'notes';

-- If the query returns 0 rows, Realtime is NOT enabled
-- Run this to enable it:
-- ALTER PUBLICATION supabase_realtime ADD TABLE notes;

-- Also check canvas_collaborators
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'canvas_collaborators';

