import { Moon, Sun } from 'lucide-react'
import { useStore } from '../store/useStore'
import { animateThemeTransition } from '../utils/animations'
import { motion } from 'framer-motion'

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useStore()

  const handleToggle = () => {
    animateThemeTransition(() => {
      toggleTheme()
    })
  }

  return (
    <motion.button
      onClick={handleToggle}
      className="relative p-2 rounded-full bg-[#1a1a1a] dark:bg-[#1a1a1a] border border-[#333333] transition-colors duration-300"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{ rotate: theme === 'dark' ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-white" />
        ) : (
          <Moon className="w-5 h-5 text-white" />
        )}
      </motion.div>
    </motion.button>
  )
}
