import React, { useState, useEffect } from 'react';
import { Users, Plus, MessageSquare, CheckCircle, AlertCircle, ArrowLeft, Zap, Wifi, WifiOff, Edit2, Trash2, Check, X } from 'lucide-react';
import { useRetrospective } from '../hooks/useRetrospective';
import '../styles/components/retrospective.css';

interface RetrospectiveAppProps {
  user: any;
  onBackToSelector: () => void;
  hideHeader?: boolean;
}

export const RetrospectiveApp: React.FC<RetrospectiveAppProps> = ({ user, onBackToSelector, hideHeader = false }) => {
  console.log('🔄 RetrospectiveApp rendering with:', { user, hideHeader });
  
  const { 
    connected, 
    user: retroUser, 
    items, 
    votes,
    session, 
    connectedUsers, 
    actions,
    error 
  } = useRetrospective();

  // Category-specific input states
  const [categoryInputs, setCategoryInputs] = useState({
    'went-well': '',
    'to-improve': '',
    'action-items': ''
  });
  const [showingInputFor, setShowingInputFor] = useState<string | null>(null);
  
  // Edit functionality state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Join retrospective session when component mounts
  useEffect(() => {
    if (user && connected) {
      actions.joinRetrospectiveSession(user.displayName);
    }
  }, [user, connected]); // Removed actions from dependencies to prevent re-runs

  const addItemToCategory = (category: 'went-well' | 'to-improve' | 'action-items') => {
    const text = categoryInputs[category];
    if (!text.trim()) return;
    
    actions.addItem(text.trim(), category);
    setCategoryInputs(prev => ({ ...prev, [category]: '' }));
    setShowingInputFor(null);
  };

  const showInputForCategory = (category: string) => {
    setShowingInputFor(category);
  };

  const hideInput = () => {
    setShowingInputFor(null);
  };

  const handleVoteItem = (itemId: string) => {
    const hasVoted = actions.hasUserVoted(itemId);
    
    if (hasVoted) {
      actions.removeVote(itemId);
    } else {
      actions.voteItem(itemId);
    }
  };

  const startEditing = (item: any) => {
    setEditingItemId(item.id);
    setEditingText(item.content || (item as any).text || ''); // Handle both content and text properties
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditingText('');
  };

  const saveEdit = (item: any) => {
    if (!editingText?.trim()) return;
    
    actions.updateItem(item.id, editingText.trim(), item.category);
    setEditingItemId(null);
    setEditingText('');
  };

  const handleDeleteItem = (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      actions.deleteItem(itemId);
    }
  };

  const canEditItem = (item: any) => {
    return retroUser && (item.authorId === retroUser.id || item.author === retroUser.displayName);
  };

  const getItemsByCategory = (category: 'went-well' | 'to-improve' | 'action-items') => {
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
    <div className="retro-app">
      {/* Header - only show when not hidden */}
      {!hideHeader && (
        <header className="retro-header">
          <div className="retro-header__container">
            <div className="retro-header__content">
              <div className="retro-header__left">
                <button
                  onClick={onBackToSelector}
                  className="btn btn--ghost btn--icon"
                  title="Back to app selector"
                >
                  <ArrowLeft className="icon icon--sm" />
                </button>
                <div className="retro-header__logo">
                  <Users className="icon icon--md" />
                </div>
                <div className="retro-header__title">
                  <h1 className="heading heading--lg">Retrospective Sessions</h1>
                  <p className="text text--secondary text--sm">Team Reflection & Improvement</p>
                </div>
              </div>
              
              <div className="retro-header__right">
                {/* Connection Status */}
                <div className="retro-status">
                  {connected ? (
                    <>
                      <Wifi className="icon icon--xs text--success" />
                      <span className="text text--success text--sm">Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="icon icon--xs text--error" />
                      <span className="text text--error text--sm">Disconnected</span>
                    </>
                  )}
                  <span className="retro-status__count">
                    {connectedUsers.length} online
                  </span>
                </div>

                <div className="retro-user">
                  <Users className="icon icon--xs text--primary" />
                  <span className="text text--sm">{user?.displayName || 'Anonymous'}</span>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Phase Selector */}
      <div className="retro-phases">
        <div className="retro-phases__container">
          <div className="retro-phases__list">
            {[
              { id: 'gather', label: 'Gather', description: 'Collect feedback' },
              { id: 'discuss', label: 'Discuss', description: 'Review items' },
              { id: 'vote', label: 'Vote', description: 'Prioritize' },
              { id: 'action', label: 'Action', description: 'Plan next steps' }
            ].map((phase) => (
              <button
                key={phase.id}
                onClick={() => actions.changePhase(phase.id as any)}
                className={`retro-phase-btn ${
                  activePhase === phase.id ? 'retro-phase-btn--active' : ''
                }`}
              >
                <span className="retro-phase-btn__label">{phase.label}</span>
                <span className="retro-phase-btn__description">{phase.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="retro-main">



        {/* Retrospective Items */}
        <div className="retro-categories">
          {(['went-well', 'to-improve', 'action-items'] as const).map((category) => {
            const categoryInfo = getCategoryInfo(category);
            const categoryItems = getItemsByCategory(category);
            const IconComponent = categoryInfo.icon;
            
            return (
              <div key={category} className={`retro-category retro-category--${category}`}>
                <div className="retro-category__header">
                  <div className="retro-category__title-group">
                    <IconComponent className="retro-category__icon" />
                    <h3 className="retro-category__title">
                      {categoryInfo.title}
                    </h3>
                  </div>
                  
                  {showingInputFor !== category && (
                    <button
                      onClick={() => showInputForCategory(category)}
                      className={`btn btn--sm retro-add-btn retro-add-btn--${category}`}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </button>
                  )}
                </div>

                {/* Add input field for this category */}
                {showingInputFor === category && (
                  <div className="retro-input-form">
                    <textarea
                      value={categoryInputs[category as keyof typeof categoryInputs]}
                      onChange={(e) => setCategoryInputs(prev => ({ ...prev, [category]: e.target.value }))}
                      placeholder={`Add to ${categoryInfo.title.toLowerCase()}...`}
                      className="retro-input"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          addItemToCategory(category as 'went-well' | 'to-improve' | 'action-items');
                        } else if (e.key === 'Escape') {
                          hideInput();
                        }
                      }}
                      autoFocus
                    />
                    <div className="retro-input-actions">
                      <button
                        onClick={hideInput}
                        className="btn btn--ghost btn--sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => addItemToCategory(category as 'went-well' | 'to-improve' | 'action-items')}
                        disabled={!categoryInputs[category as keyof typeof categoryInputs].trim()}
                        className={`btn btn--primary btn--sm retro-add-btn retro-add-btn--${category} ${
                          !categoryInputs[category as keyof typeof categoryInputs].trim()
                            ? 'btn--disabled'
                            : ''
                        }`}
                      >
                        Add Item
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Items container with scrollbar for >5 items */}
                <div className="retro-items-container">
                  <div 
                    className={`retro-items ${
                      categoryItems.length > 5 
                        ? 'retro-items--scrollable' 
                        : ''
                    }`}
                  >
                    {categoryItems.length === 0 ? (
                      <p className="retro-empty-state">No items yet</p>
                    ) : (
                      categoryItems.map((item) => (
                      <div key={item.id} className="retro-item">
                        {editingItemId === item.id ? (
                          // Editing mode
                          <div className="space-y-3">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  saveEdit(item);
                                } else if (e.key === 'Escape') {
                                  cancelEditing();
                                }
                              }}
                              className="retro-input retro-input--editing"
                              rows={2}
                              placeholder="Edit your item..."
                              autoFocus
                            />
                            <div className="retro-item-edit-footer">
                              <span className="retro-item-author">by {item.author}</span>
                              <div className="retro-item-actions">
                                <button
                                  onClick={() => saveEdit(item)}
                                  disabled={!editingText?.trim() || editingText.trim() === (item.content || (item as any).text || '')}
                                  className={`retro-action-btn retro-action-btn--save ${
                                    !editingText?.trim() || editingText.trim() === (item.content || (item as any).text || '')
                                      ? 'retro-action-btn--disabled'
                                      : ''
                                  }`}
                                  title="Save changes"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="retro-action-btn retro-action-btn--cancel"
                                  title="Cancel editing"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Display mode
                          <>
                            <p className="retro-item-content">{item.content}</p>
                            <div className="retro-item-footer">
                              <span className="retro-item-author">by {item.author}</span>
                              <div className="retro-item-actions">
                                <button
                                  onClick={() => handleVoteItem(item.id)}
                                  className={`retro-vote-btn ${
                                    actions.hasUserVoted(item.id)
                                      ? 'retro-vote-btn--active'
                                      : ''
                                  }`}
                                >
                                  <Zap className="w-3 h-3 mr-1" />
                                  {item.votes}
                                </button>
                                
                                {canEditItem(item) && (
                                  <>
                                    <button
                                      onClick={() => startEditing(item)}
                                      className="retro-action-btn retro-action-btn--edit"
                                      title="Edit item"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="retro-action-btn retro-action-btn--delete"
                                      title="Delete item"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                  </div>
                  {/* Scroll indicator for long lists */}
                  {categoryItems.length > 5 && (
                    <div className="retro-scroll-indicator" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        {items.length > 0 && (
          <div className="retro-summary">
            <h3 className="retro-summary__title">Session Summary</h3>
            <div className="retro-summary__stats">
              <div className="retro-stat retro-stat--went-well">
                <div className="retro-stat__number">{getItemsByCategory('went-well').length}</div>
                <div className="retro-stat__label">Went Well</div>
              </div>
              <div className="retro-stat retro-stat--to-improve">
                <div className="retro-stat__number">{getItemsByCategory('to-improve').length}</div>
                <div className="retro-stat__label">To Improve</div>
              </div>
              <div className="retro-stat retro-stat--action-items">
                <div className="retro-stat__number">{getItemsByCategory('action-items').length}</div>
                <div className="retro-stat__label">Action Items</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
