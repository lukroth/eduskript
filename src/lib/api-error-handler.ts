import { ErrorDetails } from '@/components/ui/error-modal'

// Global reference to the error handler - will be set by ErrorProvider
let globalErrorHandler: ((error: ErrorDetails) => void) | null = null

export function setGlobalErrorHandler(handler: (error: ErrorDetails) => void) {
  globalErrorHandler = handler
}

export function clearGlobalErrorHandler() {
  globalErrorHandler = null
}

// Enhanced fetch wrapper that handles errors globally
export async function apiRequest(url: string, options: RequestInit = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: defaultHeaders,
    })

    // Handle 4xx errors
    if (response.status >= 400 && response.status < 500) {
      let errorMessage = response.statusText
      
      // Try to extract error message from response body
      try {
        const errorData = await response.clone().json()
        if (errorData.error) {
          errorMessage = errorData.error
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
      } catch {
        // If response is not JSON, use statusText
      }

      const errorDetails: ErrorDetails = {
        status: response.status,
        statusText: response.statusText,
        message: errorMessage,
        endpoint: url,
        timestamp: new Date()
      }

      // Show error modal if handler is available
      if (globalErrorHandler) {
        globalErrorHandler(errorDetails)
      }

      // Still throw the error so calling code can handle it if needed
      throw new APIError(errorDetails, response)
    }

    // Handle 5xx errors differently (don't show modal, just throw)
    if (response.status >= 500) {
      throw new APIError({
        status: response.status,
        statusText: response.statusText,
        message: 'Server error occurred',
        endpoint: url,
        timestamp: new Date()
      }, response)
    }

    return response
  } catch (error) {
    // If it's our custom APIError, re-throw it
    if (error instanceof APIError) {
      throw error
    }

    // For network errors, connection issues, etc.
    const errorDetails: ErrorDetails = {
      status: 0,
      statusText: 'Network Error',
      message: 'Unable to connect to the server. Please check your internet connection.',
      endpoint: url,
      timestamp: new Date()
    }

    if (globalErrorHandler) {
      globalErrorHandler(errorDetails)
    }

    throw new APIError(errorDetails)
  }
}

// Custom error class for API errors
export class APIError extends Error {
  public readonly details: ErrorDetails
  public readonly response?: Response

  constructor(details: ErrorDetails, response?: Response) {
    super(details.message)
    this.name = 'APIError'
    this.details = details
    this.response = response
  }
}

// Convenience methods for different HTTP methods
export const api = {
  get: (url: string, options: RequestInit = {}) => 
    apiRequest(url, { ...options, method: 'GET' }),
    
  post: (url: string, data?: any, options: RequestInit = {}) =>
    apiRequest(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  patch: (url: string, data?: any, options: RequestInit = {}) =>
    apiRequest(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  put: (url: string, data?: any, options: RequestInit = {}) =>
    apiRequest(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  delete: (url: string, options: RequestInit = {}) =>
    apiRequest(url, { ...options, method: 'DELETE' }),
}

// Helper to handle JSON responses with error checking
export async function handleJsonResponse<T = any>(response: Response): Promise<T> {
  if (!response.ok) {
    // This should have already been handled by apiRequest, but just in case
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  return data
}