import mongoose, { Document, Schema } from 'mongoose';

// Interface for TypeScript
export interface IRetrospective extends Document {
  _id: string;
  roomId: string; // Links to Room model
  name: string;
  description?: string;
  facilitatorId: string;
  participants: Array<{
    userId: string;
    name: string;
    displayName: string;
    joinedAt: Date;
    isOnline: boolean;
  }>;
  phase: 'gathering' | 'grouping' | 'voting' | 'action-items' | 'completed';
  settings: {
    allowAnonymous: boolean;
    timerDuration: number;
    maxItemsPerCategory: number;
    votingEnabled: boolean;
    votesPerPerson: number;
  };
  categories: Array<{
    id: string;
    name: string;
    color: string;
    description?: string;
    order: number;
  }>;
  items: Array<{
    id: string;
    categoryId: string;
    authorId: string;
    authorName?: string; // For anonymous items
    content: string;
    groupId?: string; // For grouped items
    votes: Array<{
      userId: string;
      userName: string;
      votedAt: Date;
    }>;
    isAnonymous: boolean;
    createdAt: Date;
  }>;
  groups: Array<{
    id: string;
    categoryId: string;
    name: string;
    description?: string;
    itemIds: string[];
    totalVotes: number;
    createdAt: Date;
  }>;
  actionItems: Array<{
    id: string;
    title: string;
    description: string;
    assigneeId?: string;
    assigneeName?: string;
    priority: 'low' | 'medium' | 'high';
    status: 'open' | 'in-progress' | 'completed';
    dueDate?: Date;
    createdAt: Date;
  }>;
  stats: {
    totalItems: number;
    totalVotes: number;
    totalGroups: number;
    totalActionItems: number;
    duration: number; // in minutes
    participationRate: number;
  };
  status: 'active' | 'completed' | 'archived';
  startedAt: Date;
  completedAt?: Date;
  lastActivity: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  addParticipant(userData: any): this;
  removeParticipant(userId: string): this;
  addItem(itemData: any): this;
  updatePhase(newPhase: string): this;
  groupItems(itemIds: string[], groupData: any): this;
  addActionItem(actionData: any): this;
  generateSummary(): any;
}

// Mongoose Schema
const RetrospectiveSchema = new Schema<IRetrospective>({
  roomId: {
    type: String,
    required: true,
    ref: 'Room'
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  facilitatorId: {
    type: String,
    required: true
  },
  participants: [{
    userId: { type: String, required: true },
    name: { type: String, required: true },
    displayName: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    isOnline: { type: Boolean, default: true }
  }],
  phase: {
    type: String,
    enum: ['gathering', 'grouping', 'voting', 'action-items', 'completed'],
    default: 'gathering'
  },
  settings: {
    allowAnonymous: { type: Boolean, default: true },
    timerDuration: { type: Number, default: 300 }, // 5 minutes default
    maxItemsPerCategory: { type: Number, default: 50 },
    votingEnabled: { type: Boolean, default: true },
    votesPerPerson: { type: Number, default: 3 }
  },
  categories: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: String, required: true },
    description: String,
    order: { type: Number, required: true }
  }],
  items: [{
    id: { type: String, required: true },
    categoryId: { type: String, required: true },
    authorId: { type: String, required: true },
    authorName: String,
    content: { type: String, required: true, maxlength: 500 },
    groupId: String,
    votes: [{
      userId: { type: String, required: true },
      userName: { type: String, required: true },
      votedAt: { type: Date, default: Date.now }
    }],
    isAnonymous: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  groups: [{
    id: { type: String, required: true },
    categoryId: { type: String, required: true },
    name: { type: String, required: true },
    description: String,
    itemIds: [String],
    totalVotes: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  }],
  actionItems: [{
    id: { type: String, required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    assigneeId: String,
    assigneeName: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'completed'],
      default: 'open'
    },
    dueDate: Date,
    createdAt: { type: Date, default: Date.now }
  }],
  stats: {
    totalItems: { type: Number, default: 0 },
    totalVotes: { type: Number, default: 0 },
    totalGroups: { type: Number, default: 0 },
    totalActionItems: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    participationRate: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  lastActivity: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  }
}, {
  timestamps: true,
  collection: 'retrospectives'
});

