import { useState } from 'react';

interface RoomManagerProps {
  onRoomCreated?: (roomId: string) => void;
  onRoomJoined?: (roomId: string) => void;
  onRoomJoin?: (roomId: string) => void; // Alternative naming
}

export default function RoomManager({ onRoomCreated, onRoomJoined, onRoomJoin }: RoomManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateUserId = () => {
    return 'user_' + Math.random().toString(36).substr(2, 9);
  };

  const createRoom = async () => {
    if (!roomName.trim() || !userName.trim()) {
      setError('Room name and your name are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hostId: generateUserId(),
          name: roomName.trim(),
          description: roomDescription.trim(),
          settings: {
            deckType: 'fibonacci',
            allowSpectators: true,
            allowChangeVote: true
          }
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
        localStorage.setItem('planningPoker_userName', userName.trim());
        localStorage.setItem('planningPoker_userId', data.room.hostId);
        localStorage.setItem('planningPoker_roomId', data.room.id);
        
        onRoomCreated?.(data.room.id);
        onRoomJoin?.(data.room.id);
      } else {
        setError(data.error || 'Failed to create room');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Create room error:', err);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!roomCode.trim() || !userName.trim()) {
      setError('Room code and your name are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userId = generateUserId();
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      
      // First check if room exists
      const checkResponse = await fetch(`${backendUrl}/api/rooms/${roomCode.toUpperCase()}`);
      
      if (!checkResponse.ok) {
        throw new Error(`HTTP error! status: ${checkResponse.status}`);
      }

      const contentType = checkResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await checkResponse.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned non-JSON response');
      }

      const checkData = await checkResponse.json();

      if (!checkData.success) {
        setError('Room not found. Please check the room code.');
        setLoading(false);
        return;
      }

      // Join the room
      const joinResponse = await fetch(`${backendUrl}/api/rooms/${roomCode.toUpperCase()}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          name: userName.trim(),
          displayName: userName.trim(),
          role: 'participant'
        }),
      });

      if (!joinResponse.ok) {
        throw new Error(`HTTP error! status: ${joinResponse.status}`);
      }

      const joinContentType = joinResponse.headers.get('content-type');
      if (!joinContentType || !joinContentType.includes('application/json')) {
        const text = await joinResponse.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned non-JSON response');
      }

      const joinData = await joinResponse.json();

      if (joinData.success) {
        localStorage.setItem('planningPoker_userName', userName.trim());
        localStorage.setItem('planningPoker_userId', userId);
        localStorage.setItem('planningPoker_roomId', roomCode.toUpperCase());
        
        onRoomJoined?.(roomCode.toUpperCase());
        onRoomJoin?.(roomCode.toUpperCase());
      } else {
        setError(joinData.error || 'Failed to join room');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Join room error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatRoomCode = (value: string) => {
    // Allow only alphanumeric characters and convert to uppercase
    const formatted = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return formatted.slice(0, 6); // Limit to 6 characters
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AgileTeam Hub</h1>
          <p className="text-gray-600">Planning Poker & Retrospectives</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!isCreating && !isJoining && (
          <div className="space-y-4">
            <button
              onClick={() => setIsCreating(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Room
            </button>
            
            <button
              onClick={() => setIsJoining(true)}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Join Existing Room
            </button>
          </div>
        )}

        {isCreating && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Room</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Room Name</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Sprint Planning, Daily Standup, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
              <textarea
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
                placeholder="Brief description of the session"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={createRoom}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                {loading ? 'Creating...' : 'Create Room'}
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {isJoining && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Join Room</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Room Code</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(formatRoomCode(e.target.value))}
                placeholder="ABC123"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
                maxLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">Enter the 6-character room code</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={joinRoom}
                disabled={loading || roomCode.length !== 6}
                className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                {loading ? 'Joining...' : 'Join Room'}
              </button>
              <button
                onClick={() => setIsJoining(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200"
              >
                Back
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Create rooms for Planning Poker sessions and Retrospectives
          </p>
        </div>
      </div>
    </div>
  );
}
