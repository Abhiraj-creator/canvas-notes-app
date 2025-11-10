import { motion, AnimatePresence } from 'framer-motion'
import { NoteCard } from './NoteCard'
import { useNotes } from '../hooks/useNotes'
import { LoadingSpinner } from './LoadingSpinner'
import { FileText } from 'lucide-react'

export const NotesList = ({ onNoteSelect, onOpenCanvas, searchQuery = '', sortBy = 'updated', filterBy = 'all' }) => {
  const { notes, loading, deleteNote } = useNotes()

  if (loading) {
    return <LoadingSpinner />
  }

  // Filter and sort notes
  let filteredNotes = [...notes]

  // Apply search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    filteredNotes = filteredNotes.filter(
      (note) =>
        note.title?.toLowerCase().includes(query) ||
        note.content?.toLowerCase().includes(query)
    )
  }

  // Apply type filter
  if (filterBy === 'with-canvas') {
    filteredNotes = filteredNotes.filter((note) => {
      const hasCanvas = note.canvas_data && 
        (note.canvas_data.elements?.length > 0 || Object.keys(note.canvas_data).length > 0)
      return hasCanvas
    })
  } else if (filterBy === 'text-only') {
    filteredNotes = filteredNotes.filter((note) => {
      const hasCanvas = note.canvas_data && 
        (note.canvas_data.elements?.length > 0 || Object.keys(note.canvas_data).length > 0)
      return !hasCanvas
    })
  } else if (filterBy === 'recent') {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    filteredNotes = filteredNotes.filter(
      (note) => new Date(note.updated_at) > weekAgo
    )
  }

  // Apply sorting
  filteredNotes.sort((a, b) => {
    if (sortBy === 'updated') {
      return new Date(b.updated_at) - new Date(a.updated_at)
    } else if (sortBy === 'created') {
      return new Date(b.created_at) - new Date(a.created_at)
    } else if (sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '')
    }
    return 0
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      <AnimatePresence>
        {filteredNotes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onSelect={onNoteSelect}
            onDelete={deleteNote}
            onOpenCanvas={onOpenCanvas}
          />
        ))}
      </AnimatePresence>
      {filteredNotes.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="col-span-full text-center py-16"
        >
          <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">
            {searchQuery ? 'No notes found' : notes.length === 0 ? 'No notes yet' : 'No notes match your filters'}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            {searchQuery
              ? 'Try a different search term'
              : notes.length === 0
              ? 'Create your first note to get started!'
              : 'Try adjusting your filters'}
          </p>
        </motion.div>
      )}
    </div>
  )
}
