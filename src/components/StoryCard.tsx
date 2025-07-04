import React, { useState } from 'react';
import { Edit2, Trash2, Play, FileText, Calendar, Zap } from 'lucide-react';
import { LoadingButton } from '../components/ui/LoadingStates';
import { useToast } from '../context/ToastContext';

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
  isActiveVoting?: boolean;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  isStoryCreator,
  onEdit,
  onDelete,
  onStartVoting,
  isActiveVoting = false,
}) => {
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [votingLoading, setVotingLoading] = useState(false);
  const { showToast } = useToast();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this story?')) return;
    
    setDeleteLoading(true);
    try {
      await onDelete(story.id);
      showToast(`"${story.title}" deleted successfully`, 'success');
    } catch (error) {
      console.error("Error deleting story:", error);
      showToast('Failed to delete story. Please try again.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };
  
  const handleStartVoting = async () => {
    setVotingLoading(true);
    try {
      await onStartVoting(story);
      showToast(`Voting started for "${story.title}"`, 'info');
    } catch (error) {
      console.error("Error starting voting:", error);
      showToast('Failed to start voting. Please try again.', 'error');
    } finally {
      // Add small delay to show the loading state
      setTimeout(() => {
        setVotingLoading(false);
      }, 700);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  // Apply different styles if this story is actively being voted on
  const cardClasses = isActiveVoting
    ? "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300 shadow-md animate-pulse-light"
    : "bg-white hover:shadow-md group";

  return (
    <div className={`rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-300 ${cardClasses} animate-fade-in`}>
      {isActiveVoting && (
        <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full mb-3 inline-flex items-center animate-bounce-light">
          <Zap className="w-3 h-3 mr-1" />
          Active Voting Session
        </div>
      )}
      
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
        <LoadingButton
          isLoading={votingLoading}
          disabled={isActiveVoting}
          onClick={handleStartVoting}
          className={`${isActiveVoting 
            ? 'bg-blue-600 hover:bg-blue-700' 
            : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
          } text-white px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium flex items-center`}
        >
          <Play className="w-4 h-4 mr-2" />
          {isActiveVoting ? 'Voting Active' : 'Start Voting'}
        </LoadingButton>

        {isStoryCreator && (
          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => onEdit(story)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit story"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            
            <LoadingButton
              isLoading={deleteLoading}
              onClick={handleDelete}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Delete story"
            >
              <Trash2 className="w-4 h-4" />
            </LoadingButton>
          </div>
        )}
      </div>
    </div>
  );
};