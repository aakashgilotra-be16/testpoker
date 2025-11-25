import { useState, useEffect } from 'react';
import { Download, LogOut, Users, Zap, Wifi, WifiOff, RefreshCw, ArrowLeft } from 'lucide-react';
import { useSocket } from './hooks/useSocket';
import { AuthModal } from './components/AuthModal';
import { AppSelector } from './components/AppSelector';
import { RetrospectiveApp } from './components/RetrospectiveApp';
import { StoryModal } from './components/StoryModal';
import { BulkStoryModal } from './components/BulkStoryModal';
import { VotingSession } from './components/VotingSession';
import { ExportModal } from './components/ExportModal';
import { StoryManager } from './components/StoryManager';
import { ToastProvider } from './context/ToastContext';
import RoomManager from './components/RoomManager';
import RoomPage from './components/RoomPage';

interface Story {
  id: string;
  title: string;
  description: string;
  final_points: string | null;
  created_at: string;
  updated_at: string;
}

// Home page component for non-room access
function HomePage({ onBackToRooms }: { onBackToRooms?: () => void }) {
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
  const [selectedApp, setSelectedApp] = useState<'estimation' | 'retrospective' | null>(null);
  const [showAppSelector, setShowAppSelector] = useState(false);

  useEffect(() => {
    // Show app selector first if no app is selected
    if (!selectedApp) {
      setShowAppSelector(true);
    } else if (!user) {
      // Show auth modal after app selection
      setShowAuthModal(true);
    }
  }, [user, selectedApp]);

  // Find active voting session to auto-show to all users
  useEffect(() => {
    // Get all active voting sessions
    const activeSessions = Object.entries(votingSessions)
      .filter(([_, session]) => session?.isActive)
      .map(([storyId, session]) => ({ storyId, session }));
    
    console.log(`Found ${activeSessions.length} active voting sessions`);
    
    if (activeSessions.length > 0) {
      // Sort by creation time to get the most recent one
      activeSessions.sort((a, b) => 
        new Date(b.session.createdAt).getTime() - new Date(a.session.createdAt).getTime()
      );
      
      // Get the most recently created session
      const mostRecentSession = activeSessions[0];
      
      // Find the corresponding story object
      const storyToVoteOn = stories.find(s => s.id === mostRecentSession.storyId);
      
      if (storyToVoteOn) {
        console.log(`Active voting session detected for "${storyToVoteOn.title}". Showing modal to all users.`);
        // Set the voting story to automatically show the modal to all users
        setVotingStory(storyToVoteOn);
      }
    }
  }, [votingSessions, stories]);

  // Close voting modal when the session is no longer active
  useEffect(() => {
    if (votingStory) {
      const session = votingSessions[votingStory.id];
      // If there's no session for this story or the session is no longer active
      if (!session || !session.isActive) {
        console.log(`Voting session for "${votingStory.title}" is no longer active. Closing modal.`);
        setVotingStory(null);
      }
    }
  }, [votingSessions, votingStory]);

  // Debug log of voting sessions in votingSessions object
  useEffect(() => {
    console.log('Current voting sessions:', Object.entries(votingSessions).map(([id, session]) => ({
      id,
      storyId: session?.storyId,
      isActive: session?.isActive,
      createdAt: session?.createdAt
    })));
  }, [votingSessions]);

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
    console.log(`App: Saving points "${points}" for story ID: ${storyId}`);
    await actions.saveStoryPoints(storyId, points);
    
    // Force close the voting modal
    if (votingStory && votingStory.id === storyId) {
      console.log(`App: Closing voting modal for story ID: ${storyId}`);
      setVotingStory(null);
    }
  };

  const handleEditStory = (story: Story) => {
    setEditingStory(story);
    setShowStoryModal(true);
  };

  const handleStartVoting = (story: Story) => {
    // We don't need to explicitly set votingStory here because our useEffect will detect
    // the active voting session and show the modal to all users automatically
    // when the server sends the 'voting_session_started' event
    console.log(`Starting voting session for: ${story.title} (ID: ${story.id})`);
    actions.startVotingSession(story.id);
  };

  const handleStoryModalClose = () => {
    setShowStoryModal(false);
    setEditingStory(null);
  };

  const handleSignOut = async () => {
    // Properly reset all application state instead of using window.location.reload()
    try {
      // Disconnect from socket and reset state
      actions.disconnect();
      
      // Reset all local state
      setShowAuthModal(false);
      setShowStoryModal(false);
      setShowBulkStoryModal(false);
      setShowExportModal(false);
      setEditingStory(null);
      setVotingStory(null);
      setSelectedApp(null);
      setShowAppSelector(true);
      
    } catch (error) {
      console.error('Error during sign out:', error);
      // Only fallback to reload if there's an actual error
      window.location.reload();
    }
  };

  const handleCreateStoryClick = () => {
    setEditingStory(null);
    setShowStoryModal(true);
  };

  const handleBulkImportClick = () => {
    setShowBulkStoryModal(true);
  };

  const handleAppSelect = (appType: 'estimation' | 'retrospective') => {
    setSelectedApp(appType);
    setShowAppSelector(false);
    // Auth modal will be shown automatically by useEffect
  };

  const handleBackToSelector = () => {
    // For solo mode, go back to rooms
    if (onBackToRooms) {
      onBackToRooms();
      return;
    }
    
    // For room mode, reset state
    setSelectedApp(null);
    setShowAppSelector(true);
    
    // Reset other modal states
    setShowAuthModal(false);
    setShowStoryModal(false);
    setShowBulkStoryModal(false);
    setShowExportModal(false);
    setEditingStory(null);
    setVotingStory(null);
    
    // If user exists, disconnect them from the current session
    // They'll need to re-authenticate when selecting a new app
    if (user) {
      actions.disconnect();
    }
  };

  if (!connected) {
    return (
      <ToastProvider>
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
      </ToastProvider>
    );
  }

  // Show app selector first (before authentication)
  if (showAppSelector) {
    return (
      <ToastProvider>
        <AppSelector onSelectApp={handleAppSelect} />
      </ToastProvider>
    );
  }

  // Show retrospective app if selected
  if (selectedApp === 'retrospective' && user) {
    return (
      <ToastProvider>
        <RetrospectiveApp user={user} onBackToSelector={handleBackToSelector} />
      </ToastProvider>
    );
  }

  // Show estimation app (original planning poker) if selected or as default
  return (
    <ToastProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={handleBackToSelector}
                className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to app selector"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Planning Poker</h1>
                <p className="text-sm text-gray-600">Team Estimation Made Easy</p>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">      <StoryManager
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
          actions.joinSession(displayName);
          setShowAuthModal(false);
        }}
        selectedApp={selectedApp || undefined}
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
          onClose={() => {
            console.log(`App: Explicitly closing voting modal for story: "${votingStory?.title}"`);
            setVotingStory(null);
          }}
          onSavePoints={handleSaveStoryPoints}
          actions={actions}
        />
      )}
    </div>
    </ToastProvider>
  );
}

