import VotingSession, { IVotingSession } from '../models/VotingSession';
import Vote, { IVote } from '../models/Vote';
import Story from '../models/Story';
import Room from '../models/Room';

export interface CreateVotingSessionData {
  storyId: string;
  deckType: 'fibonacci' | 'powersOfTwo' | 'tShirt' | 'custom' | 'planning' | 'modified';
  timerMinutes?: number;
  allowDiscussion: boolean;
  anonymousVoting?: boolean;
  customScale?: string[];
  description?: string;
  facilitatorId?: string;
}

export interface VoteData {
  value: string;
  confidence?: number;
  reasoning?: string;
  device?: {
    type: 'desktop' | 'mobile' | 'tablet';
    browser?: string;
    os?: string;
  };
}

export interface SessionFilters {
  status?: string | string[];
  storyId?: string;
  createdBy?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export class VotingService {
  // Cache for active sessions
  private static sessionCache = new Map<string, IVotingSession>();
  private static cacheExpiry = new Map<string, number>();
  private static readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes for active sessions

  /**
   * Create a new voting session
   */
  static async createVotingSession(
    roomId: string,
    sessionData: CreateVotingSessionData,
    createdBy: string
  ): Promise<IVotingSession> {
    try {
      // Validate story exists and can be voted on
      const story = await Story.findById(sessionData.storyId);
      if (!story) {
        throw new Error('Story not found');
      }

      if (story.roomId !== roomId) {
        throw new Error('Story does not belong to this room');
      }

      if (story.status === 'voting') {
        throw new Error('Story is already being voted on');
      }

      // Check for existing active session for this story
      const existingSession = await VotingSession.findOne({
        storyId: sessionData.storyId,
        isActive: true
      });

      if (existingSession) {
        throw new Error('Active voting session already exists for this story');
      }

      // Create the voting session
      const session = await VotingSession.create({
        roomId,
        storyId: sessionData.storyId,
        deckType: sessionData.deckType,
        timerDuration: sessionData.timerMinutes ? sessionData.timerMinutes * 60 : 300,
        createdBy,
        facilitatorId: sessionData.facilitatorId || createdBy,
        isActive: true,
        phase: 'voting',
        currentRound: 1,
        votesRevealed: false
      });

      // Update story status to voting
      await Story.findByIdAndUpdate(sessionData.storyId, { 
        status: 'voting',
        lastVotedAt: new Date()
      });

      // Update room activity
      await Room.findByIdAndUpdate(roomId, { lastActivity: new Date() });

      return session;
    } catch (error) {
      throw new Error(`Failed to create voting session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cast a vote in a session
   */
  static async castVote(
    sessionId: string,
    userId: string,
    userName: string,
    voteData: VoteData
  ): Promise<IVote> {
    try {
      // Get the voting session
      const session = await this.getActiveSession(sessionId);
      if (!session) {
        throw new Error('Voting session not found or not active');
      }

      // Check if session is open for voting
      if (!session.isActive) {
        throw new Error('Voting session is not active');
      }

      // Check timer if enabled (using timerEndsAt field)
      if (session.timerEndsAt && new Date() > session.timerEndsAt) {
        throw new Error('Voting time has expired');
      }

      // Check if user already voted in this round
      const existingVote = await Vote.findOne({
        sessionId: session._id,
        userId,
        roundNumber: session.currentRound
      });

      if (existingVote) {
        throw new Error('User has already voted in this round');
      }

      // Create the vote
      const vote = await Vote.create({
        sessionId: session._id.toString(),
        storyId: session.storyId,
        roomId: session.roomId,
        userId,
        displayName: userName,
        voteValue: voteData.value,
        confidence: voteData.confidence || 3,
        reasoning: voteData.reasoning,
        roundNumber: session.currentRound,
        submittedAt: new Date(),
        isRevealedVote: false
      });

      // Update session participant tracking
      await session.addParticipant(userId, userName);

      // Clear session cache
      this.clearSessionCache(sessionId);

      // Check if all participants have voted
      await this.checkForAutoReveal(session._id.toString());

      return vote;
    } catch (error) {
      throw new Error(`Failed to cast vote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reveal votes for a session
   */
  static async revealVotes(
    sessionId: string,
    revealedBy: string
  ): Promise<{ votes: IVote[]; session: IVotingSession; consensus: any }> {
    try {
      const session = await this.getActiveSession(sessionId);
      if (!session) {
        throw new Error('Voting session not found');
      }

      // Get all votes for current round
      const votes = await Vote.find({
        sessionId: session._id.toString(),
        roundNumber: session.currentRound
      });

      if (votes.length === 0) {
        throw new Error('No votes to reveal');
      }

      // Mark votes as revealed (no need to update votes, just update session)
      // Note: We don't actually mark individual votes as revealed in this implementation

      // Calculate consensus
      const consensus = await this.calculateConsensus(votes);

      // Update session with consensus data and mark as revealed
      await VotingSession.findByIdAndUpdate(session._id, {
        votesRevealed: true,
        'consensus.achieved': consensus.achieved,
        'consensus.percentage': consensus.percentage,
        'consensus.finalEstimate': consensus.finalEstimate,
        'consensus.confidence': consensus.confidence,
        $push: {
          rounds: {
            roundNumber: session.currentRound,
            startedAt: session.startedAt || new Date(),
            completedAt: new Date(),
            voteCount: votes.length,
            averageVote: consensus.average,
            consensus: consensus.achieved
          }
        },
        consensusData: consensus,
        lastActivity: new Date()
      });

      // Clear cache
      this.clearSessionCache(sessionId);

      return {
        votes: await Vote.find({
          sessionId: session._id,
          roundNumber: session.currentRound
        }),
        session: await VotingSession.findById(session._id) as IVotingSession,
        consensus
      };
    } catch (error) {
      throw new Error(`Failed to reveal votes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start a new round of voting
   */
  static async startNewRound(
    sessionId: string,
    startedBy: string
  ): Promise<IVotingSession> {
    try {
      const session = await VotingSession.findById(sessionId);
      if (!session) {
        throw new Error('Voting session not found');
      }

      // Increment round
      const newRound = session.currentRound + 1;

      // Update session
      const updatedSession = await VotingSession.findByIdAndUpdate(
        sessionId,
        {
          currentRound: newRound,
          consensusData: null,
          timerStart: session.hasTimer ? new Date() : undefined,
          timerExpiry: session.hasTimer && session.timerMinutes 
            ? new Date(Date.now() + session.timerMinutes * 60 * 1000)
            : undefined,
          lastActivity: new Date()
        },
        { new: true }
      );

      // Clear cache
      this.clearSessionCache(sessionId);

      return updatedSession as IVotingSession;
    } catch (error) {
      throw new Error(`Failed to start new round: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * End voting session and finalize estimate
   */
  static async endVotingSession(
    sessionId: string,
    finalEstimate?: string,
    confidence?: number,
    endedBy?: string
  ): Promise<IVotingSession> {
    try {
      const session = await VotingSession.findById(sessionId);
      if (!session) {
        throw new Error('Voting session not found');
      }

      // Calculate final statistics
      const allVotes = await Vote.find({ sessionId: session._id });
      const sessionStats = await this.calculateSessionStatistics(allVotes);

      // Update session
      const updatedSession = await VotingSession.findByIdAndUpdate(
        sessionId,
        {
          status: 'completed',
          finalEstimate: finalEstimate || session.consensusData?.estimate,
          finalConfidence: confidence || session.consensusData?.confidence,
          completedAt: new Date(),
          completedBy: endedBy,
          sessionStats,
          lastActivity: new Date()
        },
        { new: true }
      );

      // Update story with final estimate
      if (finalEstimate) {
        await Story.findByIdAndUpdate(session.storyId, {
          status: 'estimated',
          final_points: finalEstimate, // Legacy compatibility
          estimate: {
            value: finalEstimate,
            confidence: confidence || 3,
            consensusReached: true,
            finalizedAt: new Date(),
            finalizedBy: endedBy || 'system'
          }
        });
      } else {
        await Story.findByIdAndUpdate(session.storyId, {
          status: 'voted'
        });
      }

      // Clear cache
      this.clearSessionCache(sessionId);

      return updatedSession as IVotingSession;
    } catch (error) {
      throw new Error(`Failed to end voting session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get active voting session for a story
   */
  static async getActiveSessionForStory(storyId: string): Promise<IVotingSession | null> {
    try {
      return await VotingSession.findOne({
        storyId,
        isActive: true
      });
    } catch (error) {
      throw new Error(`Failed to get active session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get voting sessions for a room with filtering
   */
  static async getSessionsByRoom(
    roomId: string,
    filters: SessionFilters = {},
    page = 1,
    limit = 20
  ): Promise<{ sessions: IVotingSession[]; total: number; page: number; totalPages: number }> {
    try {
      // Build query
      const query: any = { roomId };

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query.status = { $in: filters.status };
        } else {
          query.status = filters.status;
        }
      }

      if (filters.storyId) {
        query.storyId = filters.storyId;
      }

      if (filters.createdBy) {
        query.createdBy = filters.createdBy;
      }

      if (filters.dateRange) {
        query.createdAt = {
          $gte: filters.dateRange.start,
          $lte: filters.dateRange.end
        };
      }

      // Execute query with pagination
      const [sessions, total] = await Promise.all([
        VotingSession.find(query)
          .populate('storyId', 'title')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        VotingSession.countDocuments(query)
      ]);

      return {
        sessions,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error(`Failed to get sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get votes for a session
   */
  static async getSessionVotes(
    sessionId: string,
    round?: number,
    includeRevealed = true
  ): Promise<IVote[]> {
    try {
      const query: any = { sessionId };
      
      if (round !== undefined) {
        query.roundNumber = round;
      }

      if (!includeRevealed) {
        query.isRevealedVote = false;
      }

      return await Vote.find(query).sort({ submittedAt: 1 });
    } catch (error) {
      throw new Error(`Failed to get votes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get voting analytics for a room
   */
  static async getRoomVotingAnalytics(roomId: string): Promise<any> {
    try {
      const analytics = await VotingSession.aggregate([
        { $match: { roomId } },
        {
          $lookup: {
            from: 'votes',
            localField: '_id',
            foreignField: 'sessionId',
            as: 'votes'
          }
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            completedSessions: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            averageRounds: { $avg: '$currentRound' },
            totalVotes: { $sum: { $size: '$votes' } },
            averageVotesPerSession: { $avg: { $size: '$votes' } },
            commonVotingSystem: { $push: '$votingSystem' }
          }
        }
      ]);

      return analytics[0] || {};
    } catch (error) {
      throw new Error(`Failed to get analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get detailed session with votes
   */
  static async getSessionWithVotes(sessionId: string): Promise<any> {
    try {
      const session = await VotingSession.findById(sessionId)
        .populate('storyId', 'title description');
      
      if (!session) {
        return null;
      }

      const votes = await Vote.find({ sessionId })
        .sort({ roundNumber: 1, submittedAt: 1 });

      return {
        session,
        votes,
        votesByRound: this.groupVotesByRound(votes)
      };
    } catch (error) {
      throw new Error(`Failed to get session details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods

  private static async getActiveSession(sessionId: string): Promise<IVotingSession | null> {
    // Check cache first
    const cacheKey = `session_${sessionId}`;
    if (this.sessionCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (Date.now() < expiry) {
        return this.sessionCache.get(cacheKey) || null;
      }
    }

    const session = await VotingSession.findById(sessionId);
    
    if (session && session.isActive) {
      // Cache active session
      this.sessionCache.set(cacheKey, session);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);
    }

    return session;
  }

  private static async checkForAutoReveal(sessionId: string): Promise<void> {
    try {
      const session = await VotingSession.findById(sessionId);
      if (!session || !session.participants) return;

      const voteCount = await Vote.countDocuments({
        sessionId,
        roundNumber: session.currentRound
      });

      // Auto-reveal if all participants have voted
      if (voteCount >= session.participants.length && voteCount > 0) {
        // Small delay to ensure real-time updates
        setTimeout(() => {
          this.revealVotes(sessionId, 'system').catch(console.error);
        }, 1000);
      }
    } catch (error) {
      console.error('Auto-reveal check failed:', error);
    }
  }

  private static async calculateConsensus(votes: IVote[]): Promise<any> {
    if (votes.length === 0) return null;

    const values = votes.map((v: any) => v.value);
    const valueCount = values.reduce((acc: any, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});

    const mostCommon = Object.entries(valueCount)
      .sort(([, a], [, b]) => (b as number) - (a as number))[0];

    const consensusPercentage = ((mostCommon[1] as number) / votes.length) * 100;
    const averageConfidence = votes.reduce((sum: number, vote: any) => 
      sum + (vote.confidence || 3), 0) / votes.length;

    return {
      estimate: mostCommon[0],
      consensus: consensusPercentage >= 66.7, // 2/3 consensus
      consensusPercentage,
      confidence: Math.round(averageConfidence * 10) / 10,
      voteCounts: valueCount,
      totalVotes: votes.length
    };
  }

  private static async calculateSessionStatistics(votes: IVote[]): Promise<any> {
    if (votes.length === 0) return {};

    const rounds = [...new Set(votes.map((v: any) => v.round))].length;
    const participants = [...new Set(votes.map((v: any) => v.userId))].length;
    const averageConfidence = votes.reduce((sum: number, vote: any) => 
      sum + (vote.confidence || 3), 0) / votes.length;

    return {
      totalRounds: rounds,
      totalParticipants: participants,
      totalVotes: votes.length,
      averageConfidence: Math.round(averageConfidence * 10) / 10
    };
  }

  private static groupVotesByRound(votes: IVote[]): any {
    return votes.reduce((acc: any, vote: any) => {
      if (!acc[vote.round]) {
        acc[vote.round] = [];
      }
      acc[vote.round].push(vote);
      return acc;
    }, {});
  }

  private static clearSessionCache(sessionId: string): void {
    const cacheKey = `session_${sessionId}`;
    this.sessionCache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
  }

  /**
   * Clear all cached data
   */
  static clearAllCache(): void {
    this.sessionCache.clear();
    this.cacheExpiry.clear();
  }
}