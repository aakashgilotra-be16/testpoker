import { GoogleGenAI } from '@google/genai';
import { IRetrospective } from '../models/Retrospective';

export interface ActionItemSuggestion {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  suggestedAssignee?: string;
  estimatedEffort?: string;
  category: string;
  confidence: number;
  reasoning: string;
}

export interface AIGenerationResult {
  success: boolean;
  actionItems: ActionItemSuggestion[];
  metadata: {
    model: string;
    tokensUsed?: number;
    generatedAt: Date;
    prompt: string;
  };
  error?: string;
}

export class AIService {
  private genAI: GoogleGenAI | null = null;

  private initializeClient() {
    if (this.genAI) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenAI({ apiKey });
  }

  async generateActionItems(retrospectiveData: {
    items: any[];
    participants: any[];
    teamContext?: string;
    methodology?: string;
  }): Promise<AIGenerationResult> {
    try {
      this.initializeClient();
      
      const prompt = this.buildPrompt(retrospectiveData);
      
      console.log('🤖 Generating AI action items with Gemini...');
      
      const response = await this.genAI!.models.generateContent({
        model: process.env.AI_MODEL || 'gemini-2.0-flash-exp',
        contents: prompt
      });
      const text = response.text || '';
      
      console.log('🤖 Raw AI response received');
      
      const actionItems = this.parseAIResponse(text);
      
      return {
        success: true,
        actionItems,
        metadata: {
          model: process.env.AI_MODEL || 'gemini-1.5-flash',
          generatedAt: new Date(),
          prompt: prompt.substring(0, 200) + '...' // Store truncated prompt
        }
      };
      
    } catch (error) {
      console.error('❌ AI Generation Error:', error);
      return {
        success: false,
        actionItems: [],
        metadata: {
          model: process.env.AI_MODEL || 'gemini-1.5-flash',
          generatedAt: new Date(),
          prompt: ''
        },
        error: error instanceof Error ? error.message : 'Unknown AI error'
      };
    }
  }

  private buildPrompt(data: {
    items: any[];
    participants: any[];
    teamContext?: string;
    methodology?: string;
  }): string {
    const { items, participants, teamContext, methodology } = data;
    
    // Group items by category for better context
    const itemsByCategory = {
      'went-well': items.filter(item => item.category === 'went-well'),
      'to-improve': items.filter(item => item.category === 'to-improve'),
      'action-items': items.filter(item => item.category === 'action-items')
    };

    // Team composition analysis
    const teamComposition = participants.map(p => ({
      role: p.role || 'unknown',
      experience: p.experience || 'unknown'
    }));

    const roleCount = teamComposition.reduce((acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return `
You are an expert Agile coach and software engineering consultant helping a ${methodology || 'Agile'} development team create actionable items from their retrospective feedback.

**TEAM CONTEXT:**
- Team Size: ${participants.length} members
- Team Composition: ${Object.entries(roleCount).map(([role, count]) => `${count} ${role}`).join(', ')}
- Methodology: ${methodology || 'Agile/Scrum'}
- Context: ${teamContext || 'Full-stack software development team'}

**RETROSPECTIVE FEEDBACK:**

**What Went Well (${itemsByCategory['went-well'].length} items):**
${itemsByCategory['went-well'].map((item, i) => `${i + 1}. "${item.content}" (${item.votes?.length || 0} votes)`).join('\n')}

**What to Improve (${itemsByCategory['to-improve'].length} items):**
${itemsByCategory['to-improve'].map((item, i) => `${i + 1}. "${item.content}" (${item.votes?.length || 0} votes)`).join('\n')}

**Existing Action Items (${itemsByCategory['action-items'].length} items):**
${itemsByCategory['action-items'].map((item, i) => `${i + 1}. "${item.content}" (${item.votes?.length || 0} votes)`).join('\n')}

**INSTRUCTIONS:**
Generate 3-7 specific, actionable items that address the improvement areas and leverage the strengths mentioned. Focus on:

1. **Process Improvements**: Sprint planning, ceremonies, communication
2. **Technical Improvements**: Code quality, architecture, tooling, CI/CD
3. **Team Collaboration**: Knowledge sharing, pair programming, documentation
4. **Skill Development**: Training, learning opportunities, mentoring

**PRIORITIZATION CRITERIA:**
- High Priority: Issues affecting delivery, quality, or team morale
- Medium Priority: Process optimizations and skill development
- Low Priority: Nice-to-have improvements and future considerations

**OUTPUT FORMAT (JSON only, no markdown):**
[
  {
    "title": "Brief, specific action title (max 60 chars)",
    "description": "Detailed description with concrete steps and success criteria (max 300 chars)",
    "priority": "high|medium|low",
    "suggestedAssignee": "Role or team member type (e.g., 'Tech Lead', 'Scrum Master', 'Frontend Team')",
    "estimatedEffort": "Time estimate (e.g., '2 weeks', '1 sprint', '1 hour')",
    "category": "process|technical|collaboration|development",
    "confidence": 0.85,
    "reasoning": "Why this action addresses the retrospective feedback (max 150 chars)"
  }
]

**GUARDRAILS:**
- Only suggest realistic, achievable actions
- Consider team size and composition
- Focus on software engineering best practices
- Prioritize high-impact, low-effort improvements
- Avoid generic advice - be specific to the feedback
- Each action must be SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
`;
  }

  private parseAIResponse(response: string): ActionItemSuggestion[] {
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Find JSON array in the response
      const jsonStart = cleanedResponse.indexOf('[');
      const jsonEnd = cleanedResponse.lastIndexOf(']');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No JSON array found in response');
      }
      
      const jsonString = cleanedResponse.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonString);
      
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }
      