// Main App component with simple URL-based routing
function App() {
  const [currentPage, setCurrentPage] = useState<'rooms' | 'room' | 'solo'>('rooms');
  const [roomId, setRoomId] = useState<string | null>(null);

  // Simple URL-based routing
  useEffect(() => {
    const path = window.location.pathname;
    
    if (path.startsWith('/room/')) {
      const extractedRoomId = path.split('/')[2];
      if (extractedRoomId) {
        setRoomId(extractedRoomId);
        setCurrentPage('room');
      } else {
        setCurrentPage('rooms');
      }
    } else if (path === '/solo') {
      setCurrentPage('solo');
    } else {
      // Default to rooms page
      setCurrentPage('rooms');
      if (path !== '/rooms' && path !== '/') {
        window.history.pushState({}, '', '/rooms');
      }
    }
  }, []);

  // Navigation helpers
  const navigateToRooms = () => {
    setCurrentPage('rooms');
    setRoomId(null);
    window.history.pushState({}, '', '/rooms');
  };

  const navigateToRoom = (id: string) => {
    setCurrentPage('room');
    setRoomId(id);
    window.history.pushState({}, '', `/room/${id}`);
  };

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      
      if (path.startsWith('/room/')) {
        const extractedRoomId = path.split('/')[2];
        if (extractedRoomId) {
          setRoomId(extractedRoomId);
          setCurrentPage('room');
        } else {
          setCurrentPage('rooms');
        }
      } else if (path === '/solo') {
        setCurrentPage('solo');
      } else {
        setCurrentPage('rooms');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <ToastProvider>
      {currentPage === 'rooms' && <RoomManager onRoomJoin={navigateToRoom} />}
      {currentPage === 'room' && roomId && (
        <RoomPage 
          roomId={roomId} 
          onBackToRooms={navigateToRooms}
        />
      )}
      {currentPage === 'solo' && <HomePage onBackToRooms={navigateToRooms} />}
    </ToastProvider>
  );
}

export default App;