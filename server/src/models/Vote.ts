import mongoose, { Document, Schema } from 'mongoose';

// Interface for TypeScript
export interface IVote extends Document {
  _id: string;
  sessionId: string;
  storyId: string;
  roomId: string;
  userId: string;
  displayName: string;
  voteValue: string;
  
  // Analytics and insights
  confidence: number; // 1-100 scale
  reasoning?: string; // Optional justification
  difficulty?: number; // 1-10 scale
  complexity?: number; // 1-10 scale
  risk?: number; // 1-10 scale
  
  // Timing analytics
  submittedAt: Date;
  timeToVote: number; // milliseconds from session start
  revisionCount: number; // How many times user changed vote
  
  // Context
  isActive: boolean; // For multi-round voting
  roundNumber: number;
  isRevealedVote: boolean; // Vote cast after reveal
  isPreviousRoundVote: boolean; // From previous round
  
  // Device and session info
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    screenSize?: string;
    timezone?: string;
  };
  
  // Voting patterns
  votingPatterns: {
    previousVotes: string[]; // Last 5 votes from this user
    averageVote?: number;
    consistency: number; // 0-100, how consistent the user's votes are
    speed: 'fast' | 'medium' | 'slow'; // Relative voting speed
  };
  
  // Metadata
  metadata: {
    sessionPhase: 'starting' | 'voting' | 'discussing' | 'finalizing';
    participantCount: number; // Total participants when vote was cast
    isFirstVote: boolean; // First vote in session
    isLastVote: boolean; // Triggered session completion
    voteOrder: number; // Order in which this vote was cast
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  calculateTimeToVote(sessionStartTime: Date): Promise<this>;
  updateConfidence(confidence: number, reasoning?: string): Promise<this>;
  markAsInactive(): Promise<this>;
  getVotingHistory(): Promise<any[]>;
  calculateConsistency(): Promise<number>;
  
  // Legacy compatibility
  id?: string;
}

const deviceInfoSchema = new Schema({
  userAgent: { type: String },
  platform: { type: String },
  screenSize: { type: String },
  timezone: { type: String }
}, { _id: false });

const votingPatternsSchema = new Schema({
  previousVotes: [{ type: String }], // Limited to last 5
  averageVote: { type: Number },
  consistency: { type: Number, default: 0, min: 0, max: 100 },
  speed: { type: String, enum: ['fast', 'medium', 'slow'], default: 'medium' }
}, { _id: false });

const metadataSchema = new Schema({
  sessionPhase: { 
    type: String, 
    enum: ['starting', 'voting', 'discussing', 'finalizing'], 
    default: 'voting' 
  },
  participantCount: { type: Number, default: 0 },
  isFirstVote: { type: Boolean, default: false },
  isLastVote: { type: Boolean, default: false },
  voteOrder: { type: Number, default: 0 }
}, { _id: false });

const voteSchema = new Schema<IVote>({
  _id: {
    type: String,
    required: true,
    default: () => 'vote_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 9)
  },
  sessionId: {
    type: String,
    required: true,
    ref: 'VotingSession',
    index: true // Critical for session queries
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
    index: true // Critical for room-based queries
  },
  userId: {
    type: String,
    required: true,
    index: true // For user analytics
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  voteValue: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20,
    index: true // For vote value analytics
  },
  
  // Analytics fields
  confidence: {
    type: Number,
    min: 1,
    max: 100,
    default: 50
  },
  reasoning: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  difficulty: {
    type: Number,
    min: 1,
    max: 10
  },
  complexity: {
    type: Number,
    min: 1,
    max: 10
  },
  risk: {
    type: Number,
    min: 1,
    max: 10
  },
  
  // Timing
  submittedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  timeToVote: {
    type: Number,
    default: 0 // milliseconds
  },
  revisionCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Context
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  roundNumber: {
    type: Number,
    default: 1,
    min: 1,
    index: true
  },
  isRevealedVote: {
    type: Boolean,
    default: false
  },
  isPreviousRoundVote: {
    type: Boolean,
    default: false
  },
  
  // Device info
  deviceInfo: deviceInfoSchema,
  
  // Patterns
  votingPatterns: {
    type: votingPatternsSchema,
    default: () => ({})
  },
  
  // Metadata
  metadata: {
    type: metadataSchema,
    default: () => ({})
  }
}, {
  timestamps: true,
  _id: false,
  collection: 'votes'
});

