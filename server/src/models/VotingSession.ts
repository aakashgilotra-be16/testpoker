import mongoose, { Document, Schema } from 'mongoose';

// Interface for TypeScript
export interface IVotingSession extends Document {
  _id: string;
  storyId: string;
  roomId: string;
  deckType: 'fibonacci' | 'powersOfTwo' | 'tShirt' | 'custom' | 'planning' | 'modified';
  customDeck?: string[];
  isActive: boolean;
  votesRevealed: boolean;
  phase: 'starting' | 'voting' | 'discussing' | 'finalizing' | 'completed';
  
  // Timer management
  timerDuration: number; // in seconds
  timerStartedAt?: Date;
  timerEndsAt?: Date;
  isPaused: boolean;
  pausedAt?: Date;
  pausedDuration: number; // total paused time in ms
  
  // Session management
  createdBy: string;
  facilitatorId: string;
  hostId?: string; // Room host
  
  // Participants tracking
  invitedParticipants: string[]; // User IDs
  activeParticipants: Array<{
    userId: string;
    userName: string;
    joinedAt: Date;
    lastActivity: Date;
    hasVoted: boolean;
    isOnline: boolean;
  }>;
  
  // Voting configuration
  settings: {
    allowRevoteBeforeReveal: boolean;
    autoRevealAfterAllVote: boolean;
    showVoteCount: boolean;
    allowSpectators: boolean;
    requireAllToVote: boolean;
    anonymousVoting: boolean;
    showVoterNames: boolean;
    consensusThreshold: number; // percentage
  };
  
  // Consensus and results
  consensus: {
    achieved: boolean;
    percentage: number;
    finalEstimate?: string;
    confidence: number; // 1-100
    agreeingVoters: string[];
    outlierVoters: string[];
  };
  
  // Voting rounds (for re-voting)
  rounds: Array<{
    roundNumber: number;
    startedAt: Date;
    completedAt?: Date;
    voteCount: number;
    averageVote?: number;
    consensus: boolean;
  }>;
  currentRound: number;
  
  // Session metrics
  metrics: {
    totalVotes: number;
    totalParticipants: number;
    participationRate: number; // percentage
    averageVotingTime: number; // milliseconds
    consensusReachedInRound: number;
    discussionDuration: number; // milliseconds
    totalDuration: number; // milliseconds
  };
  
  // Discussion features
  discussion: {
    enabled: boolean;
    messages: Array<{
      id: string;
      authorId: string;
      authorName: string;
      content: string;
      timestamp: Date;
      type: 'text' | 'emoji' | 'system';
    }>;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  archivedAt?: Date;
  
  // Instance methods
  startTimer(duration?: number): Promise<this>;
  pauseTimer(): Promise<this>;
  resumeTimer(): Promise<this>;
  stopTimer(): Promise<this>;
  addParticipant(userId: string, userName: string): Promise<this>;
  removeParticipant(userId: string): Promise<this>;
  revealVotes(): Promise<this>;
  calculateConsensus(): Promise<this>;
  finalizeEstimate(estimate: string, facilitatorId: string): Promise<this>;
  startNewRound(): Promise<this>;
  canUserManage(userId: string): boolean;
  getActiveParticipants(): any[];
  
  // Legacy compatibility
  id?: string;
  timerStartedAt_string?: string | null;
  votes?: any[]; // For backward compatibility
  sessionSettings?: any;
}

const participantSchema = new Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  joinedAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  hasVoted: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: true }
}, { _id: false });

const sessionSettingsSchema = new Schema({
  allowRevoteBeforeReveal: { type: Boolean, default: true },
  autoRevealAfterAllVote: { type: Boolean, default: false },
  showVoteCount: { type: Boolean, default: true },
  allowSpectators: { type: Boolean, default: true },
  requireAllToVote: { type: Boolean, default: false },
  anonymousVoting: { type: Boolean, default: false },
  showVoterNames: { type: Boolean, default: true },
  consensusThreshold: { type: Number, default: 70, min: 50, max: 100 }
}, { _id: false });

const consensusSchema = new Schema({
  achieved: { type: Boolean, default: false },
  percentage: { type: Number, default: 0, min: 0, max: 100 },
  finalEstimate: { type: String },
  confidence: { type: Number, default: 0, min: 0, max: 100 },
  agreeingVoters: [{ type: String }],
  outlierVoters: [{ type: String }]
}, { _id: false });

