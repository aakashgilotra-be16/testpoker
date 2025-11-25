import Story, { IStory } from '../models/Story';
import Room from '../models/Room';
import { Types } from 'mongoose';

export interface CreateStoryData {
  title: string;
  description?: string;
  acceptanceCriteria?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  businessValue?: number;
  complexity?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  assignedTo?: string;
}

export interface UpdateStoryData {
  title?: string;
  description?: string;
  acceptanceCriteria?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'backlog' | 'ready' | 'voting' | 'voted' | 'estimated' | 'completed' | 'archived';
  businessValue?: number;
  complexity?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  assignedTo?: string;
}

export interface StoryFilters {
  status?: string | string[];
  priority?: string | string[];
  assignedTo?: string;
  tags?: string[];
  createdBy?: string;
  search?: string;
}

export class StoryService {
  // Cache for frequently accessed stories
  private static storyCache = new Map<string, IStory>();
  private static cacheExpiry = new Map<string, number>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Create a new story in a room
   */
  static async createStory(
    roomId: string, 
    storyData: CreateStoryData, 
    createdBy: string
  ): Promise<IStory> {
    try {
      // Validate room exists
      const room = await Room.findById(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      // Create story with enhanced data
      const story = await Story.create({
        roomId,
        title: storyData.title,
        description: storyData.description || '',
        acceptanceCriteria: storyData.acceptanceCriteria || [],
        priority: storyData.priority || 'medium',
        createdBy,
        created_by: createdBy, // Legacy compatibility
        status: 'backlog',
        businessValue: storyData.businessValue,
        complexity: storyData.complexity,
        riskLevel: storyData.riskLevel || 'low',
        tags: storyData.tags || [],
        assignedTo: storyData.assignedTo,
        metrics: {
          totalVotes: 0,
          consensusReached: false
        }
      });

      // Update room activity
      await Room.findByIdAndUpdate(roomId, { lastActivity: new Date() });

      // Clear cache for this room
      this.clearRoomCache(roomId);

      return story;
    } catch (error) {
      throw new Error(`Failed to create story: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create multiple stories in bulk
   */
  static async createBulkStories(
    roomId: string, 
    storiesData: CreateStoryData[], 
    createdBy: string
  ): Promise<IStory[]> {
    try {
      // Validate room exists
      const room = await Room.findById(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      // Prepare stories for bulk insertion
      const stories = storiesData.map(storyData => ({
        roomId,
        title: storyData.title,
        description: storyData.description || '',
        acceptanceCriteria: storyData.acceptanceCriteria || [],
        priority: storyData.priority || 'medium' as const,
        createdBy,
        created_by: createdBy, // Legacy compatibility
        status: 'backlog' as const,
        businessValue: storyData.businessValue,
        complexity: storyData.complexity,
        riskLevel: storyData.riskLevel || 'low' as const,
        tags: storyData.tags || [],
        assignedTo: storyData.assignedTo,
        metrics: {
          totalVotes: 0,
          consensusReached: false
        }
      }));

      const createdStories = await Story.insertMany(stories);

      // Update room activity
      await Room.findByIdAndUpdate(roomId, { lastActivity: new Date() });

      // Clear cache for this room
      this.clearRoomCache(roomId);

      return createdStories as IStory[];
    } catch (error) {
      throw new Error(`Failed to create bulk stories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get stories for a room with filtering and pagination
   */
  static async getStoriesByRoom(
    roomId: string,
    filters: StoryFilters = {},
    page = 1,
    limit = 50,
    useCache = true
  ): Promise<{ stories: IStory[]; total: number; page: number; totalPages: number }> {
    try {
      const cacheKey = `room_${roomId}_${JSON.stringify(filters)}_${page}_${limit}`;
      
      // Check cache first
      if (useCache && this.storyCache.has(cacheKey)) {
        const expiry = this.cacheExpiry.get(cacheKey) || 0;
        if (Date.now() < expiry) {
          const cachedData = this.storyCache.get(cacheKey) as any;
          return cachedData;
        }
      }

      // Build query
      const query: any = { 
        roomId,
        status: { $ne: 'archived' } 
      };

      // Apply filters
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query.status = { $in: filters.status };
        } else {
          query.status = filters.status;
        }
      }

      if (filters.priority) {
        if (Array.isArray(filters.priority)) {
          query.priority = { $in: filters.priority };
        } else {
          query.priority = filters.priority;
        }
      }

      if (filters.assignedTo) {
        query.assignedTo = filters.assignedTo;
      }

      if (filters.createdBy) {
        query.createdBy = filters.createdBy;
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      if (filters.search) {
        query.$text = { $search: filters.search };
      }

      // Execute query with pagination
      const [stories, total] = await Promise.all([
        Story.find(query)
          .sort({ priority: -1, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        Story.countDocuments(query)
      ]);

      const result = {
        stories,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };

      // Cache result
      if (useCache) {
        this.storyCache.set(cacheKey, result as any);
        this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to get stories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a single story by ID
   */
  static async getStoryById(storyId: string): Promise<IStory | null> {
    try {
      // Check cache first
      const cacheKey = `story_${storyId}`;
      if (this.storyCache.has(cacheKey)) {
        const expiry = this.cacheExpiry.get(cacheKey) || 0;
        if (Date.now() < expiry) {
          return this.storyCache.get(cacheKey) || null;
        }
      }

      const story = await Story.findById(storyId);
      
      if (story) {
        // Cache the story
        this.storyCache.set(cacheKey, story);
        this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);
      }

      return story;
    } catch (error) {
      throw new Error(`Failed to get story: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a story
   */
  static async updateStory(
    storyId: string, 
    updateData: UpdateStoryData, 
    updatedBy: string
  ): Promise<IStory | null> {
    try {
      const story = await Story.findById(storyId);
      if (!story) {
        throw new Error('Story not found');
      }

      // Check permissions (basic check - can be enhanced)
      if (!story.canUserEdit(updatedBy)) {
        throw new Error('Insufficient permissions to edit this story');
      }

      // Update the story
      const updatedStory = await Story.findByIdAndUpdate(
        storyId,
        { 
          ...updateData, 
          updated_by: updatedBy // Legacy compatibility
        },
        { new: true }
      );

      if (updatedStory) {
        // Update room activity
        await Room.findByIdAndUpdate(updatedStory.roomId, { lastActivity: new Date() });

        // Clear cache
        this.clearStoryCache(storyId);
        this.clearRoomCache(updatedStory.roomId);
      }

      return updatedStory;
    } catch (error) {
      throw new Error(`Failed to update story: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete/Archive a story
   */
  static async deleteStory(storyId: string, deletedBy: string): Promise<boolean> {
    try {
      const story = await Story.findById(storyId);
      if (!story) {
        throw new Error('Story not found');
      }

      // Check permissions
      if (!story.canUserEdit(deletedBy)) {
        throw new Error('Insufficient permissions to delete this story');
      }

      // Soft delete by archiving
      await Story.findByIdAndUpdate(
        storyId,
        { 
          status: 'archived',
          archivedAt: new Date(),
          updated_by: deletedBy
        }
      );

      // Update room activity
      await Room.findByIdAndUpdate(story.roomId, { lastActivity: new Date() });

      // Clear cache
      this.clearStoryCache(storyId);
      this.clearRoomCache(story.roomId);

      return true;
    } catch (error) {
      throw new Error(`Failed to delete story: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a comment to a story
   */
  static async addComment(
    storyId: string, 
    commentData: { content: string; authorId: string; authorName: string }
  ): Promise<IStory | null> {
    try {
      const story = await Story.findById(storyId);
      if (!story) {
        throw new Error('Story not found');
      }

      await story.addComment(commentData);

      // Clear cache
      this.clearStoryCache(storyId);

      return story;
    } catch (error) {
      throw new Error(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update story status
   */
  static async updateStoryStatus(
    storyId: string, 
    status: string, 
    updatedBy: string
  ): Promise<IStory | null> {
    try {
      const story = await Story.findById(storyId);
      if (!story) {
        throw new Error('Story not found');
      }

      await story.updateStatus(status, updatedBy);

      // Clear cache
      this.clearStoryCache(storyId);
      this.clearRoomCache(story.roomId);

      return story;
    } catch (error) {
      throw new Error(`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get stories that are currently being voted on
   */
  static async getActiveVotingStories(roomId?: string): Promise<IStory[]> {
    try {
      const query: any = { status: 'voting' };
      if (roomId) {
        query.roomId = roomId;
      }

      return await Story.find(query)
        .sort({ lastVotedAt: -1 });
    } catch (error) {
      throw new Error(`Failed to get voting stories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set final estimate for a story
   */
  static async setStoryEstimate(
    storyId: string, 
    estimate: string, 
    confidence: number, 
    finalizedBy: string
  ): Promise<IStory | null> {
    try {
      const story = await Story.findByIdAndUpdate(
        storyId,
        {
          estimate: {
            value: estimate,
            confidence,
            consensusReached: true,
            finalizedAt: new Date(),
            finalizedBy
          },
          final_points: estimate, // Legacy compatibility
          status: 'estimated'
        },
        { new: true }
      );

      if (story) {
        // Clear cache
        this.clearStoryCache(storyId);
        this.clearRoomCache(story.roomId);
      }

      return story;
    } catch (error) {
      throw new Error(`Failed to set estimate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get story analytics for a room
   */
  static async getRoomStoryAnalytics(roomId: string): Promise<any> {
    try {
      const analytics = await Story.aggregate([
        { $match: { roomId, status: { $ne: 'archived' } } },
        {
          $group: {
            _id: null,
            totalStories: { $sum: 1 },
            backlogStories: {
              $sum: { $cond: [{ $eq: ['$status', 'backlog'] }, 1, 0] }
            },
            readyStories: {
              $sum: { $cond: [{ $eq: ['$status', 'ready'] }, 1, 0] }
            },
            votingStories: {
              $sum: { $cond: [{ $eq: ['$status', 'voting'] }, 1, 0] }
            },
            estimatedStories: {
              $sum: { $cond: [{ $eq: ['$status', 'estimated'] }, 1, 0] }
            },
            completedStories: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            highPriorityStories: {
              $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
            },
            averageBusinessValue: { $avg: '$businessValue' },
            averageComplexity: { $avg: '$complexity' }
          }
        }
      ]);

      return analytics[0] || {};
    } catch (error) {
      throw new Error(`Failed to get analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search stories across rooms
   */
  static async searchStories(
    searchQuery: string, 
    roomIds?: string[], 
    limit = 20
  ): Promise<IStory[]> {
    try {
      const query: any = {
        $text: { $search: searchQuery },
        status: { $ne: 'archived' }
      };

      if (roomIds && roomIds.length > 0) {
        query.roomId = { $in: roomIds };
      }

      return await Story.find(query)
        .limit(limit)
        .sort({ score: { $meta: 'textScore' } });
    } catch (error) {
      throw new Error(`Failed to search stories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Cache management methods
  private static clearStoryCache(storyId: string): void {
    const cacheKey = `story_${storyId}`;
    this.storyCache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
  }

  private static clearRoomCache(roomId: string): void {
    // Clear all cache entries for this room
    for (const [key] of this.storyCache) {
      if (key.includes(`room_${roomId}_`)) {
        this.storyCache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }

  /**
   * Clear all cached data
   */
  static clearAllCache(): void {
    this.storyCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.storyCache.size,
      entries: Array.from(this.storyCache.keys())
    };
  }
}