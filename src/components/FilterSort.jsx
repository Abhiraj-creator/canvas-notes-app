import { Filter, ArrowUpDown } from 'lucide-react'
import { motion } from 'framer-motion'

export const FilterSort = ({ sortBy, onSortChange, filterBy, onFilterChange }) => {
  return (
    <div className="flex gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-black dark:text-[#999999]" />
        <select
          value={filterBy}
          onChange={(e) => onFilterChange(e.target.value)}
          className="px-3 py-2 border border-black dark:border-[#333333] rounded-lg bg-white dark:bg-[#1a1a1a] text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-[#666666] focus:border-black dark:focus:border-[#666666]"
        >
          <option value="all">All Notes</option>
          <option value="recent">Recent</option>
          <option value="with-canvas">With Canvas</option>
          <option value="text-only">Text Only</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <ArrowUpDown className="w-4 h-4 text-black dark:text-[#999999]" />
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="px-3 py-2 border border-black dark:border-[#333333] rounded-lg bg-white dark:bg-[#1a1a1a] text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-[#666666] focus:border-black dark:focus:border-[#666666]"
        >
          <option value="updated">Recently Updated</option>
          <option value="created">Recently Created</option>
          <option value="title">Title (A-Z)</option>
        </select>
      </div>
    </div>
  )
}
