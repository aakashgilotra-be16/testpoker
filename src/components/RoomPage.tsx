import { useState, useEffect } from 'react';
import { AppSelector } from './AppSelector';
import RoomPlanningPoker from './RoomPlanningPoker';
import RoomRetrospective from './RoomRetrospective';

interface RoomPageProps {
  roomId: string;
  onBackToRooms?: () => void;
}

export default function RoomPage({ roomId, onBackToRooms }: RoomPageProps) {
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedApp, setSelectedApp] = useState<'estimation' | 'retrospective' | null>(null);
  const [userName, setUserName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  useEffect(() => {
    if (!roomId) {
      onBackToRooms?.();
      return;
    }

    // Check for existing user data
    const savedUserName = localStorage.getItem('planningPoker_userName');
    const savedUserId = localStorage.getItem('planningPoker_userId');
    const savedRoomId = localStorage.getItem('planningPoker_roomId');

    if (savedUserName && savedUserId && savedRoomId === roomId) {
      setUserName(savedUserName);
      loadRoomData();
    } else {
      setShowNamePrompt(true);
      setLoading(false);
    }
  }, [roomId]);

  const loadRoomData = async () => {
    try {
      setLoading(true);
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/rooms/${roomId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();

      if (data.success) {
        setRoom(data.room);
        setError('');
      } else {
        setError(data.error || 'Room not found');
      }
    } catch (err) {
      setError('Failed to load room. Please check your connection.');
      console.error('Load room error:', err);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (name: string) => {
    try {
      setLoading(true);
      const userId = 'user_' + Math.random().toString(36).substr(2, 9);
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

      const response = await fetch(`${backendUrl}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          name: name.trim(),
          displayName: name.trim(),
          role: 'participant'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('planningPoker_userName', name.trim());
        localStorage.setItem('planningPoker_userId', userId);
        localStorage.setItem('planningPoker_roomId', roomId!);
        
        setUserName(name.trim());
        setRoom(data.room);
        setShowNamePrompt(false);
        setError('');
      } else {
        setError(data.error || 'Failed to join room');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Join room error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      joinRoom(userName.trim());
    }
  };

  const copyShareUrl = () => {
    const shareUrl = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      // Could add a toast notification here
      alert('Room URL copied to clipboard!');
    });
  };

  const leaveRoom = () => {
    localStorage.removeItem('planningPoker_userName');
    localStorage.removeItem('planningPoker_userId');
    localStorage.removeItem('planningPoker_roomId');
    onBackToRooms?.();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading room...</p>
        </div>
      </div>
    );
  }

  if (showNamePrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Room</h1>
            <p className="text-gray-600">Room: <span className="font-mono font-semibold">{roomId}</span></p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={50}
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!userName.trim() || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => onBackToRooms?.()}
              className="text-gray-600 hover:text-gray-800 text-sm transition duration-200"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Room Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => onBackToRooms?.()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (room && !selectedApp) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Room Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{room.name}</h1>
                {room.description && (
                  <p className="text-gray-600 mb-4">{room.description}</p>
                )}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Room: <span className="font-mono font-semibold">{room.id}</span></span>
                  <span>•</span>
                  <span>{room.participants?.length || 0} participants</span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={copyShareUrl}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition duration-200 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Share
                </button>
                
                <button
                  onClick={leaveRoom}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition duration-200"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>

          {/* App Selection */}
          <AppSelector onSelectApp={setSelectedApp} />
        </div>
      </div>
    );
  }

  // When an app is selected, render that app's component
  if (selectedApp === 'estimation') {
    return (
      <RoomPlanningPoker
        room={room}
        userName={userName}
        onBackToApps={() => setSelectedApp(null)}
        onLeaveRoom={leaveRoom}
      />
    );
  }

  if (selectedApp === 'retrospective') {
    return (
      <RoomRetrospective
        room={room}
        userName={userName}
        onBackToApps={() => setSelectedApp(null)}
        onLeaveRoom={leaveRoom}
      />
    );
  }

  // This shouldn't happen, but just in case
  return null;
}
