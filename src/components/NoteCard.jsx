import { motion } from 'framer-motion'
import { FileText, Calendar, Trash2, Edit2, PenTool } from 'lucide-react'
import { format } from 'date-fns'
import { useStore } from '../store/useStore'

export const NoteCard = ({ note, onSelect, onDelete, onOpenCanvas }) => {
  const { setSelectedNote } = useStore()

  const handleClick = () => {
    setSelectedNote(note)
    if (onSelect) onSelect(note)
  }

  const handleCanvasClick = (e) => {
    e.stopPropagation()
    if (onOpenCanvas) {
      onOpenCanvas(note)
    }
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    if (onDelete) onDelete(note.id)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02, y: -5 }}
      className="bg-white dark:bg-[#1a1a1a] rounded-lg shadow-md p-4 cursor-pointer transition-shadow hover:shadow-xl border border-black dark:border-[#333333]"
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-black dark:text-white" />
          <h3 className="font-semibold text-black dark:text-white truncate">
            {note.title || 'Untitled Note'}
          </h3>
        </div>
        <div className="flex gap-2">
          {note.canvas_data && 
            (note.canvas_data.elements?.length > 0 || 
             Object.keys(note.canvas_data).length > 0) && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleCanvasClick}
              className="p-1 text-black dark:text-[#cccccc] hover:text-[#333333] dark:hover:text-white"
              title="Open Canvas"
            >
              <PenTool className="w-4 h-4" />
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation()
              handleClick()
            }}
            className="p-1 text-black dark:text-[#cccccc] hover:text-[#333333] dark:hover:text-white"
            title="Edit Note"
          >
            <Edit2 className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleDelete}
            className="p-1 text-black dark:text-[#cccccc] hover:text-[#333333] dark:hover:text-white"
            title="Delete Note"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
      <p className="text-sm text-black dark:text-[#cccccc] line-clamp-2 mb-2">
        {note.content || 'No content'}
      </p>
      <div className="flex items-center gap-2 text-xs text-black dark:text-[#999999]">
        <Calendar className="w-3 h-3" />
        <span>{format(new Date(note.updated_at), 'MMM dd, yyyy')}</span>
      </div>
    </motion.div>
  )
}
