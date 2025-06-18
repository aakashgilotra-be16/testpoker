import React, { useState } from 'react';
import { Edit2, Trash2, Play, FileText, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Story {
  id: string;
  title: string;
  description: string;
  final_points: string | null;
  created_at: string;
}

interface StoryCardProps {
  story: Story;
  isStoryCreator: boolean;
  onEdit: (story: Story) => void;
  onDelete: (id: string) => void;
  onStartVoting: (story: Story) => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  isStoryCreator,
  onEdit,
  onDelete,
  onStartVoting,
}) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this story?')) return;
    
    setLoading(true);
    try {
      await onDelete(story.id);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
            {story.title}
          </h3>
          {story.description && (
            <p className="text-gray-600 text-sm line-clamp-2 mb-3">
              {story.description}
            </p>
          )}
          <div className="flex items-center text-xs text-gray-500 space-x-4">
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {formatDate(story.created_at)}
            </div>
            {story.final_points && (
              <div className="flex items-center">
                <FileText className="w-3 h-3 mr-1" />
                <span className="font-medium text-blue-600">{story.final_points} points</span>
              </div>
            )}
          </div>
        </div>
        
        {story.final_points && (
          <div className="ml-4 flex-shrink-0">
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {story.final_points}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => onStartVoting(story)}
          className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm font-medium flex items-center"
        >
          <Play className="w-4 h-4 mr-2" />
          Start Voting
        </button>

        {isStoryCreator && (
          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => onEdit(story)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit story"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Delete story"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};