const roundSchema = new Schema({
  roundNumber: { type: Number, required: true },
  startedAt: { type: Date, required: true },
  completedAt: { type: Date },
  voteCount: { type: Number, default: 0 },
  averageVote: { type: Number },
  consensus: { type: Boolean, default: false }
}, { _id: false });

const metricsSchema = new Schema({
  totalVotes: { type: Number, default: 0 },
  totalParticipants: { type: Number, default: 0 },
  participationRate: { type: Number, default: 0, min: 0, max: 100 },
  averageVotingTime: { type: Number, default: 0 },
  consensusReachedInRound: { type: Number, default: 0 },
  discussionDuration: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 }
}, { _id: false });

const messageSchema = new Schema({
  id: { type: String, required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  content: { type: String, required: true, maxlength: 500 },
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ['text', 'emoji', 'system'], default: 'text' }
}, { _id: false });

const discussionSchema = new Schema({
  enabled: { type: Boolean, default: true },
  messages: [messageSchema]
}, { _id: false });

const votingSessionSchema = new Schema<IVotingSession>({
  _id: {
    type: String,
    required: true,
    default: () => 'session_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 9)
  },
  storyId: {
    type: String,
    required: true,
    ref: 'Story',
    index: true
  },
  roomId: {
    type: String,
    required: true,
    ref: 'Room',
    index: true // Critical for room queries
  },
  deckType: {
    type: String,
    enum: ['fibonacci', 'powersOfTwo', 'tShirt', 'custom', 'planning', 'modified'],
    default: 'powersOfTwo'
  },
  customDeck: [{ type: String }],
  isActive: {
    type: Boolean,
    default: true,
    index: true // For finding active sessions
  },
  votesRevealed: {
    type: Boolean,
    default: false
  },
  phase: {
    type: String,
    enum: ['starting', 'voting', 'discussing', 'finalizing', 'completed'],
    default: 'starting',
    index: true
  },
  
  // Timer fields
  timerDuration: { type: Number, default: 300 }, // 5 minutes default
  timerStartedAt: { type: Date },
  timerEndsAt: { type: Date },
  isPaused: { type: Boolean, default: false },
  pausedAt: { type: Date },
  pausedDuration: { type: Number, default: 0 },
  
  // Session management
  createdBy: { type: String, required: true, index: true },
  facilitatorId: { type: String, required: true },
  hostId: { type: String },
  
  // Participants
  invitedParticipants: [{ type: String }],
  activeParticipants: [participantSchema],
  
  // Configuration
  settings: {
    type: sessionSettingsSchema,
    default: () => ({})
  },
  
  // Results
  consensus: {
    type: consensusSchema,
    default: () => ({})
  },
  
  // Voting rounds
  rounds: [roundSchema],
  currentRound: { type: Number, default: 1 },
  
  // Metrics
  metrics: {
    type: metricsSchema,
    default: () => ({})
  },
  
  // Discussion
  discussion: {
    type: discussionSchema,
    default: () => ({})
  },
  
  // Timestamps
  startedAt: { type: Date },
  completedAt: { type: Date },
  archivedAt: { type: Date }
}, {
  timestamps: true,
  _id: false,
  collection: 'voting_sessions'
});

// Compound indexes for performance
votingSessionSchema.index({ roomId: 1, isActive: 1 }); // Active sessions by room
votingSessionSchema.index({ storyId: 1, createdAt: -1 }); // Sessions for a story
votingSessionSchema.index({ roomId: 1, phase: 1 }); // Sessions by phase
votingSessionSchema.index({ createdBy: 1, createdAt: -1 }); // User's sessions
votingSessionSchema.index({ facilitatorId: 1, isActive: 1 }); // Facilitator's active sessions
votingSessionSchema.index({ isActive: 1, timerEndsAt: 1 }); // Timer expiration queries

// Virtual fields for legacy compatibility
votingSessionSchema.virtual('id').get(function() {
  return this._id;
});

votingSessionSchema.virtual('timerStartedAt_string').get(function() {
  return this.timerStartedAt?.toISOString() || null;
});

