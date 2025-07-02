import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, RotateCcw, Save, Users, Clock, Timer, Settings, ArrowLeft } from 'lucide-react';
import { Spinner, LoadingButton, PulsingDot } from './ui/LoadingStates';
import { useToast } from '../context/ToastContext';

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
  const [submitLoading, setSubmitLoading] = useState(false);
  const [revealLoading, setRevealLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const { showToast } = useToast();

  // Find user's vote
  useEffect(() => {
    if (user && votes) {
      const userVote = votes.find(vote => 
        // Try to match by userId first, then by displayName
        (vote.userId && user.id && vote.userId === user.id) || 
        vote.displayName === user.displayName
      );
      
      // Only update if we have a different vote value or no selected vote yet
      if (userVote && (userVote.voteValue !== '?' || !selectedVote)) {
        console.log(`Found user's vote: ${userVote.voteValue}`);
        setSelectedVote(userVote.voteValue);
      }
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

  // Log which story is being shown in the voting modal
  useEffect(() => {
    console.log(`Voting modal shown for story: "${story.title}" (ID: ${story.id})`);
    
    // Log session details if available
    if (session) {
      console.log(`Session details:`, {
        sessionId: session.id,
        storyId: session.storyId,
        isActive: session.isActive,
        deckType: session.deckType,
        votesRevealed: session.votesRevealed
      });
    }
    
    // Log connected users and votes for debugging
    console.log(`Connected users (${connectedUsers.length}):`, 
      connectedUsers.map(u => u.displayName));
    
    console.log(`Current votes (${votes.length}):`, 
      votes.map(v => ({ user: v.displayName, value: session?.votesRevealed ? v.voteValue : '?' })));
    
  }, [story, session, connectedUsers, votes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log(`VotingSession component unmounting for story: "${story.title}"`);
    };
  }, [story]);

  // Auto-reveal votes when all users have voted
  useEffect(() => {
    if (!session || session.votesRevealed || !votes.length || !connectedUsers.length) {
      return;
    }

    try {
      // Check if all connected users have voted by comparing userIds
      // First make sure we have valid userId values in both votes and connectedUsers
      const usersWhoVoted = new Set(
        votes
          .filter(vote => vote.userId && vote.userId !== 'unknown')
          .map(vote => vote.userId)
      );
      
      // Count how many connected users have voted
      let voteCount = 0;
      
      // If we have valid userIds, compare them
      if (usersWhoVoted.size > 0) {
        connectedUsers.forEach(user => {
          if (usersWhoVoted.has(user.id)) {
            voteCount++;
          }
        });
      } else {
        // Fallback to counting by display names if we don't have userIds
        const namesWhoVoted = new Set(votes.map(vote => vote.displayName.toLowerCase()));
        connectedUsers.forEach(user => {
          if (namesWhoVoted.has(user.displayName.toLowerCase())) {
            voteCount++;
          }
        });
      }
      
      // Fallback to simple count comparison if matching logic fails
      const allVoted = voteCount === connectedUsers.length || votes.length >= connectedUsers.length;
      
      if (allVoted) {
        console.log(`All users have voted (${voteCount}/${connectedUsers.length}). Auto-revealing votes.`);
        if (user?.isStoryCreator) {
          // Only the story creator should trigger the reveal to avoid multiple reveals
          actions.revealVotes(story.id, true);
        }
      } else {
        console.log(`Waiting for more votes: ${voteCount}/${connectedUsers.length} users have voted.`);
      }
    } catch (error) {
      console.error("Error in auto-reveal votes logic:", error);
    }
  }, [session, votes, connectedUsers, user, story.id, actions]);

  const handleSubmitVote = (value: string) => {
    if (!session || session.votesRevealed) return;
    setSubmitLoading(true);
    try {
      // Immediately update the UI to show the selected vote
      setSelectedVote(value);
      actions.submitVote(story.id, value);
      showToast('Your vote has been submitted', 'success');
    } catch (error) {
      console.error('Error submitting vote:', error);
      showToast('Failed to submit vote. Please try again.', 'error');
    } finally {
      setTimeout(() => setSubmitLoading(false), 500);
    }
  };

  const handleSavePoints = async () => {
    if (!finalPoints.trim()) return;
    setSaveLoading(true);
    try {
      console.log(`Saving points "${finalPoints}" for story ID: ${story.id}`);
      await onSavePoints(story.id, finalPoints.trim());
      showToast(`Points saved: ${finalPoints}`, 'success');
      
      // End the voting session explicitly
      if (session) {
        console.log(`Ending voting session for story ID: ${story.id}`);
        actions.endVotingSession(story.id);
      }
      
      // Force close the modal
      onClose();
    } catch (error) {
      console.error('Error saving points:', error);
      showToast('Failed to save points. Please try again.', 'error');
    } finally {
      setSaveLoading(false);
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
              onClick={(e) => {
                e.preventDefault();
                console.log("Closing waiting modal via back button");
                onClose();
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Back to Stories
            </button>
          </div>
        </div>
      </div>
    );
  }

  const deck = session ? DECK_PRESETS[session.deckType as keyof typeof DECK_PRESETS] : DECK_PRESETS.fibonacci;
  const stats = calculateStats();
  const isTimerActive = session?.timerStartedAt && timeRemaining !== null && timeRemaining > 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center">
            <button
              onClick={(e) => {
                e.preventDefault();
                console.log("Closing modal via back button");
                onClose();
              }}
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
            onClick={(e) => {
              e.preventDefault();
              console.log("Closing modal via X button");
              onClose();
            }}
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
                <span className="font-medium">
                  {votes.length} / {connectedUsers.length} votes
                  {votes.length > 0 && (
                    <span className="ml-2">
                      ({Math.round((votes.length / connectedUsers.length) * 100)}%)
                    </span>
                  )}
                </span>
              </div>
              
              {/* Progress bar */}
              {session && !session.votesRevealed && connectedUsers.length > 0 && (
                <div className="flex-1 max-w-xs">
                  <div className="flex items-center mb-1 justify-between text-xs">
                    <span className="text-gray-600">
                      {votes.length} of {connectedUsers.length} voted
                    </span>
                    <span className={votes.length === connectedUsers.length ? 'text-green-600 font-bold' : 'text-blue-600'}>
                      {Math.round((votes.length / connectedUsers.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        votes.length === connectedUsers.length 
                          ? 'bg-green-500 animate-pulse' 
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.round((votes.length / connectedUsers.length) * 100))}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
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

                {!isTimerActive && session && !session.votesRevealed && (
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
                  onClick={() => {
                    setRevealLoading(true);
                    try {
                      actions.revealVotes(story.id, session ? !session.votesRevealed : true);
                      showToast(session.votesRevealed ? 'Votes are now hidden' : 'Votes revealed', 'info');
                    } catch (error) {
                      console.error('Error toggling vote visibility:', error);
                      showToast('Failed to toggle vote visibility', 'error');
                    } finally {
                      setTimeout(() => setRevealLoading(false), 500);
                    }
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center"
                  disabled={revealLoading}
                >
                  {revealLoading ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : session && session.votesRevealed ? (
                    <EyeOff className="w-4 h-4 mr-2" />
                  ) : (
                    <Eye className="w-4 h-4 mr-2" />
                  )}
                  {session && session.votesRevealed ? 'Hide Votes' : 'Reveal Votes'}
                </button>

                <button
                  onClick={() => {
                    setResetLoading(true);
                    try {
                      actions.resetVoting(story.id);
                      showToast('Voting has been reset', 'info');
                    } catch (error) {
                      console.error('Error resetting votes:', error);
                      showToast('Failed to reset voting', 'error');
                    } finally {
                      setTimeout(() => setResetLoading(false), 500);
                    }
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium flex items-center"
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  )}
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
                {connectedUsers.map((participant, index) => {
                  // Check if this user has voted - try userId first, fallback to displayName
                  const hasVoted = votes.some(vote => 
                    (vote.userId && participant.id && vote.userId === participant.id) || 
                    (vote.displayName.toLowerCase() === participant.displayName.toLowerCase())
                  );
                  
                  return (
                    <span
                      key={participant.id || index}
                      className={`px-2 py-1 rounded-full text-xs flex items-center ${
                        hasVoted 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      } ${
                        participant.isStoryCreator ? 'font-medium' : ''
                      }`}
                    >
                      {hasVoted ? (
                        <PulsingDot color="bg-green-500" />
                      ) : (
                        <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      )}
                      <span className="ml-1.5">
                        {participant.displayName}
                        {participant.isStoryCreator && (
                          <span className="ml-1 text-xs font-medium">(Creator)</span>
                        )}
                      </span>
                      {hasVoted && session && !session.votesRevealed && (
                        <span className="ml-1 text-xs text-green-600">✓</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Show message when votes are revealed but no votes exist */}
          {session.votesRevealed && votes.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
              <p className="text-yellow-800 text-center">
                No votes have been cast yet. Ask team members to submit their votes first.
              </p>
            </div>
          )}

          {/* Voting Cards */}
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-13 gap-3 mb-6">
            {deck.map((value) => (
              <button
                key={value}
                onClick={() => handleSubmitVote(value)}
                disabled={(session && session.votesRevealed) || submitLoading}
                className={`aspect-[3/4] rounded-lg border-2 font-bold text-lg transition-all duration-200 ${
                  selectedVote === value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg scale-105'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:scale-105'
                } disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden`}
              >
                {submitLoading && selectedVote === value ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-blue-100/80">
                    <Spinner size="sm" className="text-blue-600" />
                  </div>
                ) : null}
                {value}
                {selectedVote === value && !submitLoading && (
                  <span className="absolute bottom-1 right-1 text-xs text-green-600 animate-pulse">✓</span>
                )}
              </button>
            ))}
          </div>

          {/* Vote Results */}
          {session && session.votesRevealed && votes.length > 0 && (
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
                  <LoadingButton
                    onClick={handleSavePoints}
                    isLoading={saveLoading}
                    disabled={!finalPoints.trim()}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Points
                  </LoadingButton>
                </div>
              )}
            </div>
          )}

          {/* Waiting for votes or all votes received notification */}
          {session && !session.votesRevealed && (
            <>
              {votes.length > 0 && votes.length >= connectedUsers.length ? (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
                  <p className="text-green-800 text-center font-medium">
                    {user?.isStoryCreator ? (
                      <>All team members have voted! Revealing votes automatically...</>
                    ) : (
                      <>All team members have voted! Waiting for Story Creator to reveal votes...</>
                    )}
                  </p>
                </div>
              ) : votes.length > 0 ? (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                  <p className="text-blue-800 text-center">
                    Waiting for {connectedUsers.length - votes.length} more team members to vote...
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
                  <p className="text-yellow-800 text-center">
                    No votes have been cast yet. Select a card to submit your vote.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};