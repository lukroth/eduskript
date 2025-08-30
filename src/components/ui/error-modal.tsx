'use client'

import { AlertTriangle, XCircle, Info, RefreshCw } from 'lucide-react'
import { Button } from './button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'

export interface ErrorDetails {
  status: number
  statusText: string
  message: string
  endpoint?: string
  timestamp: Date
}

interface ErrorModalProps {
  isOpen: boolean
  onClose: () => void
  error: ErrorDetails
  variant?: 'error' | 'warning' | 'info'
  showRetry?: boolean
  showDontShowAgain?: boolean
  onRetry?: () => void
  onDontShowAgain?: () => void
}

const variantConfig = {
  error: {
    icon: XCircle,
    iconColor: 'text-destructive',
    title: 'Error Occurred'
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
    title: 'Warning'
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    title: 'Information'
  }
}

export function ErrorModal({
  isOpen,
  onClose,
  error,
  variant = 'error',
  showRetry = false,
  showDontShowAgain = false,
  onRetry,
  onDontShowAgain
}: ErrorModalProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  const getErrorTitle = () => {
    switch (error.status) {
      case 401:
        return 'Authentication Required'
      case 403:
        return 'Access Denied'
      case 404:
        return 'Content Not Found'
      case 422:
        return 'Validation Error'
      case 429:
        return 'Too Many Requests'
      default:
        return config.title
    }
  }

  const getErrorMessage = () => {
    // If a custom message is provided, use it
    if (error.message && error.message !== error.statusText) {
      return error.message
    }

    // Otherwise, provide user-friendly messages based on status code
    switch (error.status) {
      case 401:
        return 'Your session has expired. Please log in again to continue.'
      case 403:
        return 'You don&apos;t have permission to perform this action. Please contact an administrator if you believe this is an error.'
      case 404:
        return 'The requested content could not be found. It may have been moved or deleted.'
      case 422:
        return 'The request contains invalid data. Please check your input and try again.'
      case 429:
        return 'You\'re making too many requests. Please wait a moment and try again.'
      default:
        return error.message || `An unexpected error occurred (${error.status}: ${error.statusText})`
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
            <DialogTitle>{getErrorTitle()}</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {getErrorMessage()}
          </DialogDescription>
          
          {error.endpoint && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">
                <strong>Endpoint:</strong> {error.endpoint}
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Status:</strong> {error.status} {error.statusText}
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Time:</strong> {error.timestamp.toLocaleString()}
              </p>
            </div>
          )}
        </DialogHeader>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {showDontShowAgain && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDontShowAgain}
              className="text-xs"
            >
              Don't show again this session
            </Button>
          )}
          
          <div className="flex gap-2 ml-auto">
            {showRetry && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            )}
            
            <Button onClick={onClose}>
              {error.status === 401 ? 'Log In' : 'OK'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}