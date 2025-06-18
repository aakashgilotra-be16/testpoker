import React, { useState, useEffect } from 'react';
import { Download, LogOut, Users, Zap, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useSocket } from './hooks/useSocket';
import { AuthModal } from './components/AuthModal';
import { StoryModal } from './components/StoryModal';
import { BulkStoryModal } from './components/BulkStoryModal';
import { VotingSession } from './components/VotingSession';
import { ExportModal } from './components/ExportModal';
import { StoryManager } from './components/StoryManager';

interface Story {
  id: string;
  title: string;
  description: string;
  final_points: string | null;
  created_at: string;
  updated_at: string;
}

function App() {
  const {
    connected,
    user,
    stories,
    votingSessions,
    votes,
    connectedUsers,
    error,
    connectionStatus,
    actions
  } = useSocket();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showBulkStoryModal, setShowBulkStoryModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [votingStory, setVotingStory] = useState<Story | null>(null);

  useEffect(() => {
    if (!user) {
      setShowAuthModal(true);
    }
  }, [user]);

  const handleCreateStory = async (storyData: Omit<Story, 'id' | 'created_at' | 'updated_at'>) => {
    actions.createStory(storyData.title, storyData.description);
  };

  const handleBulkCreateStories = async (storiesData: Array<{ title: string; description: string }>) => {
    actions.bulkCreateStories(storiesData);
  };

  const handleUpdateStory = async (storyData: Omit<Story, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editingStory) return;
    actions.updateStory(editingStory.id, storyData.title, storyData.description);
    setEditingStory(null);
  };

  const handleDeleteStory = async (id: string) => {
    actions.deleteStory(id);
  };

  const handleSaveStoryPoints = async (storyId: string, points: string) => {
    actions.saveStoryPoints(storyId, points);
  };

  const handleEditStory = (story: Story) => {
    setEditingStory(story);
    setShowStoryModal(true);
  };

  const handleStartVoting = (story: Story) => {
    setVotingStory(story);
    actions.startVotingSession(story.id);
  };

  const handleStoryModalClose = () => {
    setShowStoryModal(false);
    setEditingStory(null);
  };

  const handleSignOut = async () => {
    window.location.reload(); // Simple way to reset the app state
  };

  const handleCreateStoryClick = () => {
    setEditingStory(null);
    setShowStoryModal(true);
  };

  const handleBulkImportClick = () => {
    setShowBulkStoryModal(true);
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
            <WifiOff className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Issue</h3>
          <p className="text-gray-600 mb-4">
            {error || 'Connecting to the server...'}
          </p>
          
          {/* Connection Status Details */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-left mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Connection Details:</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>Backend URL:</strong> {import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}</div>
              <div><strong>Status:</strong> {connectionStatus}</div>
              {error && <div className="text-red-600"><strong>Error:</strong> {error}</div>}
            </div>
          </div>

          {/* Help Text */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
            <h4 className="font-medium text-yellow-800 mb-2">💡 Troubleshooting Tips:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Render free tier sleeps after 15 minutes</li>
              <li>• First connection may take 30-60 seconds</li>
              <li>• Check if backend is awake: <a href="https://p-poker-p2dg.onrender.com/health" target="_blank" rel="noopener noreferrer" className="underline">Health Check</a></li>
            </ul>
          </div>
          
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center mx-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Planning Poker</h1>
                <p className="text-sm text-gray-600">Team Estimation Made Easy</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center text-sm text-gray-600">
                {connected ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-500 mr-1" />
                    <span className="font-medium text-green-600">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-500 mr-1" />
                    <span className="font-medium text-red-600">Disconnected</span>
                  </>
                )}
                <span className="ml-2 font-medium">
                  {connectedUsers.length} online
                </span>
              </div>

              {user && (
                <>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </button>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-1" />
                    <span className="font-medium">{user.displayName}</span>
                    {user.isStoryCreator && (
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        Story Creator
                      </span>
                    )}
                    {!user.isStoryCreator && (
                      <span className="ml-2 bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                        Team Member
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && connected && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-4 mt-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StoryManager
          stories={stories}
          user={user}
          onStartVoting={handleStartVoting}
          onEditStory={handleEditStory}
          onDeleteStory={handleDeleteStory}
          onCreateStory={handleCreateStoryClick}
          onBulkImport={handleBulkImportClick}
        />
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onJoin={(displayName) => {
          actions.joinSession(displayName);
          setShowAuthModal(false);
        }}
      />

      <StoryModal
        isOpen={showStoryModal}
        onClose={handleStoryModalClose}
        onSave={editingStory ? handleUpdateStory : handleCreateStory}
        story={editingStory}
      />

      <BulkStoryModal
        isOpen={showBulkStoryModal}
        onClose={() => setShowBulkStoryModal(false)}
        onSave={handleBulkCreateStories}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        stories={stories}
      />

      {votingStory && (
        <VotingSession
          story={votingStory}
          session={votingSessions[votingStory.id]}
          votes={votes[votingStory.id] || []}
          user={user}
          connectedUsers={connectedUsers}
          onClose={() => setVotingStory(null)}
          onSavePoints={handleSaveStoryPoints}
          actions={actions}
        />
      )}
    </div>
  );
}

export default App;