import React from 'react';
import { Clock, RefreshCw } from 'lucide-react';

interface WaitingForSessionProps {
  onRetry: () => void;
  onClose: () => void;
}

export const WaitingForSession: React.FC<WaitingForSessionProps> = ({
  onRetry,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 text-center max-w-md">
        <div className="w-16 h-16 bg-orange-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <Clock className="w-8 h-8 text-orange-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Waiting for Session</h3>
        <p className="text-gray-600 mb-6">
          A Story Creator needs to start the voting session for this story.
        </p>
        <div className="flex items-center justify-center space-x-3">
          <button
            onClick={onRetry}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Again
          </button>
          <button
            onClick={onClose}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Back to Stories
          </button>
        </div>
      </div>
    </div>
  );
};