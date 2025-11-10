import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CanvasEditor } from '../components/CanvasEditor'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { LoadingSpinner } from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

export const SharedCanvas = () => {
  const { noteId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const checkingRef = useRef(false)
  const lastNoteIdRef = useRef(null)

  // Reset state when noteId changes
  useEffect(() => {
    if (lastNoteIdRef.current !== noteId) {
      lastNoteIdRef.current = noteId
      setHasAccess(false)
      setLoading(true)
      checkingRef.current = false
    }
  }, [noteId])

  useEffect(() => {
    // Prevent duplicate checks
    if (checkingRef.current) return

    const checkAccess = async () => {
      if (!noteId) {
        toast.error('Invalid canvas link')
        navigate('/dashboard')
        return
      }

      // If user is not authenticated, redirect to login
      if (!authLoading && !user) {
        toast.error('Please sign in to access this canvas')
        navigate(`/login?redirect=/canvas/${noteId}`)
        return
      }

      // Wait for auth to finish loading
      if (authLoading || !user) return

      // Prevent duplicate queries
      if (checkingRef.current) return
      checkingRef.current = true
      setLoading(true)

      try {
        console.log('Checking access for canvas:', { noteId, userId: user.id, userEmail: user.email })
        
        // Strategy: Check collaborator status first (has its own RLS policies)
        // Then verify note access. This avoids RLS issues when user is a collaborator
        
        // First check if user is a collaborator
        let collaboratorData = null
        
        console.log('Checking collaborator access:', {
          noteId,
          userId: user.id,
          userEmail: user.email,
          emailLowercase: user.email?.toLowerCase()
        })
        
        // Check by user_id first
        console.log('Checking collaborator by user_id...')
        const { data: collabByUserId, error: collabError1 } = await supabase
          .from('canvas_collaborators')
          .select('*')
          .eq('note_id', noteId)
          .eq('user_id', user.id)
          .maybeSingle()
        
        console.log('Collaborator check by user_id:', { 
          data: collabByUserId, 
          error: collabError1,
          found: !!collabByUserId
        })
        
        if (!collabError1 && collabByUserId) {
          collaboratorData = collabByUserId
          console.log('✅ Found collaborator by user_id:', collabByUserId)
        } else {
          // If not found by user_id, try by email (case-insensitive)
          console.log('Checking collaborator by email (case-insensitive)...')
          
          // Try exact match first
          let collabByEmail = null
          let collabError2 = null
          
          const { data: exactMatch, error: exactError } = await supabase
            .from('canvas_collaborators')
            .select('*')
            .eq('note_id', noteId)
            .eq('collaborator_email', user.email)
            .maybeSingle()
          
          if (!exactError && exactMatch) {
            collabByEmail = exactMatch
            collabError2 = null
          } else {
            // Try case-insensitive match
            const { data: caseInsensitive, error: caseError } = await supabase
              .from('canvas_collaborators')
              .select('*')
              .eq('note_id', noteId)
              .ilike('collaborator_email', user.email)
              .maybeSingle()
            
            collabByEmail = caseInsensitive
            collabError2 = caseError
          }
          
          console.log('Collaborator check by email:', { 
            data: collabByEmail, 
            error: collabError2,
            hasData: !!collabByEmail,
            userEmail: user.email,
            collaboratorEmail: collabByEmail?.collaborator_email
          })
          
          // Also check all collaborators for this note to debug
          // Try without RLS restrictions first to see if data exists
          const { data: allCollaborators, error: allCollabError } = await supabase
            .from('canvas_collaborators')
            .select('*')
            .eq('note_id', noteId)
          
          const userEmailLower = user.email?.toLowerCase().trim()
          const matches = allCollaborators?.filter(c => {
            const collabEmailLower = c.collaborator_email?.toLowerCase().trim()
            return collabEmailLower === userEmailLower || c.user_id === user.id
          }) || []
          
          console.log('All collaborators for this note:', {
            count: allCollaborators?.length || 0,
            collaborators: allCollaborators,
            error: allCollabError,
            userEmail: user.email,
            userEmailLower: userEmailLower,
            matches: matches,
            matchCount: matches.length,
            allEmails: allCollaborators?.map(c => ({
              email: c.collaborator_email,
              emailLower: c.collaborator_email?.toLowerCase().trim(),
              userId: c.user_id
            })) || []
          })
          
          // If we found a match in the list but the query didn't return it, try manual match
          if (matches.length > 0 && !collabByEmail) {
            console.log('Found match in all collaborators list, using it:', matches[0])
            collaboratorData = matches[0]
          }
          
          if (!collabError2 && collabByEmail) {
            collaboratorData = collabByEmail
            console.log('✅ Found collaborator by email:', collabByEmail)
            // Update the collaborator record to include user_id if it was missing
            if (!collabByEmail.user_id) {
              console.log('Updating collaborator record with user_id...')
              const { error: updateError } = await supabase
                .from('canvas_collaborators')
                .update({ user_id: user.id })
                .eq('id', collabByEmail.id)
              
              if (updateError) {
                console.error('Error updating collaborator user_id:', updateError)
              } else {
                console.log('✅ Updated collaborator with user_id')
                // Update the local reference
                collaboratorData = { ...collabByEmail, user_id: user.id }
              }
            }
          } else {
            console.warn('❌ Collaborator not found by email or user_id')
            console.warn('Available collaborators:', allCollaborators)
            console.warn('Looking for email:', user.email)
            console.warn('Available emails:', allCollaborators?.map(c => c.collaborator_email) || [])
          }
        }

        // If user is a collaborator, grant access immediately
        // CanvasEditor will handle loading canvas_data with its own RLS-aware query
        if (collaboratorData) {
          console.log('Access granted: User is a collaborator')
          setHasAccess(true)
          setLoading(false)
          return
        }

        // User is not a collaborator, check if they're the owner
        // Try multiple approaches to check ownership
        
        let allUserNotes = null // Declare outside to use in error message
        
        // Approach 1: Query user's own notes with noteId filter
        console.log('Checking if user is owner (approach 1: direct query)...')
        const { data: userNotes, error: notesError } = await supabase
          .from('notes')
          .select('id, user_id')
          .eq('user_id', user.id)
          .eq('id', noteId)
          .maybeSingle()

        console.log('Ownership check result (approach 1):', { 
          data: userNotes, 
          error: notesError,
          hasData: !!userNotes,
          userIdMatch: userNotes?.user_id === user.id
        })

        // Approach 2: Fetch all user's notes and check if noteId is in the list
        if (!userNotes) {
          console.log('Approach 1 failed, trying approach 2: fetch all notes...')
          const { data: fetchedNotes, error: allNotesError } = await supabase
            .from('notes')
            .select('id, user_id')
            .eq('user_id', user.id)
          
          allUserNotes = fetchedNotes
          
          const noteIds = allUserNotes?.map(n => n.id) || []
          const found = allUserNotes?.some(n => n.id === noteId)
          
          console.log('All user notes:', { 
            count: allUserNotes?.length,
            noteIds: noteIds,
            targetNoteId: noteId,
            found: found,
            error: allNotesError,
            fullNotes: allUserNotes
          })
          
          console.log('Note ID comparison:', {
            target: noteId,
            inList: found,
            allIds: noteIds,
            exactMatch: noteIds.find(id => id === noteId)
          })
          
          if (!allNotesError && allUserNotes) {
            const isOwner = allUserNotes.some(note => note.id === noteId)
            if (isOwner) {
              console.log('Access granted: User is the owner (found in all notes)')
              setHasAccess(true)
              setLoading(false)
              return
            }
          }
        }

        if (notesError) {
          console.error('Error checking ownership:', notesError)
          // If there's an error checking ownership, user likely doesn't have access
          toast.error('You do not have access to this canvas')
          navigate('/dashboard')
          return
        }

        // If note exists in user's notes, they're the owner
        if (userNotes && userNotes.user_id === user.id) {
          console.log('Access granted: User is the owner (direct query)')
          setHasAccess(true)
          setLoading(false)
          return
        }

        // If we get here, user is neither a collaborator nor the owner
        // Check if the note exists - try multiple approaches since RLS might block
        console.log('Checking if note exists...')
        
        // Approach 1: Check in user's notes (RLS allows this)
        const noteInUserNotes = allUserNotes?.find(n => n.id === noteId)
        
        // Approach 2: Try direct query (might be blocked by RLS)
        const { data: noteExists, error: noteExistsError } = await supabase
          .from('notes')
          .select('id, user_id')
          .eq('id', noteId)
          .maybeSingle()
        
        console.log('Note existence check:', {
          exists: !!noteExists,
          inUserNotes: !!noteInUserNotes,
          error: noteExistsError,
          noteId,
          noteData: noteExists,
          allUserNoteIds: allUserNotes?.map(n => n.id) || []
        })
        
        // If note is in user's notes but we didn't get it from direct query, it's an RLS issue
        if (noteInUserNotes && !noteExists) {
          console.warn('Note exists in user notes but RLS is blocking direct query - this is an RLS policy issue')
        }

        // If we get here, user is neither a collaborator nor the owner
        // The note might not exist, or they don't have access
        console.log('Access denied - user is not owner or collaborator', {
          noteId,
          userId: user.id,
          userEmail: user.email,
          collaboratorData,
          userNotes,
          userNotesCount: allUserNotes?.length || 0,
          noteExists: !!noteExists
        })
        
        // Provide a more helpful error message
        // Use noteInUserNotes as the primary check since it's more reliable
        const noteActuallyExists = noteInUserNotes || noteExists
        
        if (!noteActuallyExists) {
          console.error('Note does not exist in database:', noteId)
          console.error('Debug info:', {
            noteId,
            allUserNoteIds: allUserNotes?.map(n => n.id) || [],
            noteInUserNotes: !!noteInUserNotes,
            noteExists: !!noteExists,
            userNotesCount: allUserNotes?.length || 0
          })
          toast.error('Canvas not found. The canvas may have been deleted or the link is invalid.', {
            duration: 5000,
          })
        } else if (allUserNotes?.length === 0) {
          console.warn('User has no notes in their account')
          toast.error('You do not have access to this canvas. Please ask the canvas owner to share it with you.', {
            duration: 5000,
          })
        } else if (noteInUserNotes && !noteExists) {
          // Note exists in user's notes but RLS is blocking - this shouldn't happen for owners
          console.error('RLS policy issue: Note exists but query is blocked')
          toast.error('Access issue detected. The note exists but access is blocked. Please check RLS policies.', {
            duration: 5000,
          })
        } else {
          toast.error('Canvas not found or you do not have access to this canvas', {
            duration: 5000,
          })
        }
        
        // Additional helpful message
        console.log('Troubleshooting info:', {
          noteId,
          noteExists,
          userHasNotes: (allUserNotes?.length || 0) > 0,
          userNotesCount: allUserNotes?.length || 0,
          isCollaborator: !!collaboratorData,
          suggestion: !noteExists 
            ? 'The note does not exist. Check if the link is correct or if the note was deleted.'
            : allUserNotes?.length === 0
            ? 'You have no notes. Create a note first, then share it.'
            : 'You may need to be added as a collaborator by the canvas owner.'
        })
        navigate('/dashboard')
      } catch (err) {
        console.error('Error checking access:', err)
        toast.error('Failed to load canvas')
        navigate('/dashboard')
      } finally {
        setLoading(false)
        checkingRef.current = false
      }
    }

    checkAccess()
  }, [noteId, user, authLoading])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!hasAccess) {
    return null
  }

  return (
    <CanvasEditor
      noteId={noteId}
      onClose={() => navigate('/dashboard')}
    />
  )
}

