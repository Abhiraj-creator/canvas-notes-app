import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import toast from 'react-hot-toast'

export const useNotes = () => {
  const [loading, setLoading] = useState(false)
  const { user, notes, setNotes, addNote, updateNote, deleteNote, selectedNote, setSelectedNote } = useStore()

  // Fetch notes
  useEffect(() => {
    if (!user) return

    const fetchNotes = async () => {
      setLoading(true)
      console.log('Fetching notes for user:', user.id, user.email)
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        toast.error('Failed to fetch notes')
        console.error('Error fetching notes:', error)
        console.error('Full error details:', JSON.stringify(error, null, 2))
      } else {
        console.log('Fetched notes:', {
          count: data?.length || 0,
          noteIds: data?.map(n => n.id) || [],
          notes: data
        })
        setNotes(data || [])
      }
      setLoading(false)
    }

    fetchNotes()

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            addNote(payload.new)
          } else if (payload.eventType === 'UPDATE') {
            updateNote(payload.new.id, payload.new)
          } else if (payload.eventType === 'DELETE') {
            deleteNote(payload.old.id)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user, setNotes, addNote, updateNote, deleteNote])

  const createNote = async (noteData) => {
    if (!user) {
      console.error('Cannot create note: User not authenticated')
      return { error: 'Not authenticated' }
    }

    console.log('Creating note for user:', user.id, user.email)
    console.log('Note data:', noteData)

    const { data, error } = await supabase
      .from('notes')
      .insert([
        {
          ...noteData,
          user_id: user.id,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating note:', error)
      console.error('Full error details:', JSON.stringify(error, null, 2))
      toast.error('Failed to create note')
      return { error }
    }

    console.log('Note created successfully:', {
      noteId: data?.id,
      title: data?.title,
      userId: data?.user_id
    })
    toast.success('Note created')
    return { data }
  }

  const updateNoteData = async (id, updates) => {
    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      toast.error('Failed to update note')
      return { error }
    }

    return { data }
  }

  const removeNote = async (id) => {
    // Optimistically update UI immediately
    deleteNote(id)
    
    // Clear selected note if it's the one being deleted
    if (selectedNote?.id === id) {
      setSelectedNote(null)
    }
    
    const { error } = await supabase.from('notes').delete().eq('id', id)

    if (error) {
      // If deletion fails, restore the note by refetching
      toast.error('Failed to delete note')
      // Refetch notes to restore state
      const { data } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      if (data) {
        setNotes(data || [])
      }
      return { error }
    }

    toast.success('Note deleted')
    return { error: null }
  }

  return {
    notes,
    loading,
    createNote,
    updateNote: updateNoteData,
    deleteNote: removeNote,
  }
}
