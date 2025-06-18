import React from 'react';
import { X, ArrowLeft } from 'lucide-react';

interface Story {
  id: string;
  title: string;
  description: string;
}

interface VotingHeaderProps {
  story: Story;
  onClose: () => void;
}

export const VotingHeader: React.FC<VotingHeaderProps> = ({ story, onClose }) => {
  return (
    <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
      <div className="flex items-center">
        <button
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition-colors mr-3"
          title="Back to stories"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">{story.title}</h2>
          <p className="text-gray-600 text-sm">{story.description}</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};