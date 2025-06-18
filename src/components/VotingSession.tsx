import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, RotateCcw, Save, Users, Clock, Timer, Settings, ArrowLeft } from 'lucide-react';

interface Story {
  id: string;
  title: string;
  description: string;
}

interface User {
  id: string;
  displayName: string;
  isStoryCreator: boolean;
  joinedAt: string;
}

interface Vote {
  id: string;
  storyId: string;
  userId: string;
  displayName: string;
  voteValue: string;
  submittedAt: string;
}

interface VotingSession {
  id: string;
  storyId: string;
  deckType: string;
  isActive: boolean;
  votesRevealed: boolean;
  timerDuration: number;
  timerStartedAt: string | null;
  createdBy: string;
  createdAt: string;
}

interface VotingSessionProps {
  story: Story;
  session: VotingSession | null;
  votes: Vote[];
  user: User | null;
  connectedUsers: User[];
  onClose: () => void;
  onSavePoints: (storyId: string, points: string) => void;
  actions: {
    submitVote: (storyId: string, value: string) => void;
    startTimer: (storyId: string, duration: number) => void;
    stopTimer: (storyId: string) => void;
    revealVotes: (storyId: string, revealed: boolean) => void;
    resetVoting: (storyId: string) => void;
    changeDeckType: (storyId: string, deckType: string) => void;
    endVotingSession: (storyId: string) => void;
  };
}

const DECK_PRESETS = {
  fibonacci: ['0', '½', '1', '2', '3', '5', '8', '13', '21', '34', '55', '?', '☕'],
  powersOfTwo: ['1', '2', '4', '8', '16', '32', '64', '?', '☕'],
  tshirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'],
};

