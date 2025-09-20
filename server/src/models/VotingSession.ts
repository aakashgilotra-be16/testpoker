import mongoose, { Document, Schema } from 'mongoose';

export interface IVote {
  userId: string;
  displayName: string;
  voteValue: string;
  submittedAt: Date;
}

export interface IVotingSession extends Document {
  roomId: string;
  storyId: mongoose.Types.ObjectId;
  deckType: 'fibonacci' | 'powersOfTwo' | 'tShirt' | 'custom';
  customDeck: string[];
  isActive: boolean;
  votesRevealed: boolean;
  timerDuration: number;
  timerStartedAt: Date | null;
  votes: IVote[];
  createdBy: string;
  sessionSettings: {
    autoReveal: boolean;
    allowChangeVote: boolean;
    showVoteCount: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  submitVote(userId: string, displayName: string, voteValue: string): Promise<this>;
  removeVote(userId: string): Promise<this>;
  getVoteStatistics(): any;
  canUserVote(userId: string): boolean;
  hasUserVoted(userId: string): boolean;
}

const voteSchema = new Schema<IVote>({
  userId: { type: String, required: true },
  displayName: { type: String, required: true },
  voteValue: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now }
});

const votingSessionSchema = new Schema<IVotingSession>({
  // Room reference for isolation
  roomId: {
    type: String,
    required: true,
    ref: 'Room',
    index: true
  },
  
  // Story reference
  storyId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Story',
    index: true
  },
  
  // Session configuration
  deckType: {
    type: String,
    enum: ['fibonacci', 'powersOfTwo', 'tShirt', 'custom'],
    default: 'powersOfTwo'
  },
  
  customDeck: [{
    type: String
  }],
  
  // Session state
  isActive: {
    type: Boolean,
    default: true
  },
  
  votesRevealed: {
    type: Boolean,
    default: false
  },
  
  // Timer functionality
  timerDuration: {
    type: Number,
    default: 60, // seconds
    min: 10,
    max: 600
  },
  
  timerStartedAt: {
    type: Date,
    default: null
  },
  
  // Votes for this session
  votes: [voteSchema],
  
  // Session metadata
  createdBy: {
    type: String,
    required: true
  },
  
  sessionSettings: {
    autoReveal: {
      type: Boolean,
      default: false
    },
    allowChangeVote: {
      type: Boolean,
      default: true
    },
    showVoteCount: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Compound indexes for efficient queries
votingSessionSchema.index({ roomId: 1, storyId: 1 });
votingSessionSchema.index({ roomId: 1, isActive: 1 });

// Instance methods
votingSessionSchema.methods.toJSON = function() {
  const session = this.toObject();
  // Convert MongoDB _id to id for frontend compatibility
  session.id = session._id.toString();
  delete session._id;
  delete session.__v;
  return session;
};

votingSessionSchema.methods.submitVote = function(userId: string, displayName: string, voteValue: string) {
  // Remove existing vote from this user
  this.votes = this.votes.filter((vote: IVote) => vote.userId !== userId);
  
  // Add new vote
  this.votes.push({
    userId,
    displayName,
    voteValue,
    submittedAt: new Date()
  });
  
  return this.save();
};

votingSessionSchema.methods.removeVote = function(userId: string) {
  this.votes = this.votes.filter((vote: IVote) => vote.userId !== userId);
  return this.save();
};

votingSessionSchema.methods.getVoteStatistics = function() {
  const votes = this.votesRevealed ? this.votes : [];
  const voteMap: Record<string, number> = {};
  
  votes.forEach((vote: IVote) => {
    if (voteMap[vote.voteValue]) {
      voteMap[vote.voteValue]++;
    } else {
      voteMap[vote.voteValue] = 1;
    }
  });
  
  return {
    totalVotes: votes.length,
    voteDistribution: voteMap,
    votes: this.votesRevealed ? votes : votes.map((v: IVote) => ({ userId: v.userId, displayName: v.displayName }))
  };
};

votingSessionSchema.methods.canUserVote = function(userId: string) {
  return this.isActive && !this.votesRevealed;
};

votingSessionSchema.methods.hasUserVoted = function(userId: string) {
  return this.votes.some((vote: IVote) => vote.userId === userId);
};

// Static methods for room-based operations
votingSessionSchema.statics.findByRoom = function(roomId: string) {
  return this.find({ roomId }).populate('storyId').sort({ createdAt: -1 });
};

votingSessionSchema.statics.findActiveByRoom = function(roomId: string) {
  return this.find({ roomId, isActive: true }).populate('storyId');
};

votingSessionSchema.statics.findByStory = function(roomId: string, storyId: string) {
  return this.findOne({ roomId, storyId }).populate('storyId');
};

votingSessionSchema.statics.createForStory = function(roomId: string, storyId: string, sessionData: any, createdBy: string) {
  return this.create({
    roomId,
    storyId,
    deckType: sessionData.deckType || 'powersOfTwo',
    customDeck: sessionData.customDeck || [],
    timerDuration: sessionData.timerDuration || 60,
    sessionSettings: sessionData.sessionSettings || {},
    createdBy,
    isActive: true,
    votesRevealed: false
  });
};

export default mongoose.model<IVotingSession>('VotingSession', votingSessionSchema);