// Indexes for performance
RetrospectiveSchema.index({ roomId: 1 });
RetrospectiveSchema.index({ facilitatorId: 1 });
RetrospectiveSchema.index({ status: 1 });
RetrospectiveSchema.index({ lastActivity: 1 });
RetrospectiveSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Instance Methods
RetrospectiveSchema.methods.addParticipant = function(userData: any) {
  const existingParticipant = this.participants.find(p => p.userId === userData.userId);
  if (!existingParticipant) {
    this.participants.push({
      userId: userData.userId,
      name: userData.name,
      displayName: userData.displayName,
      joinedAt: new Date(),
      isOnline: true
    });
  } else {
    existingParticipant.isOnline = true;
  }
  this.lastActivity = new Date();
  return this;
};

RetrospectiveSchema.methods.removeParticipant = function(userId: string) {
  const participant = this.participants.find(p => p.userId === userId);
  if (participant) {
    participant.isOnline = false;
  }
  this.lastActivity = new Date();
  return this;
};

RetrospectiveSchema.methods.addItem = function(itemData: any) {
  this.items.push({
    id: itemData.id || new mongoose.Types.ObjectId().toString(),
    categoryId: itemData.categoryId,
    authorId: itemData.authorId,
    authorName: itemData.authorName,
    content: itemData.content,
    votes: [],
    isAnonymous: itemData.isAnonymous || false,
    createdAt: new Date()
  });
  
  this.stats.totalItems = this.items.length;
  this.lastActivity = new Date();
  return this;
};

RetrospectiveSchema.methods.updatePhase = function(newPhase: string) {
  this.phase = newPhase as any;
  this.lastActivity = new Date();
  
  if (newPhase === 'completed') {
    this.completedAt = new Date();
    this.status = 'completed';
    
    // Calculate final stats
    this.stats.duration = Math.floor((this.completedAt.getTime() - this.startedAt.getTime()) / 60000);
    this.stats.participationRate = this.participants.length > 0 
      ? (this.items.length / this.participants.length) 
      : 0;
  }
  
  return this;
};

RetrospectiveSchema.methods.groupItems = function(itemIds: string[], groupData: any) {
  const group = {
    id: groupData.id || new mongoose.Types.ObjectId().toString(),
    categoryId: groupData.categoryId,
    name: groupData.name,
    description: groupData.description,
    itemIds: itemIds,
    totalVotes: 0,
    createdAt: new Date()
  };
  
  this.groups.push(group);
  
  // Update items to reference the group
  itemIds.forEach(itemId => {
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      item.groupId = group.id;
    }
  });
  
  this.stats.totalGroups = this.groups.length;
  this.lastActivity = new Date();
  return this;
};

RetrospectiveSchema.methods.addActionItem = function(actionData: any) {
  this.actionItems.push({
    id: actionData.id || new mongoose.Types.ObjectId().toString(),
    title: actionData.title,
    description: actionData.description,
    assigneeId: actionData.assigneeId,
    assigneeName: actionData.assigneeName,
    priority: actionData.priority || 'medium',
    status: 'open',
    dueDate: actionData.dueDate,
    createdAt: new Date()
  });
  
  this.stats.totalActionItems = this.actionItems.length;
  this.lastActivity = new Date();
  return this;
};

RetrospectiveSchema.methods.generateSummary = function() {
  return {
    retrospectiveId: this._id,
    name: this.name,
    facilitator: this.facilitatorId,
    duration: this.stats.duration,
    participantCount: this.participants.length,
    totalItems: this.stats.totalItems,
    totalVotes: this.stats.totalVotes,
    actionItemsCount: this.stats.totalActionItems,
    categories: this.categories.map(cat => ({
      name: cat.name,
      itemCount: this.items.filter(item => item.categoryId === cat.id).length
    })),
    topActionItems: this.actionItems
      .filter(action => action.priority === 'high')
      .slice(0, 5),
    completedAt: this.completedAt,
    status: this.status
  };
};

export const Retrospective = mongoose.model<IRetrospective>('Retrospective', RetrospectiveSchema);
