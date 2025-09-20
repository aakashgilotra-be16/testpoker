import mongoose, { Document, Schema } from 'mongoose';

export interface IStory extends Document {
  roomId: string;
  title: string;
  description: string;
  final_points: string | null;
  created_by: string;
  updated_by?: string;
  status: 'pending' | 'voting' | 'voted' | 'archived';
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

const storySchema = new Schema<IStory>({
  // Room reference for isolation
  roomId: {
    type: String,
    required: true,
    ref: 'Room',
    index: true // Index for efficient room-based queries
  },
  
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  description: {
    type: String,
    default: '',
    maxlength: 1000
  },
  
  final_points: {
    type: String,
    default: null
  },
  
  // Story metadata
  created_by: {
    type: String,
    required: true // User ID/name who created the story
  },
  
  updated_by: {
    type: String,
    default: null
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'voting', 'voted', 'archived'],
    default: 'pending'
  },
  
  // Priority for ordering
  priority: {
    type: Number,
    default: 0
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Compound index for efficient room + status queries
storySchema.index({ roomId: 1, status: 1 });
storySchema.index({ roomId: 1, createdAt: -1 }); // For chronological listing

// Instance methods
storySchema.methods.toJSON = function() {
  const story = this.toObject();
  // Convert MongoDB _id to id for frontend compatibility
  story.id = story._id.toString();
  delete story._id;
  delete story.__v;
  return story;
};

// Static methods for room-based operations
storySchema.statics.findByRoom = function(roomId: string) {
  return this.find({ roomId }).sort({ createdAt: -1 });
};

storySchema.statics.findByRoomAndStatus = function(roomId: string, status: string) {
  return this.find({ roomId, status }).sort({ createdAt: -1 });
};

storySchema.statics.createForRoom = function(roomId: string, storyData: any, createdBy: string) {
  return this.create({
    roomId,
    title: storyData.title,
    description: storyData.description || '',
    created_by: createdBy,
    status: 'pending'
  });
};

export default mongoose.model<IStory>('Story', storySchema);
