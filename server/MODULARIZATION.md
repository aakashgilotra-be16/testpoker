# Backend Code Modularization

## Overview
The backend code has been refactored into a modular structure to improve maintainability, readability, and testability.

## New File Structure

```
server/src/
├── index.ts                          # Main entry point (140 lines, down from 1640!)
├── handlers/                         # Socket.IO event handlers
│   ├── roomHandlers.ts              # Room creation, joining, leaving
│   ├── storyHandlers.ts             # Story CRUD operations
│   ├── votingHandlers.ts            # Voting session management
│   └── retrospectiveHandlers.ts     # Retrospective session handling
├── utils/                            # Utility functions
│   ├── roomUtils.ts                 # Room admin checks
│   └── dataStore.ts                 # In-memory data storage
├── services/                         # Business logic (existing)
│   ├── RoomService.ts
│   ├── StoryService.ts
│   └── VotingService.ts
├── models/                           # Database models (existing)
│   ├── Room.ts
│   ├── Story.ts
│   ├── VotingSession.ts
│   └── Vote.ts
└── types/                            # TypeScript types (existing)
    └── index.ts
```

## Module Breakdown

### 1. **index.ts** (Main Entry Point)
- Express and Socket.IO setup
- CORS configuration
- Health check endpoints
- Socket connection lifecycle
- Delegates to handler modules

**Lines of Code:** ~140 (reduced from 1640)

### 2. **handlers/roomHandlers.ts**
**Responsibilities:**
- `create_room` - Create new room
- `join_room` - Join existing room
- `leave_room` - Leave current room
- `join` - Legacy handler (now redirects to room system)

**Key Features:**
- Automatic admin assignment (room creator)
- Room-specific user tracking
- Database integration via RoomService

### 3. **handlers/storyHandlers.ts**
**Responsibilities:**
- `create_story` - Create single story (admin only)
- `update_story` - Update story (admin only)
- `delete_story` - Delete story (admin only)
- `bulk_create_stories` - Create multiple stories (admin only)
- `save_story_points` - Save story estimates (admin only)

**Key Features:**
- Admin authorization for all operations
- Room-based story isolation
- Database persistence via StoryService

### 4. **handlers/votingHandlers.ts**
**Responsibilities:**
- `start_voting_session` - Start voting (admin only)
- `submit_vote` - Submit a vote (all users)
- `reveal_votes` - Reveal votes (admin only)
- `end_voting_session` - End session (admin only)
- `start_timer` / `stop_timer` - Timer control (admin only)
- `reset_voting` - Reset votes (admin only)
- `change_deck_type` - Change card deck (admin only)

**Key Features:**
- Comprehensive vote tracking
- Database-backed voting with VotingService
- Real-time vote count updates
- Admin-controlled vote revelation

### 5. **handlers/retrospectiveHandlers.ts**
**Responsibilities:**
- `join_retrospective` - Join retro session
- `add_retrospective_item` - Add item
- `update_retrospective_item` - Update item
- `delete_retrospective_item` - Delete item
- `vote_retrospective_item` - Vote on item
- `remove_retrospective_vote` - Remove vote
- `change_retrospective_phase` - Change phase

**Key Features:**
- In-memory storage (can be migrated to database)
- Phase-based workflow
- Voting system for items

### 6. **utils/roomUtils.ts**
**Utilities:**
- `isRoomAdmin(userId, roomId)` - Check if user is room admin
- `requireRoomAdmin(userId, roomId)` - Authorization helper with error messages

**Purpose:**
- Centralize admin permission checks
- Reduce code duplication
- Provide consistent error messages

### 7. **utils/dataStore.ts**
**Storage:**
- Room-based data structures
- Legacy global storage
- Helper functions for data access

**Key Exports:**
- `roomStories`, `roomVotingSessions`, `roomVotes`, `roomConnectedUsers`
- `userRooms` - User to room mapping
- `getOrCreateRoomData()` - Safe data access
- `getRoomData()` - Read-only access

## Benefits of Modularization

### ✅ **Maintainability**
- Each file has a single, clear responsibility
- Easy to locate specific functionality
- Reduced cognitive load when reading code

### ✅ **Testability**
- Handlers can be tested independently
- Mock dependencies easily
- Isolated unit tests possible

### ✅ **Scalability**
- Add new handlers without touching existing code
- Clear separation of concerns
- Easy to extend functionality

### ✅ **Readability**
- 140-line main file instead of 1640 lines
- Descriptive file names indicate purpose
- Logical grouping of related functions

### ✅ **Collaboration**
- Multiple developers can work on different handlers
- Reduced merge conflicts
- Clear ownership boundaries

## Migration Notes

### Backwards Compatibility
- All existing socket events work unchanged
- No breaking changes to client code
- Same functionality, better organization

### Database Integration
- Room, Story, and Voting handlers use database services
- Retrospective handlers still use in-memory storage (can be migrated later)
- Legacy global storage maintained for backward compatibility

### Admin Authorization
- Replaced hardcoded "Aakash/Mohith" checks
- Room creator automatically becomes admin
- Consistent permission model across all operations

## Usage Example

```typescript
// In index.ts
import { setupRoomHandlers } from './handlers/roomHandlers';
import { setupStoryHandlers } from './handlers/storyHandlers';
import { setupVotingHandlers } from './handlers/votingHandlers';

io.on('connection', (socket) => {
  const currentRoom = { value: null };
  
  // Setup all handlers
  setupRoomHandlers(socket, io, currentRoom);
  setupStoryHandlers(socket, io, currentRoom);
  setupVotingHandlers(socket, io);
  // ... etc
});
```

## Future Improvements

1. **Database Migration for Retrospectives**
   - Move retrospective storage to MongoDB
   - Add RetrospectiveService

2. **Middleware Layer**
   - Extract common validation logic
   - Add rate limiting
   - Request logging

3. **Error Handling**
   - Centralized error handler
   - Consistent error responses
   - Error logging service

4. **Testing**
   - Unit tests for each handler
   - Integration tests for workflows
   - Mock data generators

5. **Documentation**
   - JSDoc comments for all functions
   - API documentation
   - Socket event specifications

## Files Backup

The original monolithic `index.ts` is backed up as:
- `server/src/index.old.ts`

You can compare the old and new implementations to understand the refactoring.
