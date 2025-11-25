# Multi-Admin Support & MongoDB Integration

## Overview
This update adds support for multiple admins in a room and ensures all voting/estimation actions are persisted to MongoDB for complete history tracking.

## Key Changes

### 1. **Multi-Admin Support**

#### Room Model Updates (`server/src/models/Room.ts`)
- **New Methods:**
  - `isAdmin(userId)` - Checks if user is host OR facilitator
  - `promoteToAdmin(userId)` - Promotes participant to facilitator role
  - `demoteFromAdmin(userId)` - Demotes facilitator back to participant (can't demote host)

- **Role Hierarchy:**
  - **Host** - Original room creator, cannot be demoted, always admin
  - **Facilitator** - Promoted admin, can be demoted by host
  - **Participant** - Regular user, can be promoted by any admin

#### RoomService Updates (`server/src/services/RoomService.ts`)
- **New Methods:**
  - `promoteToAdmin(roomId, requesterId, targetUserId)` - Any admin can promote
  - `demoteFromAdmin(roomId, requesterId, targetUserId)` - Only host can demote
  - `getRoomAdmins(roomId)` - Get list of all admins in room

#### Authorization Updates (`server/src/utils/roomUtils.ts`)
- `isRoomAdmin()` now checks `room.isAdmin()` instead of just `room.hostId`
- Supports both host and facilitators as admins

### 2. **New Socket Events**

#### Client → Server
```typescript
promote_to_admin: { roomId: string; targetUserId: string }
demote_from_admin: { roomId: string; targetUserId: string }
get_room_admins: { roomId: string }
```

#### Server → Client
```typescript
user_promoted_to_admin: { userId: string; displayName: string; role: string }
user_demoted_from_admin: { userId: string; displayName: string; role: string }
room_admins_updated: { admins: Array<{userId, displayName, role}> }
room_admins_list: { roomId: string; admins: Array<{userId, displayName, role}> }
```

### 3. **Socket Handlers** (`server/src/handlers/roomHandlers.ts`)

#### `promote_to_admin`
- Validates requester is admin
- Promotes target user to facilitator
- Broadcasts update to all room members
- Sends updated admin list

#### `demote_from_admin`
- Validates requester is host (only host can demote)
- Prevents demoting the host
- Demotes facilitator to participant
- Broadcasts update to all room members

#### `get_room_admins`
- Returns list of all admins in room
- No authorization required (anyone can view)

### 4. **MongoDB Integration for Voting**

All voting operations already use MongoDB via `VotingService`:
- ✅ `start_voting_session` - Creates session in database
- ✅ `submit_vote` - Persists vote to database
- ✅ `reveal_votes` - Updates session and retrieves votes from database
- ✅ `end_voting_session` - Marks session as ended in database

**Vote History Tracking:**
- All votes stored in `votes` collection
- All sessions stored in `voting_sessions` collection
- Complete audit trail maintained
- Can query historical voting data

## Usage Examples

### Frontend: Promote User to Admin
```javascript
socket.emit('promote_to_admin', {
  roomId: 'ABC123',
  targetUserId: 'user-socket-id'
});

// Listen for confirmation
socket.on('user_promoted_to_admin', (data) => {
  console.log(`${data.displayName} is now an admin!`);
});

socket.on('room_admins_updated', (data) => {
  // Update UI with new admin list
  setAdmins(data.admins);
});
```

### Frontend: Demote Admin (Host Only)
```javascript
socket.emit('demote_from_admin', {
  roomId: 'ABC123',
  targetUserId: 'user-socket-id'
});

// Listen for confirmation
socket.on('user_demoted_from_admin', (data) => {
  console.log(`${data.displayName} is no longer an admin`);
});
```

### Frontend: Get Admin List
```javascript
socket.emit('get_room_admins', {
  roomId: 'ABC123'
});

socket.on('room_admins_list', (data) => {
  console.log('Current admins:', data.admins);
  // data.admins = [{ userId, displayName, role }, ...]
});
```

## Permission Matrix

| Action | Host | Facilitator | Participant |
|--------|------|-------------|-------------|
| Create Stories | ✅ | ✅ | ❌ |
| Update Stories | ✅ | ✅ | ❌ |
| Delete Stories | ✅ | ✅ | ❌ |
| Start Voting | ✅ | ✅ | ❌ |
| Reveal Votes | ✅ | ✅ | ❌ |
| End Session | ✅ | ✅ | ❌ |
| Submit Vote | ✅ | ✅ | ✅ |
| View Stories | ✅ | ✅ | ✅ |
| Promote to Admin | ✅ | ✅ | ❌ |
| Demote from Admin | ✅ | ❌ | ❌ |
| View Admin List | ✅ | ✅ | ✅ |

## Database Schema

### Room Participants
```javascript
{
  userId: String,
  name: String,
  displayName: String,
  role: 'host' | 'facilitator' | 'participant',
  joinedAt: Date,
  lastActivity: Date,
  isOnline: Boolean
}
```

### Voting Session (MongoDB)
```javascript
{
  _id: ObjectId,
  roomId: String,
  storyId: ObjectId,
  deckType: String,
  isActive: Boolean,
  votesRevealed: Boolean,
  facilitatorId: String,
  createdBy: String,
  createdAt: Date,
  updatedAt: Date,
  // ... other fields
}
```

### Vote (MongoDB)
```javascript
{
  _id: ObjectId,
  sessionId: String,
  userId: String,
  displayName: String,
  voteValue: String,
  roundNumber: Number,
  isRevealedVote: Boolean,
  submittedAt: Date
}
```

## Implementation Notes

### Admin Promotion Flow
1. Admin clicks "Make Admin" button next to participant
2. Frontend emits `promote_to_admin` event
3. Backend validates requester is admin
4. Backend updates participant role to 'facilitator'
5. Backend saves room to database
6. Backend broadcasts update to all room members
7. All clients update their UI

### Admin Demotion Flow
1. Host clicks "Remove Admin" button next to facilitator
2. Frontend emits `demote_from_admin` event
3. Backend validates requester is host (not just any admin)
4. Backend checks target is not the host
5. Backend updates facilitator role to 'participant'
6. Backend saves room to database
7. Backend broadcasts update to all room members
8. All clients update their UI

### Vote Persistence
- Every vote triggers `VotingService.castVote()`
- Vote is saved to MongoDB `votes` collection
- Session participant list updated
- Vote count retrieved from database (not in-memory)
- Complete history maintained for reporting

## Error Handling

### Promotion Errors
- "Only admins can promote users" - Requester is not admin
- "User is not a participant in this room" - Target user not in room
- "User is already an admin" - Target is already host/facilitator

### Demotion Errors
- "Only the room host can demote admins" - Requester is not host
- "Cannot demote the room host" - Attempting to demote original host
- "User is not an admin" - Target is already a participant

## Testing Checklist

- [ ] Host can promote participants to admin
- [ ] Facilitators can promote participants to admin
- [ ] Only host can demote facilitators
- [ ] Cannot demote the host
- [ ] Multiple facilitators can all create stories
- [ ] Multiple facilitators can all start voting sessions
- [ ] Participants cannot create stories
- [ ] Participants cannot start voting
- [ ] All votes are saved to MongoDB
- [ ] Vote history persists across sessions
- [ ] Admin list updates in real-time
- [ ] UI reflects admin status correctly

## Migration Notes

### Backwards Compatibility
- Existing rooms continue to work
- Original host remains admin
- `isStoryCreator` field still populated for legacy compatibility
- No breaking changes to existing functionality

### Database
- No migration needed
- Room schema already has `role` field
- Existing participants default to 'participant' role
- Host automatically has 'host' role

## Future Enhancements

1. **Admin Permissions Customization**
   - Fine-grained permissions (e.g., can only start voting, not delete stories)
   - Custom role types beyond host/facilitator/participant

2. **Admin Activity Log**
   - Track who promoted/demoted whom
   - Audit trail for admin actions

3. **Bulk Admin Operations**
   - Promote multiple users at once
   - Import admin list from file

4. **Admin Notifications**
   - Notify user when promoted/demoted
   - Email notifications for admin changes

5. **Vote Analytics**
   - Historical vote trends
   - Team velocity metrics
   - Consensus patterns
