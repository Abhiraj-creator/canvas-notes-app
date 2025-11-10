import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, LogOut, PenTool, FileText, Image } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useNotes } from '../hooks/useNotes'
import { useStore } from '../store/useStore'
import { useNavigate } from 'react-router-dom'
import { NotesList } from '../components/NotesList'
import { NoteEditor } from '../components/NoteEditor'
import { CanvasEditor } from '../components/CanvasEditor'
import { ThemeToggle } from '../components/ThemeToggle'
import { StatsCard } from '../components/StatsCard'
import { SearchBar } from '../components/SearchBar'
import { FilterSort } from '../components/FilterSort'
import toast from 'react-hot-toast'
import { initScrollAnimations } from '../utils/animations'

export const Dashboard = () => {
  const [showEditor, setShowEditor] = useState(false)
  const [showCanvas, setShowCanvas] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('updated')
  const [filterBy, setFilterBy] = useState('all')
  const { user, signOut } = useAuth()
  const { notes, createNote } = useNotes()
  const { selectedNote, setSelectedNote } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    initScrollAnimations()
  }, [])

  // Close editor/canvas if selected note is deleted
  useEffect(() => {
    if (!selectedNote) {
      setShowEditor(false)
      setShowCanvas(false)
    }
  }, [selectedNote])

  // Calculate stats
  const totalNotes = notes.length
  const notesWithCanvas = notes.filter((note) => {
    return note.canvas_data && 
      (note.canvas_data.elements?.length > 0 || Object.keys(note.canvas_data).length > 0)
  }).length
  const recentNotes = notes.filter((note) => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return new Date(note.updated_at) > weekAgo
  }).length

  // Get user display name
  const getUserDisplayName = () => {
    if (user?.user_metadata?.name) return user.user_metadata.name
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name
    return user?.email?.split('@')[0] || 'User'
  }

  const handleCreateNote = async () => {
    const { data, error } = await createNote({
      title: 'New Note',
      content: '',
      canvas_data: null,
    })

    if (!error && data) {
      setSelectedNote(data)
      setShowEditor(true)
    }
  }

  const handleNoteSelect = (note) => {
    setSelectedNote(note)
    setShowEditor(true)
  }

  const handleOpenCanvas = (note = null) => {
    const noteToUse = note || selectedNote
    if (!noteToUse) {
      toast.error('Please select or create a note first')
      return
    }
    setSelectedNote(noteToUse)
    setShowCanvas(true)
  }

  const handleCreateNoteWithCanvas = async () => {
    const { data, error } = await createNote({
      title: 'New Canvas',
      content: '',
      canvas_data: null,
    })

    if (!error && data) {
      setSelectedNote(data)
      setShowCanvas(true)
    }
  }

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (!error) {
      navigate('/login')
      toast.success('Signed out successfully')
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-[#1a1a1a] shadow-sm sticky top-0 z-40 transition-colors duration-300 border-b border-black dark:border-[#333333]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-black dark:text-white">
                Notes App
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreateNoteWithCanvas}
                className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-[#1a1a1a] text-white rounded-lg hover:bg-[#1a1a1a] dark:hover:bg-[#2a2a2a] border border-black dark:border-[#333333] transition-colors"
                title="New Canvas"
              >
                <PenTool className="w-5 h-5" />
                <span className="hidden sm:inline">Canvas</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreateNote}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-[#1a1a1a] border border-black dark:border-[#333333] transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">New Note</span>
              </motion.button>
              <ThemeToggle />
              <div className="flex items-center gap-2">
                <span className="text-sm text-black dark:text-[#cccccc] hidden sm:inline">
                  {user?.email}
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSignOut}
                  className="p-2 text-black dark:text-[#cccccc] hover:text-[#333333] dark:hover:text-white transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-black dark:text-white mb-2">
            Welcome back, {getUserDisplayName()}! 👋
          </h2>
          <p className="text-black dark:text-[#cccccc]">
            {new Date().getHours() < 12
              ? 'Good morning'
              : new Date().getHours() < 18
              ? 'Good afternoon'
              : 'Good evening'}
            {', here\'s what\'s happening with your notes'}
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            icon={FileText}
            title="Total Notes"
            value={totalNotes}
            color="primary"
          />
          <StatsCard
            icon={PenTool}
            title="With Canvas"
            value={notesWithCanvas}
            color="primary"
          />
          <StatsCard
            icon={Image}
            title="Recent Notes"
            value={recentNotes}
            color="primary"
          />
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6 space-y-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search notes by title or content..."
          />
          <FilterSort
            sortBy={sortBy}
            onSortChange={setSortBy}
            filterBy={filterBy}
            onFilterChange={setFilterBy}
          />
        </div>

        {/* Notes List */}
        <NotesList
          onNoteSelect={handleNoteSelect}
          onOpenCanvas={handleOpenCanvas}
          searchQuery={searchQuery}
          sortBy={sortBy}
          filterBy={filterBy}
        />
      </main>

      {/* Note Editor */}
      {showEditor && selectedNote && (
        <NoteEditor
          note={selectedNote}
          onClose={() => {
            setShowEditor(false)
            setSelectedNote(null)
          }}
          onOpenCanvas={(note) => {
            setSelectedNote(note)
            setShowEditor(false)
            setShowCanvas(true)
          }}
        />
      )}

      {/* Canvas Editor */}
      {showCanvas && selectedNote && (
        <CanvasEditor
          noteId={selectedNote.id}
          onClose={() => setShowCanvas(false)}
        />
      )}

      {/* Page Transition Overlay */}
      <div className="page-transition fixed inset-0 bg-black opacity-0 pointer-events-none z-50"></div>
    </div>
  )
}
