import React, { useState } from 'react';
import { Save } from 'lucide-react';

interface Vote {
  id: string;
  user_id: string | null;
  display_name: string;
  vote_value: string;
}

interface VotingResultsProps {
  votes: Vote[];
  isStoryCreator: boolean;
  onSavePoints: (points: string) => void;
}

export const VotingResults: React.FC<VotingResultsProps> = ({
  votes,
  isStoryCreator,
  onSavePoints,
}) => {
  const [finalPoints, setFinalPoints] = useState('');

  const calculateStats = () => {
    const numericVotes = votes
      .filter(vote => !isNaN(Number(vote.vote_value)))
      .map(vote => Number(vote.vote_value));

    if (numericVotes.length === 0) return null;

    const mean = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
    const sorted = numericVotes.sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    return { mean: mean.toFixed(1), median: median.toString() };
  };

  const stats = calculateStats();

  const handleSavePoints = () => {
    if (finalPoints.trim()) {
      onSavePoints(finalPoints.trim());
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">Votes Cast</h4>
          <div className="space-y-2">
            {votes.map((vote) => (
              <div key={vote.id} className="flex items-center justify-between">
                <span className="text-gray-700">{vote.display_name}</span>
                <span className="font-bold text-blue-600">{vote.vote_value}</span>
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

      {isStoryCreator && (
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
  );
};