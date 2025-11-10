# How to Share a Canvas - Step by Step

## ⚠️ Current Issue
You're getting "Canvas not found" because the note doesn't exist in the database. Follow these steps to create and share a canvas properly.

---

## ✅ Complete Process (Do This in Order)

### STEP 1: Create a Note
1. **Go to Dashboard**: Navigate to `http://localhost:5173/dashboard` (or your domain)
2. **Click the "+" button** (top right) or **"Create Note"** button
3. **Wait for the note to be created**
   - You should see a new note appear in your notes list
   - The note editor sidebar should open on the right

### STEP 2: Open the Canvas
1. **In the note editor sidebar** (right side), look for a **pen icon button** (🖊️)
2. **Click the pen icon** - This opens the Excalidraw canvas
3. **The canvas should open in fullscreen**
   - You should see the Excalidraw drawing interface
   - There should be a close button (X) in the top-left
   - There should be a Users icon (👥) in the top-right

### STEP 3: Open Collaboration Panel
1. **Look at the top-right corner** of the canvas
2. **Find the Users icon button** (👥) - This is the collaboration button
3. **Click the Users icon**
4. **A panel should slide in from the right** showing:
   - "Share Canvas" section
   - "Add User" button
   - "Copy Share Link" button
   - "Collaborators" list

### STEP 4: Get the Share Link
1. **In the collaboration panel**, find the **"Copy Share Link"** button
2. **Click "Copy Share Link"**
3. **You should see a success message**: "Link copied to clipboard"
4. **The link format should be**: `http://localhost:5173/canvas/{note-id}`
   - Example: `http://localhost:5173/canvas/9c21d8c5-5a98-4127-bb62-cada2afc8f6f`

### STEP 5: Test the Link
1. **Copy the link** you just got
2. **Open a new browser tab** (or incognito window)
3. **Paste the link** in the address bar
4. **Press Enter**
5. **If you're signed in**, the canvas should load
6. **If you're not signed in**, you'll be redirected to login, then back to the canvas

---

## 🔍 Troubleshooting

### Problem: "Canvas not found" error

**Possible causes:**
1. **The note was deleted** - Check your notes list in the dashboard
2. **The link is from an old/deleted note** - Create a new note and get a fresh link
3. **The note was never created** - Make sure you see the note in your dashboard

**Solution:**
1. Go back to dashboard
2. Check if the note exists in your notes list
3. If it doesn't exist, create a new note
4. Open the canvas for the new note
5. Get a fresh share link

### Problem: Can't see the pen icon button

**Check:**
1. Make sure you've selected a note (click on a note card)
2. The note editor sidebar should be open on the right
3. Look for the pen icon in the note editor header/toolbar

### Problem: Can't see the Users icon button

**Check:**
1. Make sure you've opened the canvas (clicked the pen icon)
2. The canvas should be in fullscreen mode
3. Look at the top-right corner of the canvas
4. The Users icon should be visible there

### Problem: Link doesn't work

**Check:**
1. Make sure you copied the complete link
2. The link should start with `http://localhost:5173/canvas/` or your domain
3. The note ID should be a long UUID (e.g., `9c21d8c5-5a98-4127-bb62-cada2afc8f6f`)
4. Try creating a new note and getting a fresh link

---

## 📝 Quick Checklist

Before sharing:
- [ ] I created a note (it appears in my notes list)
- [ ] I clicked the pen icon to open the canvas
- [ ] The canvas opened in fullscreen
- [ ] I can see the Users icon button in the top-right
- [ ] I clicked the Users icon and the collaboration panel opened
- [ ] I clicked "Copy Share Link" and got a link
- [ ] The link looks correct (has `/canvas/` and a note ID)

When testing:
- [ ] I pasted the link in a new tab
- [ ] I'm signed in (or was redirected to login)
- [ ] The canvas loads successfully
- [ ] I can see and edit the canvas

---

## 🎯 Quick Test

1. **Create a new note** → Click "+" button
2. **Open its canvas** → Click pen icon (🖊️)
3. **Get share link** → Click Users icon (👥) → Click "Copy Share Link"
4. **Test the link** → Paste in new tab → Should work!

If this doesn't work, check the browser console (F12) for errors and share them.

