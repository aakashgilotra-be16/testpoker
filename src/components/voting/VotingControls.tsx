import React from 'react';
import { Users, Clock, Timer, Settings, Eye, EyeOff, RotateCcw } from 'lucide-react';

interface VotingControlsProps {
  votesCount: number;
  timeRemaining: number | null;
  votesRevealed: boolean;
  isStoryCreator: boolean;
  timerDuration: number;
  isTimerActive: boolean;
  onShowSettings: () => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onToggleRevealVotes: () => void;
  onResetVoting: () => void;
}

export const VotingControls: React.FC<VotingControlsProps> = ({
  votesCount,
  timeRemaining,
  votesRevealed,
  isStoryCreator,
  timerDuration,
  isTimerActive,
  onShowSettings,
  onStartTimer,
  onStopTimer,
  onToggleRevealVotes,
  onResetVoting,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-6">
        <div className="flex items-center text-gray-600">
          <Users className="w-5 h-5 mr-2" />
          <span className="font-medium">{votesCount} votes</span>
        </div>
        
        {isTimerActive && timeRemaining !== null && (
          <div className={`flex items-center font-bold text-lg ${
            timeRemaining <= 10 ? 'text-red-600' : 'text-blue-600'
          }`}>
            <Timer className="w-5 h-5 mr-2" />
            <span>{formatTime(timeRemaining)}</span>
          </div>
        )}

        <div className="flex items-center text-gray-600">
          <Clock className="w-5 h-5 mr-2" />
          <span className="font-medium">
            {votesRevealed ? 'Votes Revealed' : 'Voting in Progress'}
          </span>
        </div>
      </div>

      {isStoryCreator && (
        <div className="flex items-center space-x-2">
          <button
            onClick={onShowSettings}
            className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium flex items-center"
          >
            <Settings className="w-4 h-4 mr-1" />
            Settings
          </button>

          {!isTimerActive && !votesRevealed && (
            <button
              onClick={onStartTimer}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center"
            >
              <Timer className="w-4 h-4 mr-2" />
              Start Timer ({timerDuration}s)
            </button>
          )}

          {isTimerActive && (
            <button
              onClick={onStopTimer}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium flex items-center"
            >
              <Timer className="w-4 h-4 mr-2" />
              Stop Timer
            </button>
          )}

          <button
            onClick={onToggleRevealVotes}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center"
          >
            {votesRevealed ? (
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
            onClick={onResetVoting}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium flex items-center"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </button>
        </div>
      )}
    </div>
  );
};