# Fix RLS Policy for Canvas Collaborators

## Problem
When trying to add a collaborator, you get a permission denied error because the RLS policy is blocking the INSERT operation.

## Solution: Update RLS Policies in Supabase

### Step 1: Open Supabase SQL Editor

1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project
4. Click on **"SQL Editor"** in the left sidebar
5. Click **"New query"**

### Step 2: Copy and Run the Fix SQL

Copy the entire contents of `fix-collaborator-rls.sql` and paste it into the SQL Editor, then click **"Run"** (or press Ctrl+Enter).

**OR** copy this SQL directly:

```sql
-- Fix RLS Policies for canvas_collaborators to allow note owners to add collaborators

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
```

### Step 3: Verify the Fix

1. After running the SQL, you should see "Success. No rows returned"
2. Go to **Authentication → Policies** in Supabase
3. Find the `canvas_collaborators` table
4. Verify you see the `canvas_collab_insert` policy

### Step 4: Test the Fix

1. Go back to your app
2. Open a canvas
3. Click the Users icon (👥)
4. Click "Add User"
5. Enter an email address
6. Click "Share"
7. Check the console - you should see "✅ Collaborator added successfully"
8. The collaborator should appear in the list

## What This Fix Does

1. **Drops the old policy** that might have been blocking inserts
2. **Recreates the `is_note_owner` function** to ensure it works correctly
3. **Creates a new INSERT policy** that allows:
   - Note owners to add collaborators
   - Users to add themselves (edge case)
4. **Updates the SELECT policy** so note owners can see all collaborators

## If It Still Doesn't Work

1. Check Supabase logs:
   - Go to **Logs → Database** in Supabase
   - Look for any errors related to `canvas_collaborators`
2. Verify the function exists:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'is_note_owner';
   ```
   Should return `is_note_owner`
3. Test the function manually:
   ```sql
   SELECT is_note_owner('your-note-id-here');
   ```
   Should return `true` if you're the owner

## Alternative: Simpler Policy (If function doesn't work)

If the function approach doesn't work, try this simpler policy:

```sql
-- Drop the function-based policy
DROP POLICY IF EXISTS "canvas_collab_insert" ON canvas_collaborators;

-- Create a direct policy (may cause recursion, but simpler)
CREATE POLICY "canvas_collab_insert_simple"
  ON canvas_collaborators FOR INSERT
  WITH CHECK (
    auth.uid() = added_by
    OR
    EXISTS (
      SELECT 1 FROM notes 
      WHERE id = canvas_collaborators.note_id 
      AND user_id = auth.uid()
    )
  );
```

**Note:** This simpler policy might cause recursion warnings, but it should work for adding collaborators.

