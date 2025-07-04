import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Play, FileText, Calendar, Users, Upload } from 'lucide-react';

interface Story {
  id: string;
  title: string;
  description: string;
  final_points: string | null;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  displayName: string;
  isStoryCreator: boolean;
  joinedAt: string;
}

interface StoryManagerProps {
  stories: Story[];
  user: User | null;
  onStartVoting: (story: Story) => void;
  onEditStory: (story: Story) => void;
  onDeleteStory: (id: string) => void;
  onCreateStory: () => void;
  onBulkImport: () => void;
  activeVotingStoryId?: string;
}

export const StoryManager: React.FC<StoryManagerProps> = ({
  stories,
  user,
  onStartVoting,
  onEditStory,
  onDeleteStory,
  onCreateStory,
  onBulkImport,
  activeVotingStoryId,
}) => {
  const [selectedStory, setSelectedStory] = useState<string | null>(null);

  // Add guard clause for user authentication
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please sign in to access the story manager.</p>
        </div>
      </div>
    );
  }

  const handleDeleteStory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this story?')) return;
    
    try {
      await onDeleteStory(id);
      if (selectedStory === id) {
        setSelectedStory(null);
      }
    } catch (error) {
      console.error('Error deleting story:', error);
    }
  };

  const handleStartVoting = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    
    const story = stories.find(s => s.id === selectedStory);
    if (story) {
      onStartVoting(story);
    }
  };

  const handleStartVotingForStory = (story: Story, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the story
    onStartVoting(story);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStats = () => {
    const totalStories = stories.length;
    const completedStories = stories.filter(story => story.final_points).length;
    const pendingStories = totalStories - completedStories;
    
    return { totalStories, completedStories, pendingStories };
  };

  const stats = getStats();

  return (
    <div className="space-y-6 relative">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Stories</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStories}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedStories}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
              <Play className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingStories}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Story Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">User Stories</h2>
              <p className="text-gray-600">Manage your backlog and select stories for estimation</p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Start Voting Button - Only visible to story creators */}
              {selectedStory && user?.isStoryCreator && (
                <button
                  onClick={handleStartVoting}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium flex items-center"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Voting Session
                </button>
              )}
              
              {user?.isStoryCreator && (
                <>
                  <button
                    onClick={onBulkImport}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium flex items-center"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Import
                  </button>
                  <button
                    onClick={onCreateStory}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Story
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Selected Story Info - Only shown to story creators */}
          {selectedStory && user?.isStoryCreator && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Selected for voting:</p>
                  <p className="font-medium text-gray-900">"{stories.find(s => s.id === selectedStory)?.title}"</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          {stories.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No stories yet</h3>
              <p className="text-gray-600 mb-6">
                {user?.isStoryCreator 
                  ? "Create your first story to start estimating with your team" 
                  : "Ask a Story Creator to add some stories to get started"
                }
              </p>
              {user?.isStoryCreator && (
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={onBulkImport}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium flex items-center"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Bulk Import Stories
                  </button>
                  <button
                    onClick={onCreateStory}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium flex items-center"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create First Story
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className={`p-4 border rounded-lg transition-all duration-200 cursor-pointer ${
                    activeVotingStoryId === story.id
                      ? 'border-green-500 bg-green-50 shadow-md'
                      : selectedStory === story.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedStory(story.id)}
                >
                  {activeVotingStoryId === story.id && (
                    <div className="mb-2 inline-flex items-center bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                      Active Voting Session
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="selectedStory"
                          checked={selectedStory === story.id}
                          onChange={() => setSelectedStory(story.id)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 mb-1">
                            {story.title}
                          </h3>
                          {story.description && (
                            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
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
                                <span className="font-medium text-blue-600">{story.final_points} points</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {story.final_points && (
                        <div className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          {story.final_points}
                        </div>
                      )}
                      
                      {/* Only show start voting button to story creators (Aakash and Mohith) */}
                      {activeVotingStoryId !== story.id && user?.isStoryCreator && (
                        <button
                          onClick={(e) => handleStartVotingForStory(story, e)}
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Start voting for this story"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      
                      {user?.isStoryCreator && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditStory(story);
                            }}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit story"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStory(story.id);
                            }}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete story"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Remove the Start Voting Button from here */}
        </div>
      </div>
      
      {/* Floating Start Voting Button - Only visible to story creators */}
      {selectedStory && stories.length > 5 && !activeVotingStoryId && user?.isStoryCreator && (
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={handleStartVoting}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-full hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium flex items-center shadow-xl hover:shadow-2xl transform hover:scale-105"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Voting
          </button>
        </div>
      )}
    </div>
  );
};