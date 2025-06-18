import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Story {
  id: string;
  title: string;
  description: string;
  final_points: string | null;
  created_at: string;
  updated_at: string;
}

export const useRealtimeStories = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    loadStories();

    // Set up real-time subscription
    const subscription = supabase
      .channel('stories_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stories' },
        (payload) => {
          console.log('Story change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            setStories(current => [payload.new as Story, ...current]);
          } else if (payload.eventType === 'UPDATE') {
            setStories(current => 
              current.map(story => 
                story.id === payload.new.id ? payload.new as Story : story
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setStories(current => 
              current.filter(story => story.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStories(data || []);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const createStory = async (storyData: { title: string; description: string }) => {
    try {
      const { error } = await supabase
        .from('stories')
        .insert({
          title: storyData.title,
          description: storyData.description,
          created_by: null,
        });

      if (error) throw error;
      // Real-time subscription will handle the UI update
    } catch (error) {
      console.error('Error creating story:', error);
      throw error;
    }
  };

  const updateStory = async (id: string, storyData: { title: string; description: string }) => {
    try {
      const { error } = await supabase
        .from('stories')
        .update({
          title: storyData.title,
          description: storyData.description,
        })
        .eq('id', id);

      if (error) throw error;
      // Real-time subscription will handle the UI update
    } catch (error) {
      console.error('Error updating story:', error);
      throw error;
    }
  };

  const deleteStory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      // Real-time subscription will handle the UI update
    } catch (error) {
      console.error('Error deleting story:', error);
      throw error;
    }
  };

  const saveStoryPoints = async (storyId: string, points: string) => {
    try {
      const { error } = await supabase
        .from('stories')
        .update({ final_points: points })
        .eq('id', storyId);

      if (error) throw error;
      // Real-time subscription will handle the UI update
    } catch (error) {
      console.error('Error saving story points:', error);
      throw error;
    }
  };

  const bulkCreateStories = async (storiesData: Array<{ title: string; description: string }>) => {
    try {
      const { error } = await supabase
        .from('stories')
        .insert(
          storiesData.map(story => ({
            title: story.title,
            description: story.description,
            created_by: null,
          }))
        );

      if (error) throw error;
      // Real-time subscription will handle the UI update
    } catch (error) {
      console.error('Error creating stories:', error);
      throw error;
    }
  };

  return {
    stories,
    loading,
    createStory,
    updateStory,
    deleteStory,
    saveStoryPoints,
    bulkCreateStories,
    refreshStories: loadStories,
  };
};