import React from 'react';

interface VotingSettingsProps {
  isVisible: boolean;
  deckType: string;
  timerDuration: number;
  onDeckTypeChange: (deckType: string) => void;
  onTimerDurationChange: (duration: number) => void;
}

export const VotingSettings: React.FC<VotingSettingsProps> = ({
  isVisible,
  deckType,
  timerDuration,
  onDeckTypeChange,
  onTimerDurationChange,
}) => {
  if (!isVisible) return null;

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
      <h4 className="font-medium text-gray-900 mb-3">Session Settings</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deck Type
          </label>
          <select
            value={deckType}
            onChange={(e) => onDeckTypeChange(e.target.value)}
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
            onChange={(e) => onTimerDurationChange(Number(e.target.value))}
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
  );
};