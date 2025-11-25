/**
 * Retrospective Scheme Configurations
 * Frontend utility for retrospective formats
 */

export type RetrospectiveScheme = 'standard' | 'start-stop-continue' | 'mad-sad-glad' | '4ls';

export interface SchemeCategory {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
}

export interface RetrospectiveSchemeConfig {
  id: RetrospectiveScheme;
  name: string;
  description: string;
  categories: SchemeCategory[];
}

export const RETROSPECTIVE_SCHEMES: Record<RetrospectiveScheme, RetrospectiveSchemeConfig> = {
  standard: {
    id: 'standard',
    name: 'Standard Retrospective',
    description: 'Classic format focusing on successes and improvements',
    categories: [
      {
        id: 'went-well',
        name: 'What Went Well',
        color: 'green',
        icon: 'check-circle',
        description: 'Positive aspects and successes'
      },
      {
        id: 'to-improve',
        name: 'What to Improve',
        color: 'red',
        icon: 'alert-circle',
        description: 'Areas needing improvement'
      },
      {
        id: 'action-items',
        name: 'Action Items',
        color: 'blue',
        icon: 'message-square',
        description: 'Concrete steps forward'
      }
    ]
  },
  
  'start-stop-continue': {
    id: 'start-stop-continue',
    name: 'Start / Stop / Continue',
    description: 'Focus on behavioral changes and practices',
    categories: [
      {
        id: 'start-doing',
        name: 'Start Doing',
        color: 'green',
        icon: 'play-circle',
        description: 'New practices to adopt'
      },
      {
        id: 'stop-doing',
        name: 'Stop Doing',
        color: 'red',
        icon: 'x-circle',
        description: 'Practices to eliminate'
      },
      {
        id: 'continue-doing',
        name: 'Continue Doing',
        color: 'blue',
        icon: 'repeat',
        description: 'Practices to maintain'
      },
      {
        id: 'action-items',
        name: 'Action Items',
        color: 'purple',
        icon: 'message-square',
        description: 'Concrete steps forward'
      }
    ]
  },
  
  'mad-sad-glad': {
    id: 'mad-sad-glad',
    name: 'Mad / Sad / Glad',
    description: 'Emotion-focused retrospective format',
    categories: [
      {
        id: 'mad',
        name: 'Mad',
        color: 'red',
        icon: 'frown',
        description: 'Things that made you angry or frustrated'
      },
      {
        id: 'sad',
        name: 'Sad',
        color: 'orange',
        icon: 'meh',
        description: 'Things that made you disappointed'
      },
      {
        id: 'glad',
        name: 'Glad',
        color: 'green',
        icon: 'smile',
        description: 'Things that made you happy'
      },
      {
        id: 'action-items',
        name: 'Action Items',
        color: 'blue',
        icon: 'message-square',
        description: 'Concrete steps forward'
      }
    ]
  },
  
  '4ls': {
    id: '4ls',
    name: '4Ls Retrospective',
    description: 'Comprehensive learning-focused format',
    categories: [
      {
        id: 'liked',
        name: 'Liked',
        color: 'green',
        icon: 'thumbs-up',
        description: 'What you enjoyed or appreciated'
      },
      {
        id: 'learned',
        name: 'Learned',
        color: 'blue',
        icon: 'book-open',
        description: 'New knowledge or insights gained'
      },
      {
        id: 'lacked',
        name: 'Lacked',
        color: 'red',
        icon: 'alert-triangle',
        description: 'What was missing or needed'
      },
      {
        id: 'longed-for',
        name: 'Longed For',
        color: 'purple',
        icon: 'heart',
        description: 'What you wish you had'
      },
      {
        id: 'action-items',
        name: 'Action Items',
        color: 'orange',
        icon: 'message-square',
        description: 'Concrete steps forward'
      }
    ]
  }
};

export function getSchemeConfig(scheme: RetrospectiveScheme): RetrospectiveSchemeConfig {
  return RETROSPECTIVE_SCHEMES[scheme] || RETROSPECTIVE_SCHEMES.standard;
}

export function getAllSchemes(): RetrospectiveSchemeConfig[] {
  return Object.values(RETROSPECTIVE_SCHEMES);
}

export function getDefaultScheme(): RetrospectiveScheme {
  return 'standard';
}
