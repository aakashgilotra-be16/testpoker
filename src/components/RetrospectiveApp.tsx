import React, { useState, useEffect } from 'react';
import { Users, Plus, MessageSquare, CheckCircle, AlertCircle, ArrowLeft, Wifi, WifiOff, Edit2, Trash2, Check, X, Sparkles, ThumbsUp, Settings, ArrowUpDown } from 'lucide-react';
import { useRetrospective } from '../hooks/useRetrospective';
import { getAllSchemes, getSchemeConfig, type RetrospectiveScheme } from '../utils/retrospectiveSchemes';
import '../styles/components/retrospective.css';

interface RetrospectiveAppProps {
  user: any;
  roomId?: string;
  onBackToSelector: () => void;
  hideHeader?: boolean;
}

export const RetrospectiveApp: React.FC<RetrospectiveAppProps> = ({ user, roomId, onBackToSelector, hideHeader = false }) => {
  console.log('🔄 RetrospectiveApp rendering with:', { user, roomId, hideHeader });
  
  const { 
    connected, 
    user: retroUser, 
    items, 
    votes,
    session, 
    connectedUsers, 
    currentScheme,
    schemeCategories,
    aiActionItems,
    actions,
    error 
  } = useRetrospective(roomId);

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
  
  // Scheme and settings state
  const [showSchemeSelector, setShowSchemeSelector] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<RetrospectiveScheme>(currentScheme as RetrospectiveScheme || 'standard');
  const [sortByVotes, setSortByVotes] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Join retrospective session when component mounts
  useEffect(() => {
    if (user && connected) {
      actions.joinRetrospectiveSession(user.displayName);
    }
  }, [user, connected]); // Removed actions from dependencies to prevent re-runs

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

  // Sync selected scheme with hook state
  useEffect(() => {
    if (currentScheme && currentScheme !== selectedScheme) {
      setSelectedScheme(currentScheme as RetrospectiveScheme);
    }
  }, [currentScheme]);

  // Get active categories from scheme or default
  const activeCategories = schemeCategories.length > 0 
    ? schemeCategories 
    : getSchemeConfig(selectedScheme).categories;

  const getItemsByCategory = (categoryId: string) => {
    const categoryItems = items.filter(item => {
      const itemCategory = item.category || (item as any).categoryId;
      return itemCategory === categoryId;
    });
    
    // Sort by votes if enabled
    if (sortByVotes) {
      return categoryItems.sort((a, b) => {
        const aVotes = votes[a.id]?.length || (a as any).votes || 0;
        const bVotes = votes[b.id]?.length || (b as any).votes || 0;
        return bVotes - aVotes;
      });
    }
    
    return categoryItems;
  };

  const getCategoryInfo = (categoryId: string) => {
    const category = activeCategories.find(cat => cat.id === categoryId);
    if (!category) {
      return { title: '', icon: MessageSquare, color: 'gray', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
    }
    
    const iconMap: Record<string, any> = {
      'check-circle': CheckCircle,
      'alert-circle': AlertCircle,
      'message-square': MessageSquare,
      'play-circle': CheckCircle,
      'x-circle': AlertCircle,
      'repeat': CheckCircle,
      'frown': AlertCircle,
      'meh': AlertCircle,
      'smile': CheckCircle,
      'thumbs-up': ThumbsUp,
      'book-open': MessageSquare,
      'alert-triangle': AlertCircle,
      'heart': CheckCircle,
    };
    
    return {
      title: category.name,
      icon: iconMap[category.icon || 'message-square'] || MessageSquare,
      color: category.color,
      bgColor: `bg-${category.color}-50`,
      borderColor: `border-${category.color}-200`
    };
  };
  
  const handleSchemeChange = (scheme: RetrospectiveScheme) => {
    setSelectedScheme(scheme);
    actions.changeScheme(scheme);
    setShowSchemeSelector(false);
  };
  
  const handleGenerateAIActions = async () => {
    setIsGeneratingAI(true);
    try {
      actions.generateAIActions();
      setTimeout(() => setIsGeneratingAI(false), 2000);
    } catch (error) {
      console.error('Error generating AI actions:', error);
      setIsGeneratingAI(false);
    }
  };
  
  const getVoteCount = (itemId: string) => {
    return votes[itemId]?.length || 0;
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
                {/* Scheme Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowSchemeSelector(!showSchemeSelector)}
                    className="btn btn--ghost btn--sm"
                    title="Change retrospective scheme"
                  >
                    <Settings className="icon icon--xs" />
                    <span className="text--sm">{getSchemeConfig(selectedScheme).name}</span>
                  </button>
                  
                  {showSchemeSelector && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSchemeSelector(false)} />
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                        <div className="p-3 border-b border-gray-200">
                          <h3 className="text-sm font-semibold text-gray-900">Retrospective Format</h3>
                        </div>
                        <div className="p-2">
                          {getAllSchemes().map(scheme => (
                            <button
                              key={scheme.id}
                              onClick={() => handleSchemeChange(scheme.id)}
                              className={`w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                                selectedScheme === scheme.id ? 'bg-blue-50 border border-blue-200' : ''
                              }`}
                            >
                              <div className="font-medium text-sm text-gray-900">{scheme.name}</div>
                              <div className="text-xs text-gray-600 mt-1">{scheme.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Sort Toggle */}
                <button
                  onClick={() => setSortByVotes(!sortByVotes)}
                  className={`btn btn--sm ${
                    sortByVotes ? 'btn--primary' : 'btn--ghost'
                  }`}
                  title="Sort by votes"
                >
                  <ArrowUpDown className="icon icon--xs" />
                  <span className="text--sm">Sort by Votes</span>
                </button>

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

      {/* Toolbar - always visible for scheme selector and sort */}
      <div className="bg-white border-b border-gray-200 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-end space-x-3">
            {/* Scheme Selector */}
            <div className="relative">
              <button
                onClick={() => setShowSchemeSelector(!showSchemeSelector)}
                className="btn btn--ghost btn--sm flex items-center space-x-2"
                title="Change retrospective scheme"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm">{getSchemeConfig(selectedScheme).name}</span>
              </button>
              
              {showSchemeSelector && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSchemeSelector(false)} />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-3 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900">Retrospective Format</h3>
                    </div>
                    <div className="p-2">
                      {getAllSchemes().map(scheme => (
                        <button
                          key={scheme.id}
                          onClick={() => handleSchemeChange(scheme.id)}
                          className={`w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                            selectedScheme === scheme.id ? 'bg-blue-50 border border-blue-200' : ''
                          }`}
                        >
                          <div className="font-medium text-sm text-gray-900">{scheme.name}</div>
                          <div className="text-xs text-gray-600 mt-1">{scheme.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Sort Toggle */}
            <button
              onClick={() => setSortByVotes(!sortByVotes)}
              className={`btn btn--sm flex items-center space-x-2 ${
                sortByVotes ? 'btn--primary' : 'btn--ghost'
              }`}
              title="Sort by votes"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="text-sm">Sort by Votes</span>
            </button>
          </div>
        </div>
      </div>

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
          {activeCategories.map((category) => {
            const categoryInfo = getCategoryInfo(category.id);
            const categoryItems = getItemsByCategory(category.id);
            const IconComponent = categoryInfo.icon;
            const isActionItems = category.id === 'action-items';
            
            return (
              <div key={category.id} className={`retro-category retro-category--${category.id}`}>
                <div className="retro-category__header">
                  <div className="retro-category__title-group">
                    <IconComponent className="retro-category__icon" />
                    <h3 className="retro-category__title">
                      {categoryInfo.title}
                    </h3>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isActionItems && (
                      <button
                        onClick={handleGenerateAIActions}
                        disabled={isGeneratingAI || items.filter(i => (i.category || (i as any).categoryId) !== 'action-items').length === 0}
                        className="btn btn--primary btn--sm"
                        title="Generate action items with AI"
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        {isGeneratingAI ? 'Generating...' : 'AI Actions'}
                      </button>
                    )}
                    
                    {showingInputFor !== category.id && (
                      <button
                        onClick={() => showInputForCategory(category.id)}
                        className={`btn btn--sm retro-add-btn retro-add-btn--${category.id}`}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </button>
                    )}
                  </div>
                </div>

                {/* Add input field for this category */}
                {showingInputFor === category.id && (
                  <div className="retro-input-form">
                    <textarea
                      value={categoryInputs[category.id as keyof typeof categoryInputs] || ''}
                      onChange={(e) => setCategoryInputs(prev => ({ ...prev, [category.id]: e.target.value }))}
                      placeholder={`Add to ${categoryInfo.title.toLowerCase()}...`}
                      className="retro-input"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          const text = categoryInputs[category.id as keyof typeof categoryInputs] || '';
                          if (text.trim()) {
                            actions.addItem(text.trim(), category.id as any);
                            setCategoryInputs(prev => ({ ...prev, [category.id]: '' }));
                            setShowingInputFor(null);
                          }
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
                        onClick={() => {
                          const text = categoryInputs[category.id as keyof typeof categoryInputs] || '';
                          if (text.trim()) {
                            actions.addItem(text.trim(), category.id as any);
                            setCategoryInputs(prev => ({ ...prev, [category.id]: '' }));
                            setShowingInputFor(null);
                          }
                        }}
                        disabled={!(categoryInputs[category.id as keyof typeof categoryInputs] || '').trim()}
                        className={`btn btn--primary btn--sm retro-add-btn retro-add-btn--${category.id} ${
                          !(categoryInputs[category.id as keyof typeof categoryInputs] || '').trim()
                            ? 'btn--disabled'
                            : ''
                        }`}
                      >
                        Add Item
                      </button>
                    </div>
                  </div>
                )}
                
                {/* AI Draft Actions */}
                {isActionItems && aiActionItems.length > 0 && (
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center mb-2">
                      <Sparkles className="w-4 h-4 text-purple-600 mr-2" />
                      <span className="text-sm font-medium text-purple-900">AI-Generated Suggestions</span>
                    </div>
                    <div className="space-y-2">
                      {aiActionItems.map((aiItem) => (
                        <div key={aiItem.id} className="bg-white rounded-lg p-3 border border-purple-200">
                          <div className="text-sm font-medium text-gray-900 mb-1">{aiItem.title}</div>
                          <div className="text-xs text-gray-600 mb-2">{aiItem.description}</div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => actions.approveAIAction(aiItem.id)}
                              className="btn btn--primary btn--xs"
                              title="Approve and add to action items"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => actions.discardAIAction(aiItem.id)}
                              className="btn btn--ghost btn--xs"
                              title="Discard suggestion"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Discard
                            </button>
                          </div>
                        </div>
                      ))}
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
                                  title={actions.hasUserVoted(item.id) ? 'Remove vote' : 'Vote for this item'}
                                >
                                  <ThumbsUp className="w-3 h-3 mr-1" />
                                  <span className="font-medium">{getVoteCount(item.id)}</span>
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
              {activeCategories.map((category) => {
                const count = getItemsByCategory(category.id).length;
                const totalVotes = getItemsByCategory(category.id).reduce((sum, item) => sum + getVoteCount(item.id), 0);
                return (
                  <div key={category.id} className={`retro-stat retro-stat--${category.id}`}>
                    <div className="retro-stat__number">{count}</div>
                    <div className="retro-stat__label">{category.name}</div>
                    {totalVotes > 0 && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center justify-center">
                        <ThumbsUp className="w-3 h-3 mr-1" />
                        {totalVotes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {sortByVotes && (
              <div className="text-center text-sm text-blue-600 mt-2">
                ↕ Sorted by votes
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