// Instance methods
votingSessionSchema.methods.startTimer = async function(duration?: number) {
  this.timerDuration = duration || this.timerDuration;
  this.timerStartedAt = new Date();
  this.timerEndsAt = new Date(Date.now() + (this.timerDuration * 1000));
  this.isPaused = false;
  this.phase = 'voting';
  
  if (!this.startedAt) {
    this.startedAt = new Date();
  }
  
  return await this.save();
};

votingSessionSchema.methods.pauseTimer = async function() {
  if (this.timerStartedAt && !this.isPaused) {
    this.isPaused = true;
    this.pausedAt = new Date();
    return await this.save();
  }
  return this;
};

votingSessionSchema.methods.resumeTimer = async function() {
  if (this.isPaused && this.pausedAt) {
    const pauseDuration = Date.now() - this.pausedAt.getTime();
    this.pausedDuration += pauseDuration;
    this.timerEndsAt = new Date((this.timerEndsAt?.getTime() || 0) + pauseDuration);
    this.isPaused = false;
    this.pausedAt = undefined;
    return await this.save();
  }
  return this;
};

votingSessionSchema.methods.stopTimer = async function() {
  this.timerStartedAt = undefined;
  this.timerEndsAt = undefined;
  this.isPaused = false;
  this.pausedAt = undefined;
  return await this.save();
};

votingSessionSchema.methods.addParticipant = async function(userId: string, userName: string) {
  const existingIndex = this.activeParticipants.findIndex((p: any) => p.userId === userId);
  
  if (existingIndex === -1) {
    this.activeParticipants.push({
      userId,
      userName,
      joinedAt: new Date(),
      lastActivity: new Date(),
      hasVoted: false,
      isOnline: true
    });
  } else {
    this.activeParticipants[existingIndex].isOnline = true;
    this.activeParticipants[existingIndex].lastActivity = new Date();
  }
  
  this.metrics.totalParticipants = this.activeParticipants.length;
  
  return await this.save();
};

votingSessionSchema.methods.removeParticipant = async function(userId: string) {
  const participantIndex = this.activeParticipants.findIndex((p: any) => p.userId === userId);
  if (participantIndex !== -1) {
    this.activeParticipants[participantIndex].isOnline = false;
  }
  return await this.save();
};

votingSessionSchema.methods.revealVotes = async function() {
  this.votesRevealed = true;
  this.phase = 'discussing';
  
  // Calculate consensus
  await this.calculateConsensus();
  
  return await this.save();
};

votingSessionSchema.methods.calculateConsensus = async function() {
  const VoteModel = mongoose.model('Vote');
  const votes = await VoteModel.find({ 
    sessionId: this._id,
    isActive: true 
  });
  
  if (votes.length === 0) {
    return this;
  }
  
  // Count vote values
  const voteValues: Record<string, number> = {};
  votes.forEach((vote: any) => {
    voteValues[vote.voteValue] = (voteValues[vote.voteValue] || 0) + 1;
  });
  
  // Find most common vote
  const sortedVotes = Object.entries(voteValues)
    .sort(([,a], [,b]) => b - a);
  
  const mostCommonVote = sortedVotes[0];
  const consensusCount = mostCommonVote[1];
  const consensusPercentage = (consensusCount / votes.length) * 100;
  
  this.consensus = {
    achieved: consensusPercentage >= this.settings.consensusThreshold,
    percentage: consensusPercentage,
    finalEstimate: mostCommonVote[0],
    confidence: Math.min(consensusPercentage, 100),
    agreeingVoters: votes
      .filter((vote: any) => vote.voteValue === mostCommonVote[0])
      .map((vote: any) => vote.userId),
    outlierVoters: votes
      .filter((vote: any) => vote.voteValue !== mostCommonVote[0])
      .map((vote: any) => vote.userId)
  };
  
  // Update current round
  const currentRoundIndex = this.rounds.findIndex((r: any) => r.roundNumber === this.currentRound);
  if (currentRoundIndex !== -1) {
    this.rounds[currentRoundIndex].voteCount = votes.length;
    this.rounds[currentRoundIndex].consensus = this.consensus.achieved;
    this.rounds[currentRoundIndex].completedAt = new Date();
  }
  
  return this;
};