      // Validate and clean each action item
      return parsed.map(item => ({
        title: item.title?.substring(0, 200) || 'Untitled Action',
        description: item.description?.substring(0, 1000) || '',
        priority: ['low', 'medium', 'high'].includes(item.priority) ? item.priority : 'medium',
        suggestedAssignee: item.suggestedAssignee?.substring(0, 100),
        estimatedEffort: item.estimatedEffort?.substring(0, 50),
        category: item.category || 'general',
        confidence: Math.max(0, Math.min(1, parseFloat(item.confidence) || 0.5)),
        reasoning: item.reasoning?.substring(0, 500) || ''
      }));
      
    } catch (error) {
      console.error('❌ Failed to parse AI response:', error);
      console.log('📝 Raw response:', response);
      
      // Return fallback action items based on common retrospective patterns
      return this.getFallbackActionItems();
    }
  }

  private getFallbackActionItems(): ActionItemSuggestion[] {
    return [
      {
        title: 'Improve Sprint Planning Process',
        description: 'Review and refine sprint planning meetings to ensure better estimation and task breakdown.',
        priority: 'medium',
        suggestedAssignee: 'Scrum Master',
        estimatedEffort: '1 sprint',
        category: 'process',
        confidence: 0.7,
        reasoning: 'Common area for improvement in agile teams'
      },
      {
        title: 'Enhance Code Review Guidelines',
        description: 'Establish clear code review standards and ensure consistent application across the team.',
        priority: 'high',
        suggestedAssignee: 'Tech Lead',
        estimatedEffort: '2 weeks',
        category: 'technical',
        confidence: 0.8,
        reasoning: 'Code quality is crucial for long-term maintainability'
      }
    ];
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return false;
      }
      
      this.initializeClient();
      const testResult = await this.genAI!.models.generateContent({
        model: process.env.AI_MODEL || 'gemini-2.0-flash-exp',
        contents: 'Test connection'
      });
      return true;
    } catch (error) {
      console.error('AI service unavailable:', error);
      return false;
    }
  }
}

// Create singleton instance but don't initialize until needed
export const aiService = new AIService();