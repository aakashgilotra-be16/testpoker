import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Wifi, WifiOff } from 'lucide-react';
import { RetrospectiveApp } from './RetrospectiveApp';
import { useSocket } from '../hooks/useSocket';
import { AuthModal } from './AuthModal';

interface RoomRetrospectiveProps {
  room: any;
  userName: string;
  onBackToApps: () => void;
  onLeaveRoom: () => void;
}

export default function RoomRetrospective({ room, userName, onBackToApps, onLeaveRoom }: RoomRetrospectiveProps) {
  const { connected, user, connectedUsers, error, actions } = useSocket();
  const [showAuthModal, setShowAuthModal] = useState(false);

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

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
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
            className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Joining Room</h3>
            <p className="text-gray-600 mb-4">Setting up your retrospective session...</p>
          </div>
        </div>
        
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
          selectedApp="retrospective"
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Custom Header for Room Context */}
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
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Retrospective</h1>
                <p className="text-sm text-gray-600">{room.name}</p>
              </div>
            </div>
            
            {/* Connection status and room info */}
            <div className="flex items-center space-x-4">
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

              <div className="flex items-center text-sm text-gray-600">
                <Users className="w-4 h-4 mr-1" />
                <span className="font-medium">{user.displayName}</span>
              </div>
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

      {/* Retrospective App Content */}
      <div className="pt-0">
        <RetrospectiveApp 
          user={user} 
          onBackToSelector={onLeaveRoom}
        />
      </div>
    </div>
  );
}