export const VotingSession: React.FC<VotingSessionProps> = ({
  story,
  session,
  votes,
  user,
  connectedUsers,
  onClose,
  onSavePoints,
  actions,
}) => {
  const [selectedVote, setSelectedVote] = useState<string>('');
  const [finalPoints, setFinalPoints] = useState('');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [timerDuration, setTimerDuration] = useState(60);

  // Find user's vote
  useEffect(() => {
    if (user && votes) {
      const userVote = votes.find(vote => vote.displayName === user.displayName);
      setSelectedVote(userVote?.voteValue || '');
    }
  }, [votes, user]);

  // Timer effect
  useEffect(() => {
    if (!session?.timerStartedAt) {
      setTimeRemaining(null);
      return;
    }

    const startTime = new Date(session.timerStartedAt).getTime();
    const duration = session.timerDuration * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, duration - elapsed);
      
      setTimeRemaining(Math.ceil(remaining / 1000));

      if (remaining <= 0 && user?.isStoryCreator) {
        actions.revealVotes(story.id, true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [session?.timerStartedAt, session?.timerDuration, user?.isStoryCreator, story.id, actions]);

  const handleSubmitVote = (value: string) => {
    if (!session || session.votesRevealed) return;
    actions.submitVote(story.id, value);
    setSelectedVote(value);
  };

  const handleSavePoints = async () => {
    if (!finalPoints.trim()) return;
    try {
      await onSavePoints(story.id, finalPoints.trim());
      onClose();
    } catch (error) {
      console.error('Error saving points:', error);
    }
  };

  const calculateStats = () => {
    const numericVotes = votes
      .filter(vote => !isNaN(Number(vote.voteValue)))
      .map(vote => Number(vote.voteValue));

    if (numericVotes.length === 0) return null;

    const mean = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
    const sorted = numericVotes.sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    return { mean: mean.toFixed(1), median: median.toString() };
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!session) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-orange-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Waiting for Session</h3>
          <p className="text-gray-600 mb-6">
            A Story Creator needs to start the voting session for this story.
          </p>
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={onClose}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Back to Stories
            </button>
          </div>
        </div>
      </div>
    );
  }

  const deck = DECK_PRESETS[session.deckType as keyof typeof DECK_PRESETS];
  const stats = calculateStats();
  const isTimerActive = session.timerStartedAt && timeRemaining !== null && timeRemaining > 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center">
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition-colors mr-3"
              title="Back to stories"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">{story.title}</h2>
              <p className="text-gray-600 text-sm">{story.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timer and Controls */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center text-gray-600">
                <Users className="w-5 h-5 mr-2" />
                <span className="font-medium">{votes.length} votes • {connectedUsers.length} online</span>
              </div>
              
              {isTimerActive && (
                <div className={`flex items-center font-bold text-lg ${
                  timeRemaining! <= 10 ? 'text-red-600' : 'text-blue-600'
                }`}>
                  <Timer className="w-5 h-5 mr-2" />
                  <span>{formatTime(timeRemaining!)}</span>
                </div>
              )}

              <div className="flex items-center text-gray-600">
                <Clock className="w-5 h-5 mr-2" />
                <span className="font-medium">
                  {session.votesRevealed ? 'Votes Revealed' : 'Voting in Progress'}
                </span>
              </div>
            </div>

            {user?.isStoryCreator && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium flex items-center"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Settings
                </button>

                {!isTimerActive && !session.votesRevealed && (
                  <button
                    onClick={() => actions.startTimer(story.id, timerDuration)}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center"
                  >
                    <Timer className="w-4 h-4 mr-2" />
                    Start Timer ({timerDuration}s)
                  </button>
                )}

                {isTimerActive && (
                  <button
                    onClick={() => actions.stopTimer(story.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium flex items-center"
                  >
                    <Timer className="w-4 h-4 mr-2" />
                    Stop Timer
                  </button>
                )}

                <button
                  onClick={() => actions.revealVotes(story.id, !session.votesRevealed)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center"
                >
                  {session.votesRevealed ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Hide Votes
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Reveal Votes
                    </>
                  )}
                </button>

                <button
                  onClick={() => actions.resetVoting(story.id)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium flex items-center"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Settings Panel */}
          {showSettings && user?.isStoryCreator && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Session Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deck Type
                  </label>
                  <select
                    value={session.deckType}
                    onChange={(e) => actions.changeDeckType(story.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="fibonacci">Fibonacci</option>
                    <option value="powersOfTwo">Powers of 2</option>
                    <option value="tshirt">T-Shirt Sizes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timer Duration (seconds)
                  </label>
                  <select
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                    <option value={120}>2 minutes</option>
                    <option value={300}>5 minutes</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Participants List */}
          {connectedUsers.length > 0 && (
            <div className="bg-white p-3 rounded-lg border border-gray-200 mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Online Participants ({connectedUsers.length})</h4>
              <div className="flex flex-wrap gap-2">
                {connectedUsers.map((participant, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  >
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                    {participant.displayName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Voting Cards */}
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-13 gap-3 mb-6">
            {deck.map((value) => (
              <button
                key={value}
                onClick={() => handleSubmitVote(value)}
                disabled={session.votesRevealed}
                className={`aspect-[3/4] rounded-lg border-2 font-bold text-lg transition-all duration-200 ${
                  selectedVote === value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg scale-105'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:scale-105'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {value}
              </button>
            ))}
          </div>

          {/* Vote Results */}
          {session.votesRevealed && votes.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Votes Cast ({votes.length})</h4>
                  <div className="space-y-2">
                    {votes.map((vote) => (
                      <div key={vote.id} className="flex items-center justify-between">
                        <span className="text-gray-700">{vote.displayName}</span>
                        <span className="font-bold text-blue-600">{vote.voteValue}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {stats && (
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">Statistics</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Mean</span>
                        <span className="font-bold text-green-600">{stats.mean}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Median</span>
                        <span className="font-bold text-green-600">{stats.median}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {user?.isStoryCreator && (
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={finalPoints}
                    onChange={(e) => setFinalPoints(e.target.value)}
                    placeholder="Enter final story points..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleSavePoints}
                    disabled={!finalPoints.trim()}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Points
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Show message when votes are revealed but no votes exist */}
          {session.votesRevealed && votes.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-yellow-800 text-center">
                No votes have been cast yet. Ask team members to submit their votes first.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};