import React, { useState } from 'react';
import { User, Loader2, AlertCircle, Crown, Users } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (displayName: string) => void;
  selectedApp?: 'estimation' | 'retrospective';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onJoin, selectedApp }) => {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      onJoin(displayName.trim());
    } catch (err: any) {
      setError(err.message || 'Failed to join session');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const trimmedName = displayName.trim().toLowerCase();
  const isStoryCreator = selectedApp !== 'retrospective' && (trimmedName === 'aakash' || trimmedName === 'mohith');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to {selectedApp === 'retrospective' ? 'Retrospective Sessions' : 'Planning Poker'}
          </h2>
          <p className="text-gray-600">Enter your name to join the session</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter your name"
              autoFocus
              disabled={loading}
            />
          </div>

          {displayName.trim() && (
            <div className={`p-4 rounded-lg border ${
              selectedApp === 'retrospective'
                ? 'bg-purple-50 border-purple-200'
                : isStoryCreator 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center">
                {selectedApp === 'retrospective' ? (
                  <Users className="w-5 h-5 text-purple-600 mr-2" />
                ) : isStoryCreator ? (
                  <Crown className="w-5 h-5 text-blue-600 mr-2" />
                ) : (
                  <Users className="w-5 h-5 text-gray-600 mr-2" />
                )}
                <div>
                  <p className={`font-medium ${
                    selectedApp === 'retrospective'
                      ? 'text-purple-800'
                      : isStoryCreator ? 'text-blue-800' : 'text-gray-800'
                  }`}>
                    {selectedApp === 'retrospective' 
                      ? 'Team Member' 
                      : isStoryCreator ? 'Story Creator' : 'Team Member'
                    }
                  </p>
                  <p className={`text-sm ${
                    selectedApp === 'retrospective'
                      ? 'text-purple-600'
                      : isStoryCreator ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {selectedApp === 'retrospective'
                      ? 'You can add feedback items and participate in retrospectives'
                      : isStoryCreator 
                        ? 'You can create and manage stories, start voting sessions'
                        : 'You can participate in voting sessions'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !displayName.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Joining...
              </>
            ) : (
              selectedApp === 'retrospective' 
                ? 'Join Retrospective Session'
                : `Join as ${isStoryCreator ? 'Story Creator' : 'Team Member'}`
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> {selectedApp === 'retrospective' 
              ? 'All team members can participate in retrospective sessions and add feedback items.'
              : 'Only "Aakash" and "Mohith" can create and manage stories. Everyone else can participate in voting sessions.'
            }
          </p>
        </div>
      </div>
    </div>
  );
};