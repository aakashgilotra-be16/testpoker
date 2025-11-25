import mongoose, { Document, Schema } from 'mongoose';

// Interface for TypeScript
export interface IStory extends Document {
  _id: string;
  title: string;
  description?: string;
  acceptanceCriteria: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'backlog' | 'ready' | 'voting' | 'voted' | 'estimated' | 'completed' | 'archived';
  estimate?: {
    value: string;
    confidence: number;
    consensusReached: boolean;
    finalizedAt: Date;
    finalizedBy: string;
  };
  roomId: string;
  createdBy: string;
  assignedTo?: string;
  tags: string[];
  businessValue?: number; // 1-100 scale
  complexity?: number; // 1-100 scale
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[]; // Array of story IDs
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    uploadedBy: string;
    uploadedAt: Date;
  }>;
  comments: Array<{
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: Date;
    updatedAt?: Date;
  }>;
  votingHistory: Array<{
    sessionId: string;
    startedAt: Date;
    completedAt?: Date;
    result?: string;
    participantCount: number;
    consensusReached: boolean;
  }>;
  metrics: {
    totalVotes: number;
    averageVote?: number;
    votingDuration?: number; // in milliseconds
    consensusReached: boolean;
    participationRate?: number; // percentage
  };
  
  // Timestamps and audit trail
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
  lastVotedAt?: Date;
  
  // Instance methods
  addComment(commentData: any): Promise<this>;
  updateStatus(newStatus: string, userId: string): Promise<this>;
  addVotingResult(sessionData: any): Promise<this>;
  calculateMetrics(): Promise<this>;
  canUserEdit(userId: string): boolean;
  getVotingHistory(): any[];
  
  // Legacy compatibility
  final_points?: string | null;
  created_by?: string;
  updated_by?: string;
}

const attachmentSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true, maxlength: 255 },
  url: { type: String, required: true },
  type: { type: String, required: true },
  uploadedBy: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const commentSchema = new Schema({
  id: { type: String, required: true },
  content: { type: String, required: true, maxlength: 2000 },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
}, { _id: false });

const votingHistorySchema = new Schema({
  sessionId: { type: String, required: true },
  startedAt: { type: Date, required: true },
  completedAt: { type: Date },
  result: { type: String },
  participantCount: { type: Number, required: true },
  consensusReached: { type: Boolean, default: false }
}, { _id: false });

const estimateSchema = new Schema({
  value: { type: String, required: true },
  confidence: { type: Number, min: 0, max: 100, default: 50 },
  consensusReached: { type: Boolean, default: false },
  finalizedAt: { type: Date, default: Date.now },
  finalizedBy: { type: String, required: true }
}, { _id: false });

const metricsSchema = new Schema({
  totalVotes: { type: Number, default: 0 },
  averageVote: { type: Number },
  votingDuration: { type: Number }, // milliseconds
  consensusReached: { type: Boolean, default: false },
  participationRate: { type: Number, min: 0, max: 100 }
}, { _id: false });

const storySchema = new Schema<IStory>({
  _id: { 
    type: String, 
    required: true,
    default: () => 'story_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 9)
  },
  title: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 200,
    index: true // For text search
  },
  description: { 
    type: String, 
    trim: true, 
    maxlength: 2000 
  },
  acceptanceCriteria: [{ 
    type: String, 
    maxlength: 500 
  }],
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    default: 'medium',
    index: true
  },
  status: { 
    type: String, 
    enum: ['backlog', 'ready', 'voting', 'voted', 'estimated', 'completed', 'archived'], 
    default: 'backlog',
    index: true
  },
  estimate: estimateSchema,
  roomId: { 
    type: String, 
    required: true, 
    ref: 'Room',
    index: true // Critical for room queries
  },
  createdBy: { 
    type: String, 
    required: true,
    index: true
  },
  assignedTo: { 
    type: String,
    index: true
  },
  tags: [{ 
    type: String, 
    trim: true, 
    maxlength: 50,
    index: true
  }],
  businessValue: { 
    type: Number, 
    min: 1, 
    max: 100 
  },
  complexity: { 
    type: Number, 
    min: 1, 
    max: 100 
  },
  riskLevel: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    default: 'low' 
  },
  dependencies: [{ 
    type: String, 
    ref: 'Story' 
  }],
  attachments: [attachmentSchema],
  comments: [commentSchema],
  votingHistory: [votingHistorySchema],
  metrics: {
    type: metricsSchema,
    default: () => ({})
  },
  
  // Legacy compatibility fields
  final_points: { type: String, default: null },
  created_by: { type: String },
  updated_by: { type: String },
  
  // Timestamps
  archivedAt: { type: Date },
  lastVotedAt: { type: Date, index: true }
}, {
  timestamps: true,
  _id: false,
  collection: 'stories'
});

// Compound indexes for optimal performance
storySchema.index({ roomId: 1, status: 1 }); // Most common query
storySchema.index({ roomId: 1, createdAt: -1 }); // For chronological listing
storySchema.index({ roomId: 1, priority: -1, createdAt: -1 }); // Priority-based queries
storySchema.index({ createdBy: 1, createdAt: -1 }); // User's stories
storySchema.index({ status: 1, lastVotedAt: -1 }); // Active voting sessions
storySchema.index({ tags: 1 }); // Tag-based filtering
storySchema.index({ title: 'text', description: 'text' }); // Full-text search