// Compound indexes for optimal performance
voteSchema.index({ roomId: 1, sessionId: 1 }); // Most common query
voteSchema.index({ sessionId: 1, userId: 1, isActive: 1 }); // User votes in session
voteSchema.index({ storyId: 1, roundNumber: 1, isActive: 1 }); // Story votes by round
voteSchema.index({ userId: 1, submittedAt: -1 }); // User voting history
voteSchema.index({ roomId: 1, submittedAt: -1 }); // Room voting timeline
voteSchema.index({ voteValue: 1, confidence: 1 }); // Value analysis
voteSchema.index({ isActive: 1, roundNumber: 1 }); // Active votes by round

// Text index for reasoning field
voteSchema.index({ reasoning: 'text' });

// Virtual fields for legacy compatibility
voteSchema.virtual('id').get(function() {
  return this._id;
});

// Instance methods
voteSchema.methods.calculateTimeToVote = async function(sessionStartTime: Date) {
  this.timeToVote = this.submittedAt.getTime() - sessionStartTime.getTime();
  
  // Determine voting speed relative to session average
  const VoteModel = mongoose.model('Vote');
  const sessionVotes = await VoteModel.find({ 
    sessionId: this.sessionId, 
    isActive: true 
  });
  
  if (sessionVotes.length > 1) {
    const averageTime = sessionVotes.reduce((sum, vote) => sum + vote.timeToVote, 0) / sessionVotes.length;
    
    if (this.timeToVote <= averageTime * 0.7) {
      this.votingPatterns.speed = 'fast';
    } else if (this.timeToVote >= averageTime * 1.5) {
      this.votingPatterns.speed = 'slow';
    } else {
      this.votingPatterns.speed = 'medium';
    }
  }
  
  return await this.save();
};

voteSchema.methods.updateConfidence = async function(confidence: number, reasoning?: string) {
  this.confidence = Math.max(1, Math.min(100, confidence));
  if (reasoning) {
    this.reasoning = reasoning;
  }
  this.revisionCount += 1;
  
  return await this.save();
};

voteSchema.methods.markAsInactive = async function() {
  this.isActive = false;
  this.isPreviousRoundVote = true;
  return await this.save();
};

voteSchema.methods.getVotingHistory = async function() {
  const VoteModel = mongoose.model('Vote');
  return await VoteModel.find({
    userId: this.userId,
    roomId: this.roomId
  }).sort({ submittedAt: -1 }).limit(10);
};

voteSchema.methods.calculateConsistency = async function() {
  const history = await this.getVotingHistory();
  
  if (history.length < 2) {
    this.votingPatterns.consistency = 100;
    return 100;
  }
  
  // Convert votes to numeric values for consistency calculation
  const numericVotes = history
    .map((vote: any) => parseFloat(vote.voteValue))
    .filter((value: number) => !isNaN(value));
  
  if (numericVotes.length < 2) {
    this.votingPatterns.consistency = 50;
    return 50;
  }
  
  // Calculate coefficient of variation (lower = more consistent)
  const mean = numericVotes.reduce((sum: number, val: number) => sum + val, 0) / numericVotes.length;
  const variance = numericVotes.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / numericVotes.length;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = mean === 0 ? 0 : standardDeviation / Math.abs(mean);
  
  // Convert to consistency score (0-100, higher = more consistent)
  const consistency = Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 50)));
  
  this.votingPatterns.consistency = Math.round(consistency);
  await this.save();
  
  return consistency;
};

// Legacy compatibility
voteSchema.methods.toJSON = function() {
  const vote = this.toObject({ virtuals: true });
  
  // Ensure backward compatibility
  vote.id = vote._id;
  
  // Clean up
  delete vote.__v;
  
  return vote;
};

// Static methods for analytics and reporting
voteSchema.statics.getSessionVotes = function(sessionId: string, activeOnly = true) {
  const query = { sessionId };
  if (activeOnly) {
    (query as any).isActive = true;
  }
  return this.find(query).sort({ submittedAt: 1 });
};

