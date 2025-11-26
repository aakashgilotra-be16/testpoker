/**
 * Enterprise-Grade AI Service for Retrospective Action Item Generation
 * Integrates with Google Gemini API with robust error handling and retry logic
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { RetrospectiveItem } from '../types/index.js';

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30000;

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 1000; // 1 request per second

export interface AIActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open';
  isDraft: boolean;
  aiGenerated: boolean;
  sourceItemIds: string[];
  createdAt: string;
}

export interface AIContext {
  prompt: string;
  feedbackCount: number;
  categories: string[];
  timestamp: string;
}

export interface GenerationResult {
  success: boolean;
  actions: AIActionItem[];
  error?: string;
  metadata?: {
    processingTime: number;
    tokensUsed?: number;
    modelUsed: string;
  };
}

/**
 * Initialize Gemini AI client
 */
function initializeGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not configured');
    console.error('💡 Make sure .env file exists with GEMINI_API_KEY set');
    return null;
  }
  
  try {
    console.log('✅ Initializing Gemini AI with API key:', apiKey.substring(0, 15) + '...');
    return new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.error('❌ Failed to initialize Gemini client:', error);
    return null;
  }
}

/**
 * Build comprehensive AI prompt with structured context
 */
function buildAIPrompt(
  contextByCategory: Record<string, string[]>,
  items: RetrospectiveItem[]
): string {
  let prompt = `You are an expert agile coach and technical advisor helping a software development team create actionable items from their retrospective feedback.

CONTEXT:
This is a team retrospective session where team members have shared their thoughts, experiences, and observations about their recent work cycle.

TEAM FEEDBACK BY CATEGORY:
`;

  // Add categorized feedback
  Object.entries(contextByCategory).forEach(([category, feedbackItems]) => {
    const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    prompt += `\n${categoryName}:\n`;
    feedbackItems.forEach((item, index) => {
      prompt += `  ${index + 1}. ${item}\n`;
    });
  });

  prompt += `

YOUR TASK:
Analyze the above feedback and generate 3-5 specific, actionable items that will have the most impact on team performance and satisfaction.

REQUIREMENTS FOR EACH ACTION ITEM:
1. Be concrete and measurable with clear success criteria
2. Address root causes, not just symptoms
3. Be achievable within 1-2 sprints (2-4 weeks)
4. Have clear ownership potential (who can drive this)
5. Focus on high-impact improvements

PRIORITIZATION CRITERIA:
- High Priority: Critical issues affecting team velocity or morale, mentioned multiple times, or blocking work
- Medium Priority: Important improvements that enhance efficiency or quality
- Low Priority: Nice-to-have optimizations or minor tweaks

FOCUS AREAS (in order of importance):
1. Critical blockers or impediments mentioned in negative feedback
2. Process improvements that reduce waste or delays
3. Technical debt or quality issues affecting delivery
4. Team collaboration, communication, or morale issues
5. Reinforcing successful practices mentioned in positive feedback
6. Tools, automation, or workflow optimizations

OUTPUT FORMAT:
Return your response as a valid JSON array with exactly this structure:
[
  {
    "title": "Clear, action-oriented title (max 80 characters)",
    "description": "Detailed description with:\\n- Context: Why this matters\\n- Action Steps: Specific steps to take (numbered list)\\n- Expected Outcome: What success looks like\\n- Success Metrics: How to measure completion",
    "priority": "high|medium|low",
    "rationale": "Brief explanation of why this action is important and which feedback items it addresses"
  }
]

IMPORTANT:
- Return ONLY the JSON array, no additional text
- Ensure all JSON is properly escaped
- Each action must be specific enough that the team knows exactly what to do
- Link actions to the feedback that inspired them in the rationale
- Be practical and realistic about what can be accomplished

Generate the action items now:`;

  return prompt;
}

/**
 * Parse and validate Gemini API response
 */
