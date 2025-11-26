import mongoose from 'mongoose';
import Room from '../models/Room.js';
import Story from '../models/Story.js';
import VotingSession from '../models/VotingSession.js';
import { Retrospective } from '../models/Retrospective.js';

export async function testDatabaseCreation() {
  try {
    console.log('🧪 Testing database creation...');
    
    // Generate random test ID
    const testId = 'T' + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    // Test 1: Create a sample room
    const testRoom = new Room({
      _id: testId, // Random 6-character alphanumeric code
      name: 'Test Agile Team Room',
      description: 'Sample room to test database creation',
      hostId: 'test-host-123',
      participants: [{
        userId: 'test-user-1',
        name: 'Test User',
        displayName: 'Tester',
        role: 'host',
        joinedAt: new Date(),
        lastActivity: new Date(),
        isOnline: true
      }],
      settings: {
        deckType: 'fibonacci',
        customDeck: [],
        allowSpectators: true,
        autoRevealVotes: false,
        timerDuration: 300,
        allowChangeVote: true,
        showVoteCount: false
      },
      stats: {
        totalSessions: 0,
        totalVotes: 0,
        averageVotingTime: 0,
        completedStories: 0
      },
      status: 'active',
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    const savedRoom = await testRoom.save();
    console.log('✅ Room created:', savedRoom._id);

    // Test 2: Create a sample story
    const testStory = new Story({
      title: 'Test User Story',
      description: 'As a user, I want to test the database creation',
      roomId: savedRoom._id.toString(),
      created_by: 'test-user-1',
      status: 'pending',
      priority: 1
    });

    const savedStory = await testStory.save();
    console.log('✅ Story created:', savedStory._id);

    // Test 3: Create a sample retrospective
    const testRetrospective = new Retrospective({
      roomId: savedRoom._id.toString(),
      name: 'Sprint 1 Retrospective',
      description: 'Testing retrospective creation',
      facilitatorId: 'test-user-1',
      participants: [{
        userId: 'test-user-1',
        name: 'Test User',
        displayName: 'Tester',
        joinedAt: new Date(),
        isOnline: true
      }],
      categories: [
        {
          id: 'went-well',
          name: 'What went well?',
          color: '#10B981',
          description: 'Things that worked great',
          order: 1
        },
        {
          id: 'improve',
          name: 'What could be improved?',
          color: '#F59E0B',
          description: 'Areas for improvement',
          order: 2
        },
        {
          id: 'action-items',
          name: 'Action items',
          color: '#EF4444',
          description: 'Things to act on',
          order: 3
        }
      ]
    });

    const savedRetrospective = await testRetrospective.save();
    console.log('✅ Retrospective created:', savedRetrospective._id);

    // Test 4: List all collections
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }
    
    const collections = await db.listCollections().toArray();
    console.log('📋 Collections created:', collections.map(c => c.name));

    // Test 5: Get database stats
    const stats = await db.stats();
    console.log('📊 Database stats:', {
      dbName: stats.db,
      collections: stats.collections,
      objects: stats.objects,
      avgObjSize: Math.round(stats.avgObjSize),
      dataSize: Math.round(stats.dataSize / 1024) + ' KB'
    });

    return {
      success: true,
      roomId: savedRoom._id,
      storyId: savedStory._id,
      retrospectiveId: savedRetrospective._id,
      collections: collections.map(c => c.name),
      dbStats: stats,
      testId: testId
    };

  } catch (error) {
    console.error('❌ Database test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function cleanupTestData(testId?: string) {
  try {
    console.log('🧹 Cleaning up test data...');
    
    // Delete test documents
    if (testId) {
      await Room.deleteMany({ _id: testId });
    }
    await Room.deleteMany({ name: 'Test Agile Team Room' });
    await Story.deleteMany({ title: 'Test User Story' });
    await Retrospective.deleteMany({ name: 'Sprint 1 Retrospective' });
    
    console.log('✅ Test data cleaned up');
    return { success: true };
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
