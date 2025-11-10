import { Search, X } from 'lucide-react'
import { motion } from 'framer-motion'

export const SearchBar = ({ value, onChange, placeholder = 'Search notes...' }) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black dark:text-[#999999] w-5 h-5" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-3 border border-black dark:border-[#333333] rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-[#666666] focus:border-black dark:focus:border-[#666666] bg-white dark:bg-[#1a1a1a] text-black dark:text-white placeholder-black dark:placeholder-[#999999]"
      />
      {value && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-black dark:text-[#999999] hover:text-[#333333] dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </motion.button>
      )}
    </div>
  )
}
