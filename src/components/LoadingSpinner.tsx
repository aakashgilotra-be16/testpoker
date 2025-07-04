import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'white' | 'gray';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = 'primary',
  className = ''
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };
  
  const colorClasses = {
    primary: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-500'
  };
  
  return (
    <div className={`${sizeClasses[size]} ${colorClasses[color]} ${className} inline-block animate-spin`} role="status">
      <svg 
        className="w-full h-full" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
};

// Skeletons for content loading
export const StoryCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
          <div className="flex items-center space-x-4">
            <div className="h-3 bg-gray-200 rounded w-20"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
        <div className="ml-4 h-6 w-16 bg-gray-200 rounded-full"></div>
      </div>
      <div className="flex items-center justify-between">
        <div className="h-9 bg-gray-200 rounded-lg w-32"></div>
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
          <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
};

// Toast notification component
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onDismiss }) => {
  const bgColors = {
    success: 'bg-green-100 border-green-400 text-green-800',
    error: 'bg-red-100 border-red-400 text-red-800',
    info: 'bg-blue-100 border-blue-400 text-blue-800'
  };
  
  return (
    <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg border ${bgColors[type]} shadow-lg max-w-md z-50 animate-fade-in-up`}>
      <div className="flex items-center justify-between">
        <p>{message}</p>
        <button 
          onClick={onDismiss} 
          className="ml-4 text-current hover:text-gray-900"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

// Loading overlay for page transitions
export const PageLoadingOverlay: React.FC = () => (
  <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
    <div className="text-center">
      <LoadingSpinner size="large" />
      <p className="mt-4 text-gray-700 font-medium">Loading...</p>
    </div>
  </div>
);

// Button with loading state
interface LoadingButtonProps {
  onClick: (e: React.MouseEvent) => void;
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({ 
  onClick, 
  loading, 
  children, 
  className = '',
  disabled = false
}) => (
  <button
    onClick={onClick}
    disabled={loading || disabled}
    className={`relative ${className}`}
  >
    <span className={loading ? 'invisible' : 'visible'}>
      {children}
    </span>
    {loading && (
      <span className="absolute inset-0 flex items-center justify-center">
        <LoadingSpinner size="small" color="white" />
      </span>
    )}
  </button>
);
