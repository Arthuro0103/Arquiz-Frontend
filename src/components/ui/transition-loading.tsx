'use client'

import React from 'react'
import { RefreshCw, Play, Pause, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TransitionLoadingProps {
  type: 'starting' | 'pausing' | 'ending' | 'joining' | 'redirecting'
  message?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const getLoadingConfig = (type: TransitionLoadingProps['type']) => {
  switch (type) {
    case 'starting':
      return {
        icon: Play,
        defaultMessage: 'Starting quiz...',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      }
    case 'pausing':
      return {
        icon: Pause,
        defaultMessage: 'Pausing quiz...',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      }
    case 'ending':
      return {
        icon: Square,
        defaultMessage: 'Ending quiz...',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      }
    case 'joining':
      return {
        icon: RefreshCw,
        defaultMessage: 'Joining room...',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      }
    case 'redirecting':
      return {
        icon: RefreshCw,
        defaultMessage: 'Redirecting...',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
      }
    default:
      return {
        icon: RefreshCw,
        defaultMessage: 'Loading...',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200'
      }
  }
}

const getSizeConfig = (size: TransitionLoadingProps['size']) => {
  switch (size) {
    case 'sm':
      return {
        container: 'p-3',
        icon: 'h-4 w-4',
        text: 'text-sm'
      }
    case 'lg':
      return {
        container: 'p-8',
        icon: 'h-8 w-8',
        text: 'text-lg'
      }
    default:
      return {
        container: 'p-6',
        icon: 'h-6 w-6',
        text: 'text-base'
      }
  }
}

export const TransitionLoading: React.FC<TransitionLoadingProps> = ({
  type,
  message,
  className,
  size = 'md'
}) => {
  const config = getLoadingConfig(type)
  const sizeConfig = getSizeConfig(size)
  const Icon = config.icon

  return (
    <div 
      className={cn(
        'flex items-center justify-center rounded-lg border transition-all duration-300',
        config.bgColor,
        config.borderColor,
        sizeConfig.container,
        className
      )}
      data-testid={`transition-loading-${type}`}
    >
      <div className="flex items-center space-x-3">
        <Icon className={cn(sizeConfig.icon, config.color, 'animate-spin')} />
        <span className={cn(sizeConfig.text, config.color, 'font-medium')}>
          {message || config.defaultMessage}
        </span>
      </div>
    </div>
  )
}

export const FullPageTransitionLoading: React.FC<TransitionLoadingProps> = ({
  type,
  message,
  className
}) => {
  const config = getLoadingConfig(type)
  const Icon = config.icon

  return (
    <div 
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm',
        config.bgColor,
        className
      )}
      data-testid={`full-page-transition-loading-${type}`}
    >
      <div className={cn(
        'rounded-xl border-2 shadow-lg p-8 max-w-md w-full mx-4',
        'bg-white',
        config.borderColor
      )}>
        <div className="flex flex-col items-center space-y-4">
          <Icon className={cn('h-12 w-12', config.color, 'animate-spin')} />
          <div className="text-center space-y-2">
            <h3 className={cn('text-xl font-semibold', config.color)}>
              {message || config.defaultMessage}
            </h3>
            <p className="text-gray-600 text-sm">
              Please wait while we process your request...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TransitionLoading 