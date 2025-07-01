'use client'

import React, { Component, ErrorInfo as ReactErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Bug, 
  Clock,
  Copy,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

// Types
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ReactErrorInfo | null;
  errorId: string;
  retryCount: number;
  isExpanded: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ReactErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'global';
  context?: string;
}

// Utility functions
const generateErrorId = () => {
  return Math.random().toString(36).substr(2, 9);
};

const getErrorSeverity = (error: Error): 'low' | 'medium' | 'high' | 'critical' => {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch')) return 'medium';
  if (message.includes('websocket') || message.includes('socket')) return 'medium';
  if (message.includes('auth') || message.includes('permission')) return 'high';
  if (message.includes('memory') || message.includes('maximum call stack')) return 'critical';
  
  return 'low';
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'low': return 'bg-blue-100 text-blue-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'critical': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getErrorIcon = (severity: string) => {
  switch (severity) {
    case 'critical': return '🔥';
    case 'high': return '⚠️';
    case 'medium': return '⚡';
    default: return '🐛';
  }
};

// Error UI Component
const ErrorUI: React.FC<{
  error: Error;
  errorInfo: ReactErrorInfo | null;
  errorId: string;
  retryCount: number;
  isExpanded: boolean;
  level: string;
  context: string;
  onRetry: () => void;
  onGoHome: () => void;
  onToggleExpanded: () => void;
  onCopyError: () => void;
}> = ({
  error,
  errorInfo,
  errorId,
  retryCount,
  isExpanded,
  level,
  context,
  onRetry,
  onGoHome,
  onToggleExpanded,
  onCopyError
}) => {
  const severity = getErrorSeverity(error);
  const severityColor = getSeverityColor(severity);
  const errorIcon = getErrorIcon(severity);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{errorIcon}</div>
            <div className="flex-1">
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>Something went wrong</span>
              </CardTitle>
              <CardDescription>
                An unexpected error occurred in the {context || level}
              </CardDescription>
            </div>
            <Badge className={severityColor}>
              {severity.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Error Summary */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-700 font-medium">
              {error.message || 'An unknown error occurred'}
            </p>
          </div>

          {/* Error Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-500">Error ID:</span>
              <code className="ml-2 bg-gray-100 px-1 rounded">{errorId}</code>
            </div>
            <div>
              <span className="font-medium text-gray-500">Retry Count:</span>
              <span className="ml-2">{retryCount}</span>
            </div>
            <div>
              <span className="font-medium text-gray-500">Context:</span>
              <span className="ml-2">{context || level}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-3 w-3 text-gray-400 mr-1" />
              <span className="text-gray-500 text-xs">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={onRetry}
              variant="default"
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </Button>
            
            <Button 
              onClick={onGoHome}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Home className="h-4 w-4" />
              <span>Go Home</span>
            </Button>
            
            <Button 
              onClick={onCopyError}
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Copy className="h-4 w-4" />
              <span>Copy Error</span>
            </Button>
          </div>

          {/* Technical Details (Expandable) */}
          {errorInfo && (
            <div className="border-t pt-4">
              <Button
                onClick={onToggleExpanded}
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 text-gray-600"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Bug className="h-4 w-4" />
                <span>Technical Details</span>
              </Button>
              
              {isExpanded && (
                <div className="mt-3 space-y-3">
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Stack Trace</h4>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                      {error.stack}
                    </pre>
                  </div>
                  
                  {errorInfo.componentStack && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Component Stack</h4>
                      <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User Guidance */}
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-1">What can you do?</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Try refreshing the page or clicking &ldquo;Try Again&rdquo;</li>
              <li>• Check your internet connection</li>
              <li>• Go back to the home page and try a different action</li>
              <li>• If the problem persists, please report this error</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main Error Boundary Component
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      isExpanded: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
    };
  }

  componentDidCatch(_error: Error, _errorInfo: ReactErrorInfo) {
    // Log error to console or external service
    console.error('ErrorBoundary caught an error:', _error, _errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, index) => key !== prevProps.resetKeys?.[index])) {
        this.resetErrorBoundary();
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: this.state.retryCount + 1,
      isExpanded: false,
    });
  };

  handleRetry = () => {
    const maxRetries = 3;
    
    if (this.state.retryCount >= maxRetries) {
      toast.error('Maximum retry attempts reached', {
        description: 'Please refresh the page or go home',
      });
      return;
    }

    this.resetErrorBoundary();
    
    // Auto-reset after 5 seconds if error persists
    this.resetTimeoutId = window.setTimeout(() => {
      if (this.state.hasError) {
        toast.info('Auto-retry triggered', {
          description: 'Attempting to recover automatically',
        });
        this.resetErrorBoundary();
      }
    }, 5000);
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleToggleExpanded = () => {
    this.setState(prev => ({ isExpanded: !prev.isExpanded }));
  };

  handleCopyError = () => {
    const { error, errorInfo, errorId } = this.state;
    const context = this.props.context || this.props.level || 'component';
    
    const errorText = [
      `Error ID: ${errorId}`,
      `Context: ${context}`,
      `Message: ${error?.message}`,
      `Stack: ${error?.stack}`,
      `Component Stack: ${errorInfo?.componentStack}`,
      `Timestamp: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
    ].join('\n\n');

    navigator.clipboard.writeText(errorText).then(() => {
      toast.success('Error details copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy error details');
    });
  };

  render() {
    const { hasError, error, errorInfo, errorId, retryCount, isExpanded } = this.state;
    const { children, fallback, level = 'component', context = '' } = this.props;

    if (hasError && error) {
      if (fallback) {
        return fallback;
      }

      return (
        <ErrorUI
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          retryCount={retryCount}
          isExpanded={isExpanded}
          level={level}
          context={context}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
          onToggleExpanded={this.handleToggleExpanded}
          onCopyError={this.handleCopyError}
        />
      );
    }

    return children;
  }
}

export default ErrorBoundary;

// Convenient wrapper components
export const PageErrorBoundary: React.FC<{ children: ReactNode; page?: string }> = ({ 
  children, 
  page 
}) => (
  <ErrorBoundary level="page" context={page}>
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode; component?: string }> = ({ 
  children, 
  component 
}) => (
  <ErrorBoundary level="component" context={component}>
    {children}
  </ErrorBoundary>
);

export const GlobalErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="global" context="application" showDetails={true}>
    {children}
  </ErrorBoundary>
); 