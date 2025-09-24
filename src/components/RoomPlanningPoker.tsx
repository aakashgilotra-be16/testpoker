import { useState, useEffect } from 'react';
import { Download, LogOut, Users, Zap, Wifi, WifiOff, ArrowLeft } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { AuthModal } from './AuthModal';
import { StoryModal } from './StoryModal';
import { BulkStoryModal } from './BulkStoryModal';
import { VotingSession } from './VotingSession';
import { ExportModal } from './ExportModal';
import { StoryManager } from './StoryManager';
import type { Story, Room, User } from '../types';
import type { LegacyStory, CompatibleStory } from '../types/legacy';
import '../styles/components/planning-poker.css';

interface RoomPlanningPokerProps {
  room: Room;
  userName: string;
  onBackToApps: () => void;
  onLeaveRoom: () => void;
}

export default function RoomPlanningPoker({ room, userName, onBackToApps, onLeaveRoom }: RoomPlanningPokerProps) {
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
    // Auto-authenticate with the room user data using room-based join
    if (!user && userName && room?.id) {
      // Get stored user data
      const savedUserId = localStorage.getItem('planningPoker_userId');
      const savedUserName = localStorage.getItem('planningPoker_userName');
      
      if (savedUserId && savedUserName) {
        // Use room-based join instead of legacy join
        actions.joinRoom(room.id, savedUserId, savedUserName, userName, 'participant');
      } else {
        setShowAuthModal(true);
      }
    }
  }, [user, userName, room?.id, actions]);

  // Find active voting session to auto-show to all users
  useEffect(() => {
    const activeSessions = Object.entries(votingSessions)
      .filter(([_, session]) => session?.isActive)
      .map(([storyId, session]) => ({ storyId, session }));
    
    if (activeSessions.length > 0) {
      activeSessions.sort((a, b) => 
        new Date(b.session.createdAt).getTime() - new Date(a.session.createdAt).getTime()
      );
      
      const mostRecentSession = activeSessions[0];
      const storyToVoteOn = stories.find(s => s.id === mostRecentSession.storyId);
      
      if (storyToVoteOn) {
        setVotingStory(storyToVoteOn);
      }
    }
  }, [votingSessions, stories]);

  // Close voting modal when the session is no longer active
  useEffect(() => {
    if (votingStory) {
      const session = votingSessions[votingStory.id];
      if (!session || !session.isActive) {
        setVotingStory(null);
      }
    }
  }, [votingSessions, votingStory]);

  const handleCreateStory = async (storyData: { title: string; description: string }) => {
    actions.createStory(storyData.title, storyData.description);
  };

  const handleBulkCreateStories = async (storiesData: Array<{ title: string; description: string }>) => {
    actions.bulkCreateStories(storiesData);
  };

  const handleUpdateStory = async (storyData: { title: string; description: string }) => {
    if (!editingStory) return;
    actions.updateStory(editingStory.id, storyData.title, storyData.description);
    setEditingStory(null);
  };

  const handleDeleteStory = async (id: string) => {
    actions.deleteStory(id);
  };

  const handleSaveStoryPoints = async (storyId: string, points: string) => {
    await actions.saveStoryPoints(storyId, points);
    
    if (votingStory && votingStory.id === storyId) {
      setVotingStory(null);
    }
  };

  const handleEditStory = (story: Story) => {
    setEditingStory(story);
    setShowStoryModal(true);
  };

  const handleStartVoting = (story: Story) => {
    actions.startVotingSession(story.id);
  };

  const handleStoryModalClose = () => {
    setShowStoryModal(false);
    setEditingStory(null);
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
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry Connection
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
              <button
                onClick={onBackToApps}
                className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to apps"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Planning Poker</h1>
                <p className="text-sm text-gray-600">{room.name}</p>
              </div>
            </div>
            
            {/* Connection status indicator */}
            <div className="mr-4">
              <div className={`rounded-full px-2 py-1 text-xs font-medium flex items-center ${
                connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800 animate-pulse'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-1 ${
                  connected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span>{connected ? 'Connected' : connectionStatus}</span>
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
                    onClick={onLeaveRoom}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Leave room"
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
          activeVotingStoryId={votingStory?.id}
        />
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onJoin={(displayName) => {
          // Use room-based join instead of legacy join
          const userId = 'user_' + Math.random().toString(36).substr(2, 9);
          
          // Store user data for persistence
          localStorage.setItem('planningPoker_userId', userId);
          localStorage.setItem('planningPoker_userName', displayName);
          localStorage.setItem('planningPoker_roomId', room?.id || '');
          
          // Join the room via socket
          actions.joinRoom(room?.id || '', userId, displayName, displayName, 'participant');
          setShowAuthModal(false);
        }}
        selectedApp="estimation"
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
          connected={connected}
          onClose={() => setVotingStory(null)}
          onSavePoints={handleSaveStoryPoints}
          actions={actions}
        />
      )}
    </div>
  );
}
