import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, UserPlus, X, Mail, Copy, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import toast from 'react-hot-toast'

export const CanvasCollaboration = ({ noteId, onClose }) => {
  const [collaborators, setCollaborators] = useState([])
  const [shareEmail, setShareEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [showShareInput, setShowShareInput] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isNoteOwner, setIsNoteOwner] = useState(false)
  const { user } = useStore()

  // Load collaborators and check if user is note owner
  useEffect(() => {
    if (!noteId || !user) return

    const loadCollaborators = async () => {
      try {
        // Check if user is note owner
        const { data: noteData, error: noteError } = await supabase
          .from('notes')
          .select('user_id')
          .eq('id', noteId)
          .single()

        if (!noteError && noteData) {
          setIsNoteOwner(noteData.user_id === user.id)
        }

        // Load collaborators
        const { data, error } = await supabase
          .from('canvas_collaborators')
          .select('*')
          .eq('note_id', noteId)
          .order('created_at', { ascending: false })

        if (!error && data) {
          setCollaborators(data)
        }
      } catch (err) {
        console.error('Error loading collaborators:', err)
      }
    }

    loadCollaborators()

    // Subscribe to real-time changes
    const subscription = supabase
      .channel(`collaborators-${noteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'canvas_collaborators',
          filter: `note_id=eq.${noteId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            loadCollaborators()
          } else if (payload.eventType === 'DELETE') {
            setCollaborators((prev) => prev.filter((c) => c.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [noteId])

  const handleShare = async () => {
    if (!shareEmail.trim()) {
      toast.error('Please enter an email address')
      return
    }

    setLoading(true)
    try {
      console.log('Adding collaborator:', {
        noteId,
        collaboratorEmail: shareEmail.trim(),
        addedBy: user.id,
        userEmail: user.email
      })

      // Try to find user by email (if they exist in the system)
      // For now, we'll store by email and let them access when they sign up
      const { data: insertData, error: insertError } = await supabase
        .from('canvas_collaborators')
        .insert({
          note_id: noteId,
          collaborator_email: shareEmail.trim(),
          added_by: user.id,
        })
        .select()

      console.log('Insert result:', {
        data: insertData,
        error: insertError,
        success: !insertError && insertData
      })

      if (insertError) {
        console.error('Insert error details:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          fullError: JSON.stringify(insertError, null, 2)
        })
        
        if (insertError.code === '23505') {
          toast.error('User already has access')
        } else if (insertError.code === '42501' || insertError.message?.includes('permission denied')) {
          toast.error('Permission denied. Check RLS policies.')
          console.error('RLS Policy Error - Check canvas_collaborators INSERT policy')
        } else {
          console.error('Insert error:', insertError)
          toast.error(`Failed to share canvas: ${insertError.message || 'Unknown error'}`)
        }
      } else {
        console.log('✅ Collaborator added successfully:', insertData)
        toast.success('Canvas shared successfully')
        setShareEmail('')
        setShowShareInput(false)
        
        // Reload collaborators to show the new one
        const { data: reloadData, error: reloadError } = await supabase
          .from('canvas_collaborators')
          .select('*')
          .eq('note_id', noteId)
          .order('created_at', { ascending: false })
        
        if (!reloadError && reloadData) {
          console.log('Reloaded collaborators:', reloadData)
          setCollaborators(reloadData)
        }
      }
    } catch (err) {
      console.error('Error sharing canvas:', err)
      toast.error('Failed to share canvas')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveCollaborator = async (collaboratorId) => {
    try {
      const { error } = await supabase
        .from('canvas_collaborators')
        .delete()
        .eq('id', collaboratorId)

      if (error) {
        toast.error('Failed to remove collaborator')
      } else {
        toast.success('Collaborator removed')
      }
    } catch (err) {
      console.error('Error removing collaborator:', err)
      toast.error('Failed to remove collaborator')
    }
  }

  const handleCopyLink = () => {
    const shareLink = `${window.location.origin}/canvas/${noteId}`
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 h-full w-full md:w-80 bg-white dark:bg-[#1a1a1a] shadow-2xl z-[100] flex flex-col border-l border-black dark:border-[#333333]"
    >
      <div className="flex items-center justify-between p-4 border-b border-black dark:border-[#333333]">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-black dark:text-white" />
          <h2 className="text-xl font-bold text-black dark:text-white">Collaboration</h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-2 bg-white dark:bg-[#1a1a1a] text-black dark:text-white rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] border border-black dark:border-[#333333] transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Share Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-black dark:text-white">Share Canvas</h3>
            {!showShareInput && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowShareInput(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-black dark:bg-[#1a1a1a] text-white rounded-lg hover:bg-[#1a1a1a] dark:hover:bg-[#2a2a2a] border border-black dark:border-[#333333] transition-colors text-sm"
              >
                <UserPlus className="w-4 h-4" />
                Add User
              </motion.button>
            )}
          </div>

          <AnimatePresence>
            {showShareInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="flex-1 px-3 py-2 border border-black dark:border-[#333333] rounded-lg bg-white dark:bg-[#1a1a1a] text-black dark:text-white placeholder-black dark:placeholder-[#999999] text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleShare()
                      }
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleShare}
                    disabled={loading}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-[#1a1a1a] border border-black dark:border-[#333333] transition-colors disabled:opacity-50 text-sm"
                  >
                    {loading ? '...' : 'Share'}
                  </motion.button>
                </div>
                <button
                  onClick={() => {
                    setShowShareInput(false)
                    setShareEmail('')
                  }}
                  className="text-xs text-black dark:text-[#cccccc] hover:text-[#333333] dark:hover:text-white"
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Copy Link */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-[#1a1a1a] text-black dark:text-white rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] border border-black dark:border-[#333333] transition-colors text-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Share Link
              </>
            )}
          </motion.button>
        </div>

        {/* Collaborators List */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-black dark:text-white">
            Collaborators ({collaborators.length})
          </h3>
          <div className="space-y-2">
            {collaborators.length === 0 ? (
              <p className="text-xs text-black dark:text-[#999999]">No collaborators yet</p>
            ) : (
              collaborators.map((collaborator) => (
                <motion.div
                  key={collaborator.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-2 bg-white dark:bg-[#1a1a1a] rounded-lg border border-black dark:border-[#333333]"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-black dark:bg-[#1a1a1a] border border-black dark:border-[#333333] flex items-center justify-center">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black dark:text-white">
                        {collaborator.collaborator_email || 'Unknown'}
                      </p>
                      {collaborator.added_by === user?.id && (
                        <p className="text-xs text-black dark:text-[#999999]">You added</p>
                      )}
                    </div>
                  </div>
                  {(isNoteOwner || collaborator.added_by === user?.id) && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleRemoveCollaborator(collaborator.id)}
                      className="p-1 text-black dark:text-[#cccccc] hover:text-[#333333] dark:hover:text-white"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

