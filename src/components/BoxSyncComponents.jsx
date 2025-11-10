import React from 'react'

/**
 * Box Sync Status Indicator Component
 * Shows real-time sync status, progress, and connection quality
 */
export const BoxSyncStatusIndicator = ({ 
  status, 
  isSyncing, 
  metrics,
  className = ''
}) => {
  const getStatusIcon = () => {
    if (status === 'error') return '❌'
    if (status === 'syncing') return '⏳'
    if (status === 'success') return '✅'
    return '⏸️'
  }

  const getStatusText = () => {
    if (status === 'error') return 'Sync Error'
    if (status === 'syncing') return 'Syncing...'
    if (status === 'success') return 'Synced'
    return 'Not Syncing'
  }

  const getConnectionQualityText = () => {
    if (!metrics?.connectionQuality) return 'Unknown'
    if (metrics.connectionQuality >= 0.9) return 'Excellent'
    if (metrics.connectionQuality >= 0.7) return 'Good'
    if (metrics.connectionQuality >= 0.5) return 'Fair'
    return 'Poor'
  }

  const getConnectionQualityColor = () => {
    if (!metrics?.connectionQuality) return 'text-gray-400'
    if (metrics.connectionQuality >= 0.9) return 'text-green-500'
    if (metrics.connectionQuality >= 0.7) return 'text-yellow-500'
    if (metrics.connectionQuality >= 0.5) return 'text-orange-500'
    return 'text-red-500'
  }

  return (
    <div className={`flex items-center space-x-2 text-sm ${className}`}>
      <span className="text-lg">{getStatusIcon()}</span>
      <span className={`font-medium ${
        status === 'error' ? 'text-red-500' : 
        status === 'syncing' ? 'text-blue-500' :
        status === 'success' ? 'text-green-500' : 'text-gray-500'
      }`}>
        {getStatusText()}
      </span>
      {status === 'syncing' && metrics?.syncProgress > 0 && (
        <div className="w-16 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${metrics.syncProgress}%` }}
          />
        </div>
      )}
      {metrics?.connectionQuality && (
        <span className={`text-xs ${getConnectionQualityColor()}`}>
          {getConnectionQualityText()}
        </span>
      )}
    </div>
  )
}

/**
 * Box Sync Error Notification Component
 * Shows error messages with auto-dismiss functionality
 */
export const BoxSyncErrorNotification = ({ 
  className = ''
}) => {
  // This component will be enhanced to work with the feedback system
  // For now, it returns null as the error handling is managed internally
  return null
}