votingSessionSchema.methods.finalizeEstimate = async function(estimate: string, facilitatorId: string) {
  if (!this.canUserManage(facilitatorId)) {
    throw new Error('Only facilitators can finalize estimates');
  }
  
  this.consensus.finalEstimate = estimate;
  this.consensus.achieved = true;
  this.phase = 'completed';
  this.isActive = false;
  this.completedAt = new Date();
  
  // Update story with the estimate
  const StoryModel = mongoose.model('Story');
  await StoryModel.findByIdAndUpdate(this.storyId, {
    estimate: {
      value: estimate,
      confidence: this.consensus.confidence,
      consensusReached: this.consensus.achieved,
      finalizedAt: new Date(),
      finalizedBy: facilitatorId
    },
    status: 'estimated'
  });
  
  return await this.save();
};

votingSessionSchema.methods.startNewRound = async function() {
  this.currentRound += 1;
  this.votesRevealed = false;
  this.phase = 'voting';
  
  // Add new round
  this.rounds.push({
    roundNumber: this.currentRound,
    startedAt: new Date(),
    voteCount: 0,
    consensus: false
  });
  
  // Reset participant voting status
  this.activeParticipants.forEach((participant: any) => {
    participant.hasVoted = false;
  });
  
  // Invalidate previous votes
  const VoteModel = mongoose.model('Vote');
  await VoteModel.updateMany(
    { sessionId: this._id },
    { isActive: false }
  );
  
  return await this.save();
};

votingSessionSchema.methods.canUserManage = function(userId: string) {
  return this.facilitatorId === userId || this.createdBy === userId || this.hostId === userId;
};

votingSessionSchema.methods.getActiveParticipants = function() {
  return this.activeParticipants.filter((p: any) => p.isOnline);
};

// Legacy compatibility
votingSessionSchema.methods.toJSON = function() {
  const session = this.toObject({ virtuals: true });
  
  // Ensure backward compatibility
  session.id = session._id;
  session.timerStartedAt = this.timerStartedAt?.toISOString() || null;
  
  // Clean up
  delete session.__v;
  
  return session;
};

// Static methods
votingSessionSchema.statics.findActiveByRoom = function(roomId: string) {
  return this.find({
    roomId,
    isActive: true
  }).sort({ createdAt: -1 });
};

votingSessionSchema.statics.findByRoom = function(roomId: string) {
  return this.find({ roomId }).sort({ createdAt: -1 });
};

votingSessionSchema.statics.findByStory = function(storyId: string) {
  return this.find({ storyId }).sort({ createdAt: -1 });
};

votingSessionSchema.statics.createForStory = function(storyId: string, roomId: string, facilitatorId: string, options: any = {}) {
  return this.create({
    storyId,
    roomId,
    facilitatorId,
    createdBy: facilitatorId,
    deckType: options.deckType || 'powersOfTwo',
    customDeck: options.customDeck,
    settings: {
      ...options.settings
    },
    rounds: [{
      roundNumber: 1,
      startedAt: new Date(),
      voteCount: 0,
      consensus: false
    }]
  });
};

// Pre-save middleware
votingSessionSchema.pre('save', function(next) {
  // Calculate total duration if session is completed
  if (this.completedAt && this.startedAt) {
    this.metrics.totalDuration = this.completedAt.getTime() - this.startedAt.getTime() - this.pausedDuration;
  }
  
  // Update participation rate
  if (this.invitedParticipants.length > 0) {
    const activeCount = this.activeParticipants.filter((p: any) => p.isOnline).length;
    this.metrics.participationRate = (activeCount / this.invitedParticipants.length) * 100;
  }
  
  next();
});

// Post-save middleware for real-time updates
votingSessionSchema.post('save', function(doc) {
  const globalIo = (global as any).io;
  if (globalIo) {
    globalIo.to(doc.roomId).emit('voting_session_updated', {
      id: doc._id,
      storyId: doc.storyId,
      deckType: doc.deckType,
      isActive: doc.isActive,
      votesRevealed: doc.votesRevealed,
      timerDuration: doc.timerDuration,
      timerStartedAt: doc.timerStartedAt?.toISOString() || null,
      createdBy: doc.createdBy,
      createdAt: doc.createdAt.toISOString()
    });
  }
});

export default mongoose.model<IVotingSession>('VotingSession', votingSessionSchema);
