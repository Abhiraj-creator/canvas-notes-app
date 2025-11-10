import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, X, PenTool } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useNotes } from '../hooks/useNotes'
import toast from 'react-hot-toast'

export const NoteEditor = ({ note, onClose, onOpenCanvas }) => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const { updateNote } = useNotes()

  useEffect(() => {
    if (note) {
      setTitle(note.title || '')
      setContent(note.content || '')
    }
  }, [note])

  const handleSave = async () => {
    if (!note) return

    const updates = {
      title: title.trim() || 'Untitled Note',
      content: content.trim(),
      updated_at: new Date().toISOString(),
    }

    const { error } = await updateNote(note.id, updates)
    if (!error) {
      toast.success('Note saved')
    }
  }

  if (!note) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 h-full w-full md:w-1/2 lg:w-2/5 bg-white dark:bg-[#1a1a1a] shadow-2xl z-50 flex flex-col border-l border-black dark:border-[#333333]"
    >
      <div className="flex items-center justify-between p-4 border-b border-black dark:border-[#333333]">
        <h2 className="text-xl font-bold text-black dark:text-white">Edit Note</h2>
        <div className="flex gap-2">
          {onOpenCanvas && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (onOpenCanvas) {
                  onOpenCanvas(note)
                }
              }}
              className="p-2 bg-black dark:bg-[#1a1a1a] text-white rounded-lg hover:bg-[#1a1a1a] dark:hover:bg-[#2a2a2a] border border-black dark:border-[#333333] transition-colors"
              title="Open Canvas"
            >
              <PenTool className="w-5 h-5" />
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSave}
            className="p-2 bg-black text-white rounded-lg hover:bg-[#1a1a1a] border border-black dark:border-[#333333] transition-colors"
            title="Save Note"
          >
            <Save className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 bg-white dark:bg-[#1a1a1a] text-black dark:text-white rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] border border-black dark:border-[#333333] transition-colors"
            title="Close Editor"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="w-full text-2xl font-bold bg-transparent border-none outline-none text-black dark:text-white mb-4 placeholder-black dark:placeholder-[#999999]"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing..."
          className="w-full h-full bg-transparent border-none outline-none text-black dark:text-[#cccccc] resize-none placeholder-black dark:placeholder-[#999999]"
        />
      </div>
    </motion.div>
  )
}