voteSchema.statics.getRoomVotingStats = function(roomId: string, timeRange?: { start: Date; end: Date }) {
  const query: any = { roomId, isActive: true };
  
  if (timeRange) {
    query.submittedAt = {
      $gte: timeRange.start,
      $lte: timeRange.end
    };
  }
  
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$voteValue',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' },
        avgTimeToVote: { $avg: '$timeToVote' },
        users: { $addToSet: '$userId' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

voteSchema.statics.getUserVotingPatterns = function(userId: string, limit = 50) {
  return this.find({ userId, isActive: true })
    .sort({ submittedAt: -1 })
    .limit(limit)
    .populate('sessionId', 'storyId roomId')
    .populate('storyId', 'title priority');
};

voteSchema.statics.getConsensusAnalysis = function(sessionId: string) {
  return this.aggregate([
    { $match: { sessionId, isActive: true } },
    {
      $group: {
        _id: '$voteValue',
        count: { $sum: 1 },
        voters: { $push: { userId: '$userId', confidence: '$confidence' } },
        avgConfidence: { $avg: '$confidence' },
        totalConfidence: { $sum: '$confidence' }
      }
    },
    { $sort: { count: -1, totalConfidence: -1 } }
  ]);
};

voteSchema.statics.createVote = function(voteData: any) {
  return this.create({
    sessionId: voteData.sessionId,
    storyId: voteData.storyId,
    roomId: voteData.roomId,
    userId: voteData.userId,
    displayName: voteData.displayName,
    voteValue: voteData.voteValue,
    confidence: voteData.confidence || 50,
    reasoning: voteData.reasoning,
    difficulty: voteData.difficulty,
    complexity: voteData.complexity,
    risk: voteData.risk,
    roundNumber: voteData.roundNumber || 1,
    deviceInfo: voteData.deviceInfo,
    metadata: {
      sessionPhase: voteData.sessionPhase || 'voting',
      participantCount: voteData.participantCount || 0,
      voteOrder: voteData.voteOrder || 0
    }
  });
};

// Pre-save middleware
voteSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Update previous votes array for pattern analysis
    const recentVotes = await this.getVotingHistory();
    this.votingPatterns.previousVotes = recentVotes
      .slice(0, 4) // Last 4 votes (excluding current)
      .map(vote => vote.voteValue);
    
    // Calculate average vote
    if (this.votingPatterns.previousVotes.length > 0) {
      const numericVotes = this.votingPatterns.previousVotes
        .map(vote => parseFloat(vote))
        .filter(val => !isNaN(val));
      
      if (numericVotes.length > 0) {
        this.votingPatterns.averageVote = numericVotes.reduce((sum, val) => sum + val, 0) / numericVotes.length;
      }
    }
    
    // Calculate consistency
    await this.calculateConsistency();
  }
  
  next();
});

// Post-save middleware for real-time updates
voteSchema.post('save', async function(doc) {
  // Update session participant voting status
  const VotingSessionModel = mongoose.model('VotingSession');
  const session = await VotingSessionModel.findById(doc.sessionId);
  
  if (session) {
    const participant = session.activeParticipants.find((p: any) => p.userId === doc.userId);
    if (participant) {
      participant.hasVoted = true;
      participant.lastActivity = new Date();
      await session.save();
    }
  }
  
  // Emit real-time update
  const globalIo = (global as any).io;
  if (globalIo) {
    const VoteModel = mongoose.model('Vote');
    const voteCount = await VoteModel.countDocuments({ 
      sessionId: doc.sessionId, 
      isActive: true 
    });
    
    globalIo.to(doc.roomId).emit('vote_submitted', {
      storyId: doc.storyId,
      voteCount,
      voterName: doc.displayName,
      userId: doc.userId,
      userVotes: [{ userId: doc.userId, displayName: doc.displayName }],
      totalUsers: session?.activeParticipants?.filter((p: any) => p.isOnline).length || 0
    });
  }
});

// Post-deleteOne middleware
voteSchema.post('deleteOne', async function(doc: any) {
  // Update session participant status
  const VotingSessionModel = mongoose.model('VotingSession');
  const session = await VotingSessionModel.findById(doc.sessionId);
  
  if (session) {
    const participant = session.activeParticipants.find((p: any) => p.userId === doc.userId);
    if (participant) {
      const VoteModel = mongoose.model('Vote');
      const hasOtherActiveVotes = await VoteModel.countDocuments({
        sessionId: doc.sessionId,
        userId: doc.userId,
        isActive: true
      });
      
      participant.hasVoted = hasOtherActiveVotes > 0;
      await session.save();
    }
  }
});

export default mongoose.model<IVote>('Vote', voteSchema);