function parseGeminiResponse(
  responseText: string,
  items: RetrospectiveItem[]
): AIActionItem[] {
  try {
    // Clean the response - remove markdown code blocks if present
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const parsedActions = JSON.parse(cleanedText);
    
    if (!Array.isArray(parsedActions)) {
      throw new Error('Response is not an array');
    }
    
    // Transform and validate each action
    const validatedActions: AIActionItem[] = parsedActions.map((action, index) => {
      // Validate required fields
      if (!action.title || !action.description || !action.priority) {
        throw new Error(`Action item ${index} missing required fields`);
      }
      
      // Find source items based on rationale
      const sourceItemIds = items
        .filter(item => {
          const rationale = (action.rationale || '').toLowerCase();
          const content = item.content.toLowerCase();
          // Check if rationale mentions this feedback item
          return rationale.includes(content.substring(0, 30)) || 
                 content.includes(rationale.substring(0, 30));
        })
        .map(item => item.id)
        .slice(0, 3); // Limit to 3 source items
      
      return {
        id: `ai_action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: action.title.substring(0, 80), // Enforce max length
        description: action.description,
        priority: ['high', 'medium', 'low'].includes(action.priority) 
          ? action.priority 
          : 'medium',
        status: 'open' as const,
        isDraft: true,
        aiGenerated: true,
        sourceItemIds: sourceItemIds.length > 0 ? sourceItemIds : [items[0]?.id || 'unknown'],
        createdAt: new Date().toISOString()
      };
    });
    
    return validatedActions;
  } catch (error) {
    console.error('❌ Failed to parse Gemini response:', error);
    console.error('Response text:', responseText.substring(0, 500));
    throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rate limiting check
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
    console.log(`⏱️  Rate limit: waiting ${waitTime}ms`);
    await sleep(waitTime);
  }
  
  lastRequestTime = Date.now();
}

/**
 * Generate AI action items with retry logic
 */
export async function generateAIActionItems(
  contextByCategory: Record<string, string[]>,
  items: RetrospectiveItem[],
  aiContext: AIContext
): Promise<GenerationResult> {
  const startTime = Date.now();
  
  // Validate input
  if (!items || items.length === 0) {
    return {
      success: false,
      actions: [],
      error: 'No feedback items provided'
    };
  }
  
  // Initialize client
  const genAI = initializeGeminiClient();
  if (!genAI) {
    return {
      success: false,
      actions: [],
      error: 'AI service not configured. Please set GEMINI_API_KEY environment variable.'
    };
  }
  
  // Build prompt
  const prompt = buildAIPrompt(contextByCategory, items);
  console.log('📝 Generated AI prompt with', items.length, 'feedback items');
  
  // Retry logic
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🤖 AI generation attempt ${attempt}/${MAX_RETRIES}`);
      
      // Enforce rate limiting
      await enforceRateLimit();
      
      // Get Gemini model (using the latest available model)
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-pro',
        generationConfig: {
          temperature: 0.7, // Balanced creativity and consistency
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      });
      
      // Generate content with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT_MS);
      });
      
      const generatePromise = model.generateContent(prompt);
      const result = await Promise.race([generatePromise, timeoutPromise]);
      
      const response = result.response;
      const responseText = response.text();
      
      console.log('✅ Received response from Gemini AI');
      
      // Parse and validate response
      const actions = parseGeminiResponse(responseText, items);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✨ Successfully generated ${actions.length} AI action items in ${processingTime}ms`);
      
      return {
        success: true,
        actions,
        metadata: {
          processingTime,
          modelUsed: 'gemini-pro'
        }
      };
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`❌ Attempt ${attempt} failed:`, lastError.message);
      
      // Don't retry on validation errors
      if (lastError.message.includes('parse') || lastError.message.includes('validate')) {
        break;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  // All retries failed
  const processingTime = Date.now() - startTime;
  console.error('❌ All retry attempts exhausted');
  
  return {
    success: false,
    actions: [],
    error: lastError?.message || 'Failed to generate AI actions',
    metadata: {
      processingTime,
      modelUsed: 'gemini-pro'
    }
  };
}

/**
 * Health check for AI service
 */
export function checkAIServiceHealth(): { available: boolean; configured: boolean } {
  const apiKey = process.env.GEMINI_API_KEY;
  const configured = !!apiKey && apiKey.length > 0;
  
  return {
    available: configured,
    configured
  };
}