// Virtual fields for legacy compatibility
storySchema.virtual('id').get(function() {
  return this._id;
});

storySchema.virtual('created_at').get(function() {
  return this.createdAt?.toISOString();
});

storySchema.virtual('updated_at').get(function() {
  return this.updatedAt?.toISOString();
});

// Sync legacy fields
storySchema.pre('save', function(next) {
  // Sync legacy fields
  if (this.createdBy) {
    this.created_by = this.createdBy;
  }
  
  if (this.estimate?.value) {
    this.final_points = this.estimate.value;
  }
  
  if (this.isModified('status') && this.status === 'voting') {
    this.lastVotedAt = new Date();
  }
  
  next();
});

// Instance methods
storySchema.methods.addComment = async function(commentData: any) {
  this.comments.push({
    id: 'comment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    content: commentData.content,
    authorId: commentData.authorId,
    authorName: commentData.authorName,
    createdAt: new Date()
  });
  return await this.save();
};

storySchema.methods.updateStatus = async function(newStatus: string, userId: string) {
  this.status = newStatus;
  this.updated_by = userId;
  
  if (newStatus === 'archived') {
    this.archivedAt = new Date();
  }
  
  if (newStatus === 'voting') {
    this.lastVotedAt = new Date();
  }
  
  return await this.save();
};

storySchema.methods.addVotingResult = async function(sessionData: any) {
  this.votingHistory.push({
    sessionId: sessionData.sessionId,
    startedAt: sessionData.startedAt,
    completedAt: sessionData.completedAt || new Date(),
    result: sessionData.result,
    participantCount: sessionData.participantCount,
    consensusReached: sessionData.consensusReached || false
  });
  
  // Update metrics
  await this.calculateMetrics();
  return await this.save();
};

storySchema.methods.calculateMetrics = async function() {
  const VoteModel = mongoose.model('Vote');
  const votes = await VoteModel.find({ storyId: this._id }).sort({ createdAt: -1 });
  
  if (votes.length > 0) {
    this.metrics.totalVotes = votes.length;
    
    // Calculate average (for numeric votes)
    const numericVotes = votes
      .map((v: any) => parseFloat(v.voteValue))
      .filter((v: number) => !isNaN(v));
    
    if (numericVotes.length > 0) {
      this.metrics.averageVote = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
    }
    
    // Calculate voting duration from latest session
    const latestSession = this.votingHistory[this.votingHistory.length - 1];
    if (latestSession && latestSession.completedAt) {
      this.metrics.votingDuration = latestSession.completedAt.getTime() - latestSession.startedAt.getTime();
    }
  }
  
  return this;
};

storySchema.methods.canUserEdit = function(userId: string) {
  return this.createdBy === userId || this.assignedTo === userId;
};

storySchema.methods.getVotingHistory = function() {
  return this.votingHistory.sort((a: any, b: any) => b.startedAt.getTime() - a.startedAt.getTime());
};

// Legacy compatibility methods
storySchema.methods.toJSON = function() {
  const story = this.toObject({ virtuals: true });
  // Ensure backward compatibility
  story.id = story._id;
  story.final_points = this.estimate?.value || this.final_points || null;
  story.created_at = this.createdAt?.toISOString();
  story.updated_at = this.updatedAt?.toISOString();
  story.created_by = this.createdBy;
  
  // Clean up
  delete story.__v;
  
  return story;
};

// Static methods for common queries
storySchema.statics.findByRoom = function(roomId: string, options: any = {}) {
  const query = this.find({ roomId, status: { $ne: 'archived' } });
  
  if (options.status) {
    query.where({ status: options.status });
  }
  
  if (options.priority) {
    query.where({ priority: options.priority });
  }
  
  if (options.assignedTo) {
    query.where({ assignedTo: options.assignedTo });
  }
  
  if (options.tags && options.tags.length > 0) {
    query.where({ tags: { $in: options.tags } });
  }
  
  return query.sort({ priority: -1, createdAt: -1 });
};

storySchema.statics.findByRoomAndStatus = function(roomId: string, status: string) {
  return this.find({ roomId, status }).sort({ createdAt: -1 });
};

storySchema.statics.createForRoom = function(roomId: string, storyData: any, createdBy: string) {
  return this.create({
    roomId,
    title: storyData.title,
    description: storyData.description || '',
    createdBy,
    created_by: createdBy, // Legacy compatibility
    status: 'backlog',
    priority: storyData.priority || 'medium',
    acceptanceCriteria: storyData.acceptanceCriteria || [],
    tags: storyData.tags || [],
    businessValue: storyData.businessValue,
    complexity: storyData.complexity,
    riskLevel: storyData.riskLevel || 'low'
  });
};

storySchema.statics.findActiveVotingSessions = function(roomId?: string) {
  const query = this.find({ status: 'voting' });
  
  if (roomId) {
    query.where({ roomId });
  }
  
  return query.sort({ lastVotedAt: -1 });
};

// Post-save middleware for real-time updates
storySchema.post('save', function(doc) {
  // Emit socket event for real-time updates
  const globalIo = (global as any).io;
  if (globalIo) {
    globalIo.to(doc.roomId).emit('story_updated', {
      id: doc._id,
      title: doc.title,
      description: doc.description,
      final_points: doc.estimate?.value || null,
      created_at: doc.createdAt.toISOString(),
      updated_at: doc.updatedAt.toISOString()
    });
  }
});

export default mongoose.model<IStory>('Story', storySchema);
