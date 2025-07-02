import React from 'react';

// Spinner component for loading states
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg', className?: string }> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`inline-block animate-spin rounded-full border-4 border-solid border-current border-r-transparent ${sizeClasses[size]} ${className}`} role="status">
      <span className="sr-only">Loading...</span>
    </div>
  );
};

// Skeleton component for content placeholders
export const Skeleton: React.FC<{
  width?: string;
  height?: string;
  className?: string;
  rounded?: boolean;
}> = ({ width = 'w-full', height = 'h-4', className = '', rounded = false }) => {
  return (
    <div 
      className={`bg-gray-200 dark:bg-gray-700 animate-pulse ${width} ${height} ${
        rounded ? 'rounded-full' : 'rounded'
      } ${className}`}
    />
  );
};

// Loading overlay for full-screen or container-level loading
export const LoadingOverlay: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center">
        <Spinner size="lg" className="text-blue-500 mb-4" />
        <p className="text-gray-700 dark:text-gray-300">{message}</p>
      </div>
    </div>
  );
};

// Loading button that shows a spinner when loading
export const LoadingButton: React.FC<{
  isLoading: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}> = ({ 
  isLoading, 
  children, 
  onClick, 
  disabled = false, 
  className = '', 
  type = 'button' 
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`relative px-4 py-2 rounded transition-all ${className} ${
        disabled || isLoading ? 'opacity-70 cursor-not-allowed' : ''
      }`}
    >
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size="sm" className="text-current" />
        </span>
      )}
      <span className={isLoading ? 'invisible' : ''}>{children}</span>
    </button>
  );
};

// Toast notification component
export const Toast: React.FC<{
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
}> = ({ message, type = 'info', onClose }) => {
  const typeClasses = {
    success: 'bg-green-100 border-green-500 text-green-700',
    error: 'bg-red-100 border-red-500 text-red-700',
    info: 'bg-blue-100 border-blue-500 text-blue-700',
  };

  return (
    <div 
      className={`fixed bottom-4 right-4 p-4 rounded border-l-4 shadow-md animate-slide-in-right ${typeClasses[type]}`}
    >
      <div className="flex justify-between items-center">
        <p>{message}</p>
        {onClose && (
          <button 
            onClick={onClose}
            className="ml-4 text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
};

// Pulsating dot for indicating activity
export const PulsingDot: React.FC<{ color?: string }> = ({ color = 'bg-green-500' }) => {
  return (
    <span className={`inline-block w-2 h-2 rounded-full animate-pulse ${color}`}></span>
  );
};
