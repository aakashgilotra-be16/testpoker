import mongoose, { Document, Schema } from 'mongoose';

// Interface for TypeScript
export interface IRoom extends Document {
  _id: string;
  name: string;
  description?: string;
  hostId: string;
  participants: Array<{
    userId: string;
    name: string;
    displayName: string;
    role: 'host' | 'facilitator' | 'participant';
    joinedAt: Date;
    lastActivity: Date;
    isOnline: boolean;
  }>;
  settings: {
    deckType: 'fibonacci' | 'powersOfTwo' | 'tShirt' | 'custom';
    customDeck: string[];
    allowSpectators: boolean;
    autoRevealVotes: boolean;
    timerDuration: number;
    allowChangeVote: boolean;
    showVoteCount: boolean;
  };
  stats: {
    totalSessions: number;
    totalVotes: number;
    averageVotingTime: number;
    completedStories: number;
  };
  status: 'active' | 'paused' | 'archived';
  lastActivity: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  addParticipant(userData: any): this;
  removeParticipant(userId: string): this;
  isHost(userId: string): boolean;
  canUserManage(userId: string): boolean;
  updateActivity(): this;
}

const participantSchema = new Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  displayName: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['host', 'facilitator', 'participant'], 
    default: 'participant' 
  },
  joinedAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false }
});

const roomSettingsSchema = new Schema({
  deckType: { 
    type: String, 
    enum: ['fibonacci', 'powersOfTwo', 'tShirt', 'custom'], 
    default: 'powersOfTwo' 
  },
  customDeck: [{ type: String }],
  allowSpectators: { type: Boolean, default: true },
  autoRevealVotes: { type: Boolean, default: false },
  timerDuration: { type: Number, default: 60, min: 10, max: 600 },
  allowChangeVote: { type: Boolean, default: true },
  showVoteCount: { type: Boolean, default: true }
});

const roomStatsSchema = new Schema({
  totalSessions: { type: Number, default: 0 },
  totalVotes: { type: Number, default: 0 },
  averageVotingTime: { type: Number, default: 0 },
  completedStories: { type: Number, default: 0 }
});

const roomSchema = new Schema<IRoom>({
  _id: { 
    type: String, 
    required: true,
    match: /^[A-Z0-9]{6}$/ // 6-character alphanumeric code
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  description: { 
    type: String, 
    maxlength: 500,
    trim: true
  },
  hostId: { 
    type: String, 
    required: true 
  },
  participants: [
    {
      type: participantSchema,
      validate: {
        validator: function(participants: any[]) {
          return participants.length <= 30;
        },
        message: 'Room cannot have more than 30 participants'
      }
    }
  ],
  settings: {
    type: roomSettingsSchema,
    default: () => ({})
  },
  stats: {
    type: roomStatsSchema,
    default: () => ({})
  },
  status: { 
    type: String, 
    enum: ['active', 'paused', 'archived'], 
    default: 'active' 
  },
  lastActivity: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: { 
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    index: { expireAfterSeconds: 0 } // TTL index for auto-deletion
  }
}, {
  timestamps: true,
  _id: false // We're using custom _id
});

// Instance methods
roomSchema.methods.addParticipant = function(userData: any) {
  // Check if user already exists
  const existingIndex = this.participants.findIndex((p: any) => p.userId === userData.userId);
  
  if (existingIndex !== -1) {
    // Update existing participant
    this.participants[existingIndex] = {
      ...this.participants[existingIndex],
      ...userData,
      lastActivity: new Date(),
      isOnline: true
    };
  } else {
    // Add new participant
    this.participants.push({
      userId: userData.userId,
      name: userData.name,
      displayName: userData.displayName,
      role: userData.role || 'participant',
      joinedAt: new Date(),
      lastActivity: new Date(),
      isOnline: true
    });
  }
  
  this.lastActivity = new Date();
  return this;
};

roomSchema.methods.removeParticipant = function(userId: string) {
  const participantIndex = this.participants.findIndex((p: any) => p.userId === userId);
  if (participantIndex !== -1) {
    this.participants.splice(participantIndex, 1);
    this.lastActivity = new Date();
  }
  return this;
};

roomSchema.methods.isHost = function(userId: string) {
  return this.hostId === userId;
};

roomSchema.methods.canUserManage = function(userId: string) {
  return this.isHost(userId);
};

roomSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  // Extend expiry by 1 day if room is active
  if (this.status === 'active') {
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  return this;
};

// Pre-save middleware
roomSchema.pre('save', function(this: IRoom, next) {
  this.lastActivity = new Date();
  next();
});

export default mongoose.model<IRoom>('Room', roomSchema);
