# Voting Flow Update - In-Memory Votes with Auto-Reveal

## Overview
Updated the voting system to store votes in memory during the voting phase, automatically reveal when all votes are in, and only save to the database when the admin clicks "Save Points".

## New Voting Flow

### 1. **Voting Phase** (In-Memory Only)
- Users click on estimate cards
- Votes are stored in `temporaryVotes` Map (not saved to DB)
- Socket.IO broadcasts vote count to all participants
- Progress bar shows X/Y votes received
- **No actual vote values are revealed yet**

### 2. **Auto-Reveal** (When All Votes In)
- System detects when `voteCount === totalParticipants`
- Automatically reveals all votes to everyone
- Vote values are displayed in the UI
- Statistics (mean, median) are calculated
- **Still not saved to DB**

### 3. **Save Points** (Admin Action)
- Admin/Host enters final story points
- Clicks "Save Points" button
- Triggers `save_final_estimate` socket event
- **This saves everything to DB:**
  - All individual user votes
  - Final estimate for the story
  - Ends the voting session
- Temporary votes are cleared from memory

## Technical Changes

### Backend Changes

#### 1. **server/src/utils/dataStore.ts**
```typescript
// NEW: Temporary vote storage
export const temporaryVotes: Record<string, Record<string, { 
  value: string; 
  confidence: number; 
  displayName: string; 
  submittedAt: Date; 
  reasoning?: string 
}>> = {};
```

#### 2. **server/src/services/VotingService.ts**
- `castVote()` now returns `{ voteCount, totalParticipants, allVotesIn }`
- Stores votes in `temporaryVotes` map instead of DB
- Checks if all participants have voted

#### 3. **server/src/handlers/votingHandlers.ts**
- **submit_vote**: 
  - Stores vote in memory
  - Broadcasts vote count (not values)
  - Auto-reveals when all votes are in
  
- **save_final_estimate** (NEW):
  - Saves all temporary votes to Vote collection
  - Updates Story with final_points
  - Ends VotingSession
  - Clears temporary votes from memory

#### 4. **server/src/types/index.ts**
Added new events:
```typescript
ClientToServerEvents {
  save_final_estimate: (data: { storyId, sessionId, finalEstimate }) => void;
}

ServerToClientEvents {
  final_estimate_saved: (data: { storyId, sessionId, finalEstimate, voteCount }) => void;
  votes_revealed: (data: { storyId, sessionId, votes, revealed }) => void;
}
```

### Frontend Changes

#### 1. **src/hooks/useSocket.ts**
- Added `saveFinalEstimate(storyId, sessionId, finalEstimate)` action
- Added `final_estimate_saved` event listener
- Updated `votes_revealed` to handle new format with sessionId
- Clears voting session after final estimate saved

#### 2. **src/components/VotingSession.tsx**
- Added `saveFinalEstimate` to actions interface
- Updated `handleSavePoints()` to call `saveFinalEstimate` instead of `onSavePoints`
- Save Points button now triggers the new flow

## Data Flow Diagram

```
User Clicks Card
    ↓
Vote stored in temporaryVotes[sessionId][userId]
    ↓
Broadcast vote_submitted (with count only)
    ↓
Check if allVotesIn
    ↓
YES → Auto-reveal votes to all users
    ↓
Admin enters final points
    ↓
Admin clicks "Save Points"
    ↓
save_final_estimate socket event
    ↓
Backend saves:
  - All votes to Vote collection
  - final_points to Story
  - Ends VotingSession
    ↓
Clear temporaryVotes[sessionId]
    ↓
Broadcast final_estimate_saved
    ↓
Frontend closes voting modal
```

## Benefits

1. **Better UX**: Immediate feedback when clicking cards (no DB delay)
2. **Auto-Reveal**: No manual reveal needed - happens automatically
3. **Data Integrity**: All votes + final estimate saved atomically
4. **Performance**: Reduces DB writes during voting phase
5. **Clear Intent**: "Save Points" explicitly commits the estimate

## Testing Checklist

- [ ] Vote on a story - verify vote stored in memory
- [ ] Vote count increases as users vote
- [ ] Votes auto-reveal when all participants have voted
- [ ] Vote values display correctly after auto-reveal
- [ ] Statistics (mean/median) calculate correctly
- [ ] Admin can enter final points
- [ ] "Save Points" saves all votes + estimate to DB
- [ ] Voting session ends after save
- [ ] Temporary votes cleared from memory
- [ ] Story shows final_points after save

## Migration Notes

- **Backward Compatible**: Old votes in DB are not affected
- **No Schema Changes**: Uses existing Vote and VotingSession models
- **Memory Usage**: Temporary votes are small and cleared after save
- **Concurrency**: Atomic upsert used when saving to DB

## Files Modified

### Backend
- `server/src/utils/dataStore.ts`
- `server/src/services/VotingService.ts`
- `server/src/handlers/votingHandlers.ts`
- `server/src/types/index.ts`

### Frontend
- `src/hooks/useSocket.ts`
- `src/components/VotingSession.tsx`

## Environment Variables
No new environment variables needed.

## Deployment Notes
1. Restart backend server to load new handlers
2. Frontend will automatically pick up new socket events
3. Test with 2+ users in same room for auto-reveal
