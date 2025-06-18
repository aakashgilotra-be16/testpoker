import React from 'react';

interface VotingCardsProps {
  deck: string[];
  selectedVote: string;
  loading: boolean;
  votesRevealed: boolean;
  onVoteSubmit: (value: string) => void;
}

export const VotingCards: React.FC<VotingCardsProps> = ({
  deck,
  selectedVote,
  loading,
  votesRevealed,
  onVoteSubmit,
}) => {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-13 gap-3 mb-6">
      {deck.map((value) => (
        <button
          key={value}
          onClick={() => onVoteSubmit(value)}
          disabled={loading || votesRevealed}
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
  );
};