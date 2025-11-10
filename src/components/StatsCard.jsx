import { motion } from 'framer-motion'

export const StatsCard = ({ icon: Icon, title, value, color = 'primary' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-black dark:border-[#333333]"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-black dark:text-[#cccccc]">{title}</p>
          <p className="text-3xl font-bold text-black dark:text-white mt-2">{value}</p>
        </div>
        <div className="bg-black p-3 rounded-lg border border-black dark:border-[#333333]">
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  )
}
