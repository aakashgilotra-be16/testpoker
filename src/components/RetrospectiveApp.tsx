import React, { useState, useEffect } from 'react';
import { Users, Plus, MessageSquare, CheckCircle, AlertCircle, ArrowLeft, Zap, Wifi, WifiOff } from 'lucide-react';
import { useRetrospective } from '../hooks/useRetrospective';

interface RetrospectiveAppProps {
  user: any;
  onBackToSelector: () => void;
}

export const RetrospectiveApp: React.FC<RetrospectiveAppProps> = ({ user, onBackToSelector }) => {
  const {
    connected,
    items,
    session,
    connectedUsers,
    error,
    actions
  } = useRetrospective();

  const [newItemText, setNewItemText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'went-well' | 'to-improve' | 'action-items'>('went-well');

  // Join retrospective session when component mounts
  useEffect(() => {
    if (user && connected) {
      actions.joinRetrospectiveSession(user.displayName);
    }
  }, [user, connected]); // Removed actions from dependencies to prevent re-runs

  const addItem = () => {
    if (!newItemText.trim()) return;
    
    actions.addItem(newItemText.trim(), selectedCategory);
    setNewItemText('');
  };

  const handleVoteItem = (itemId: string) => {
    if (actions.hasUserVoted(itemId)) {
      actions.removeVote(itemId);
    } else {
      actions.voteItem(itemId);
    }
  };

  const getItemsByCategory = (category: string) => {
    return items.filter(item => item.category === category);
  };

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'went-well':
        return { title: 'What Went Well', icon: CheckCircle, color: 'green', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
      case 'to-improve':
        return { title: 'What to Improve', icon: AlertCircle, color: 'red', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
      case 'action-items':
        return { title: 'Action Items', icon: MessageSquare, color: 'blue', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
      default:
        return { title: '', icon: MessageSquare, color: 'gray', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
    }
  };

  const activePhase = session?.phase || 'gather';

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
            <WifiOff className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Issue</h3>
          <p className="text-gray-600 mb-4">
            {error || 'Connecting to the retrospective server...'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={onBackToSelector}
                className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to app selector"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Retrospective Sessions</h1>
                <p className="text-sm text-gray-600">Team Reflection & Improvement</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
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
                <Users className="w-4 h-4 text-purple-500 mr-1" />
                <span className="font-medium">{user?.displayName || 'Anonymous'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Phase Selector */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-4">
            {[
              { id: 'gather', label: 'Gather', description: 'Collect feedback' },
              { id: 'discuss', label: 'Discuss', description: 'Review items' },
              { id: 'vote', label: 'Vote', description: 'Prioritize' },
              { id: 'action', label: 'Action', description: 'Plan next steps' }
            ].map((phase) => (
              <button
                key={phase.id}
                onClick={() => actions.changePhase(phase.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activePhase === phase.id
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {phase.label}
                <div className="text-xs text-gray-400 mt-1">{phase.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add New Item */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Item</h3>
          <div className="flex space-x-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="went-well">What Went Well</option>
              <option value="to-improve">What to Improve</option>
              <option value="action-items">Action Items</option>
            </select>
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Enter your feedback..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              onKeyPress={(e) => e.key === 'Enter' && addItem()}
            />
            <button
              onClick={addItem}
              disabled={!newItemText.trim()}
              className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </button>
          </div>
        </div>

        {/* Retrospective Items */}
        <div className="grid md:grid-cols-3 gap-6">
          {['went-well', 'to-improve', 'action-items'].map((category) => {
            const categoryInfo = getCategoryInfo(category);
            const categoryItems = getItemsByCategory(category);
            const IconComponent = categoryInfo.icon;
            
            return (
              <div key={category} className={`${categoryInfo.bgColor} ${categoryInfo.borderColor} border rounded-xl p-6`}>
                <div className="flex items-center mb-4">
                  <IconComponent className={`w-5 h-5 text-${categoryInfo.color}-600 mr-2`} />
                  <h3 className={`text-lg font-semibold text-${categoryInfo.color}-800`}>
                    {categoryInfo.title}
                  </h3>
                  <span className="ml-auto text-sm text-gray-500">
                    {categoryItems.length} items
                  </span>
                </div>
                
                <div className="space-y-3">
                  {categoryItems.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">No items yet</p>
                  ) : (
                    categoryItems.map((item) => (
                      <div key={item.id} className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-sm text-gray-800 mb-2">{item.text}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">by {item.author}</span>
                          <button
                            onClick={() => handleVoteItem(item.id)}
                            className={`flex items-center text-xs transition-colors ${
                              actions.hasUserVoted(item.id)
                                ? 'text-purple-600 font-medium'
                                : 'text-gray-500 hover:text-purple-600'
                            }`}
                          >
                            <Zap className="w-3 h-3 mr-1" />
                            {item.votes}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        {items.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{getItemsByCategory('went-well').length}</div>
                <div className="text-sm text-gray-600">Went Well</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{getItemsByCategory('to-improve').length}</div>
                <div className="text-sm text-gray-600">To Improve</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{getItemsByCategory('action-items').length}</div>
                <div className="text-sm text-gray-600">Action Items</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
