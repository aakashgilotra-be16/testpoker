import express, { Request, Response } from 'express';
import { Retrospective } from '../models/Retrospective';
import { generateAIActionItems } from '../services/AIService';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * Generate AI action items for a retrospective
 * POST /api/retrospectives/:id/generate-action-items
 */
router.post('/:id/generate-action-items', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teamContext, methodology } = req.body;

    console.log(`🤖 AI action item generation requested for retrospective ${id}`);

    // Find the retrospective
    const retrospective = await Retrospective.findById(id);
    if (!retrospective) {
      return res.status(404).json({ 
        error: 'Retrospective not found',
        success: false 
      });
    }

    // Check if AI is enabled
    if (!process.env.AI_ENABLED || process.env.AI_ENABLED !== 'true') {
      return res.status(503).json({ 
        error: 'AI service is not enabled',
        success: false 
      });
    }

    // Check AI service availability
    const isAIAvailable = await aiService.isAvailable();
    if (!isAIAvailable) {
      return res.status(503).json({ 
        error: 'AI service is currently unavailable',
        success: false 
      });
    }

    // Prepare data for AI generation
    const retrospectiveData = {
      items: retrospective.items,
      participants: retrospective.participants,
      teamContext: teamContext || 'Software development team',
      methodology: methodology || 'Agile'
    };

    // Generate AI action items
    const aiResult = await aiService.generateActionItems(retrospectiveData);

    if (!aiResult.success) {
      return res.status(500).json({
        error: aiResult.error || 'Failed to generate AI action items',
        success: false
      });
    }

    // Update retrospective with AI metadata
    if (!retrospective.aiGeneration) {
      retrospective.aiGeneration = {
        isEnabled: true,
        lastGeneratedAt: new Date(),
        generationCount: 1,
        feedback: []
      };
    } else {
      retrospective.aiGeneration.lastGeneratedAt = new Date();
      retrospective.aiGeneration.generationCount += 1;
    }

    // Add AI-generated action items to the retrospective actionItems array
    const aiActionItems = aiResult.actionItems.map(item => ({
      id: uuidv4(),
      title: item.title,
      description: item.description,
      priority: item.priority,
      status: 'open' as const,
      aiGenerated: true,
      aiConfidence: item.confidence,
      originalPrompt: aiResult.metadata.prompt,
      createdAt: new Date()
    }));

    retrospective.actionItems.push(...aiActionItems);
    
    // Update stats
    retrospective.stats.totalActionItems = retrospective.actionItems.length;
    
    await retrospective.save();

    console.log(`✅ Generated ${aiResult.actionItems.length} AI action items for retrospective ${id}`);

    return res.json({
      success: true,
      actionItems: aiResult.actionItems,
      metadata: aiResult.metadata,
      retrospective: {
        id: retrospective._id,
        actionItemCount: retrospective.actionItems.length,
        aiItemCount: aiActionItems.length
      }
    });

  } catch (error) {
    console.error('❌ Error generating AI action items:', error);
    return res.status(500).json({
      error: 'Internal server error during AI generation',
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get AI suggestions without adding them to retrospective
 * POST /api/retrospectives/:id/ai-suggestions
 */
router.post('/:id/ai-suggestions', async (req, res) => {
  try {
    const { id } = req.params;
    const { teamContext, methodology } = req.body;

    console.log(`🤖 AI suggestions requested for retrospective ${id}`);

    // Find the retrospective
    const retrospective = await Retrospective.findById(id);
    if (!retrospective) {
      return res.status(404).json({ 
        error: 'Retrospective not found',
        success: false 
      });
    }

    // Check if AI is enabled
    if (!process.env.AI_ENABLED || process.env.AI_ENABLED !== 'true') {
      return res.status(503).json({ 
        error: 'AI service is not enabled',
        success: false 
      });
    }

    // Prepare data for AI generation
    const retrospectiveData = {
      items: retrospective.items,
      participants: retrospective.participants,
      teamContext: teamContext || 'Software development team',
      methodology: methodology || 'Agile'
    };

    // Generate AI suggestions (without saving to DB)
    const aiResult = await aiService.generateActionItems(retrospectiveData);

    if (!aiResult.success) {
      return res.status(500).json({
        error: aiResult.error || 'Failed to generate AI suggestions',
        success: false
      });
    }

    console.log(`✅ Generated ${aiResult.actionItems.length} AI suggestions for retrospective ${id}`);

    return res.json({
      success: true,
      suggestions: aiResult.actionItems,
      metadata: aiResult.metadata
    });

  } catch (error) {
    console.error('❌ Error generating AI suggestions:', error);
    return res.status(500).json({
      error: 'Internal server error during AI suggestion generation',
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Submit feedback on AI-generated action items
 * POST /api/retrospectives/:id/ai-feedback
 */
router.post('/:id/ai-feedback', async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback, rating, actionItemId, userId } = req.body;

    console.log(`📝 AI feedback submitted for retrospective ${id}`);

    // Validate input
    if (!feedback || rating === undefined || !actionItemId || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: feedback, rating, actionItemId, and userId are required',
        success: false
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5',
        success: false
      });
    }

    // Find the retrospective
    const retrospective = await Retrospective.findById(id);
    if (!retrospective) {
      return res.status(404).json({ 
        error: 'Retrospective not found',
        success: false 
      });
    }

    // Initialize AI generation if it doesn't exist
    if (!retrospective.aiGeneration) {
      retrospective.aiGeneration = {
        isEnabled: true,
        lastGeneratedAt: new Date(),
        generationCount: 0,
        feedback: []
      };
    }

    // Add feedback
    retrospective.aiGeneration.feedback.push({
      userId,
      rating: rating as 1 | 2 | 3 | 4 | 5,
      comment: feedback,
      actionItemId,
      createdAt: new Date()
    });

    await retrospective.save();

    console.log(`✅ AI feedback saved for retrospective ${id}: ${rating}/5 stars`);

    return res.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackCount: retrospective.aiGeneration.feedback.length
    });

  } catch (error) {
    console.error('❌ Error submitting AI feedback:', error);
    return res.status(500).json({
      error: 'Internal server error while submitting feedback',
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get AI generation status and history for a retrospective
 * GET /api/retrospectives/:id/ai-status
 */
router.get('/:id/ai-status', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`📊 AI status requested for retrospective ${id}`);

    // Find the retrospective
    const retrospective = await Retrospective.findById(id);
    if (!retrospective) {
      return res.status(404).json({ 
        error: 'Retrospective not found',
        success: false 
      });
    }

    // Count AI-generated action items
    const aiActionItems = retrospective.actionItems.filter(item => item.aiGenerated);
    const totalActionItems = retrospective.actionItems.length;

    // Calculate average feedback rating
    let averageRating = null;
    if (retrospective.aiGeneration?.feedback && retrospective.aiGeneration.feedback.length > 0) {
      const ratings = retrospective.aiGeneration.feedback.map(f => f.rating);
      averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    }

    const status = {
      success: true,
      aiEnabled: process.env.AI_ENABLED === 'true',
      hasAIGeneration: !!retrospective.aiGeneration,
      lastGenerated: retrospective.aiGeneration?.lastGeneratedAt || null,
      generationCount: retrospective.aiGeneration?.generationCount || 0,
      statistics: {
        totalActionItems,
        aiGeneratedActionItems: aiActionItems.length,
        aiPercentage: totalActionItems > 0 ? Math.round((aiActionItems.length / totalActionItems) * 100) : 0,
        feedbackCount: retrospective.aiGeneration?.feedback?.length || 0,
        averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null
      },
      aiActionItems: aiActionItems.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        priority: item.priority,
        confidence: item.aiConfidence,
        createdAt: item.createdAt
      }))
    };

    console.log(`✅ AI status retrieved for retrospective ${id}: ${aiActionItems.length}/${totalActionItems} AI action items`);

    return res.json(status);

  } catch (error) {
    console.error('❌ Error getting AI status:', error);
    return res.status(500).json({
      error: 'Internal server error while getting AI status',
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;