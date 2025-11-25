/**
 * Legacy Type Compatibility Layer
 * Handles type conversion between old and new type systems during migration
 */

// Legacy Story type (matches server expectations)
export interface LegacyStory {
  id: string;
  title: string;
  description: string; // Required in legacy system
  final_points: string | null;
  created_at: string;
  updated_at: string;
}

// Type converters for gradual migration
export namespace TypeConverters {
  
  /**
   * Convert modern Story to Legacy Story format
   */
  export function storyToLegacy(story: import('./index').Story): LegacyStory {
    return {
      id: story.id,
      title: story.title,
      description: story.description || '', // Ensure required field
      final_points: story.estimate || null,
      created_at: story.createdAt.toISOString(),
      updated_at: story.updatedAt.toISOString()
    };
  }

  /**
   * Convert Legacy Story to modern Story format
   */
  export function storyFromLegacy(legacyStory: LegacyStory): import('./index').Story {
    return {
      id: legacyStory.id,
      title: legacyStory.title,
      description: legacyStory.description,
      estimate: legacyStory.final_points || undefined,
      createdAt: new Date(legacyStory.created_at),
      updatedAt: new Date(legacyStory.updated_at),
      // Set enterprise defaults
      priority: 'medium',
      status: 'pending',
      roomId: '', // Will be set by context
      createdBy: '', // Will be set by context
      acceptanceCriteria: [],
      tags: []
    };
  }
}

// Type guards for runtime checking
export namespace TypeGuards {
  
  export function isLegacyStory(story: any): story is LegacyStory {
    return story &&
           typeof story.id === 'string' &&
           typeof story.title === 'string' &&
           typeof story.description === 'string' &&
           typeof story.created_at === 'string';
  }

  export function isModernStory(story: any): story is import('./index').Story {
    return story &&
           typeof story.id === 'string' &&
           typeof story.title === 'string' &&
           story.createdAt instanceof Date &&
           Array.isArray(story.acceptanceCriteria);
  }
}

// Utility type for components that need to handle both formats
export type CompatibleStory = import('./index').Story | LegacyStory;