import { useState } from 'react';
import { Users, Crown, Shield, User, X, MoreVertical } from 'lucide-react';

interface Participant {
  userId: string;
  name: string;
  displayName: string;
  role: 'host' | 'facilitator' | 'participant';
  joinedAt: string;
  lastActivity: string;
  isOnline: boolean;
}

interface ParticipantsListProps {
  participants: Participant[];
  currentUserId: string;
  isCurrentUserAdmin: boolean;
  onPromoteToAdmin: (userId: string) => void;
  onDemoteFromAdmin: (userId: string) => void;
}

export default function ParticipantsList({
  participants,
  currentUserId,
  isCurrentUserAdmin,
  onPromoteToAdmin,
  onDemoteFromAdmin
}: ParticipantsListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const onlineParticipants = participants.filter(p => p.isOnline);
  const offlineParticipants = participants.filter(p => !p.isOnline);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'host':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'facilitator':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'host':
        return 'Host';
      case 'facilitator':
        return 'Admin';
      default:
        return 'Participant';
    }
  };

  const canManageParticipant = (participant: Participant) => {
    if (!isCurrentUserAdmin) return false;
    if (participant.userId === currentUserId) return false;
    if (participant.role === 'host') return false; // Can't manage the host
    return true;
  };

  const toggleMenu = (userId: string) => {
    setMenuOpenFor(menuOpenFor === userId ? null : userId);
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Users className="w-5 h-5 text-gray-600" />
        <span className="font-medium text-gray-700">
          {onlineParticipants.length} Online
        </span>
        {participants.length > onlineParticipants.length && (
          <span className="text-xs text-gray-500">
            ({participants.length} total)
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setMenuOpenFor(null);
            }}
          />

          {/* Menu Panel */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Participants</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Participants List */}
            <div className="overflow-y-auto flex-1">
              {/* Online Participants */}
              {onlineParticipants.length > 0 && (
                <div className="p-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">
                    Online ({onlineParticipants.length})
                  </div>
                  {onlineParticipants.map((participant) => (
                    <div
                      key={participant.userId}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                            {participant.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {participant.displayName}
                            </p>
                            {participant.userId === currentUserId && (
                              <span className="text-xs text-blue-600 font-medium">(You)</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            {getRoleIcon(participant.role)}
                            <span className="text-xs text-gray-500">
                              {getRoleLabel(participant.role)}
                            </span>
                          </div>
                        </div>

                        {/* Actions Menu */}
                        {canManageParticipant(participant) && (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMenu(participant.userId);
                              }}
                              className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-600" />
                            </button>

                            {/* Action Dropdown */}
                            {menuOpenFor === participant.userId && (
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                {participant.role === 'participant' ? (
                                  <button
                                    onClick={() => {
                                      onPromoteToAdmin(participant.userId);
                                      setMenuOpenFor(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                  >
                                    <Shield className="w-4 h-4 text-blue-500" />
                                    <span>Promote to Admin</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      onDemoteFromAdmin(participant.userId);
                                      setMenuOpenFor(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                  >
                                    <User className="w-4 h-4 text-gray-500" />
                                    <span>Remove Admin Rights</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Offline Participants */}
              {offlineParticipants.length > 0 && (
                <div className="p-2 border-t border-gray-100">
                  <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">
                    Offline ({offlineParticipants.length})
                  </div>
                  {offlineParticipants.map((participant) => (
                    <div
                      key={participant.userId}
                      className="flex items-center justify-between p-2 opacity-60"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                            {participant.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gray-400 border-2 border-white rounded-full" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {participant.displayName}
                          </p>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            {getRoleIcon(participant.role)}
                            <span className="text-xs text-gray-500">
                              {getRoleLabel(participant.role)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {participants.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No participants yet</p>
                </div>
              )}
            </div>

            {/* Footer - Legend */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Crown className="w-3 h-3 text-yellow-500" />
                    <span>Host</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-blue-500" />
                    <span>Admin</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3 text-gray-400" />
                    <span>Member</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
