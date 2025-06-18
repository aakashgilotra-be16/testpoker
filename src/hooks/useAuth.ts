import { useState, useEffect } from 'react';

export interface AuthUser {
  id: string;
  displayName: string;
  isStoryCreator: boolean;
  isGuest: boolean;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing user in localStorage with error handling
    try {
      const savedUser = localStorage.getItem('planningPokerUser');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.warn('Failed to load user from localStorage:', error);
      // Clear potentially corrupted data
      try {
        localStorage.removeItem('planningPokerUser');
      } catch (removeError) {
        console.warn('Failed to clear corrupted localStorage data:', removeError);
      }
    }
    setLoading(false);
  }, []);

  const signInWithName = async (displayName: string) => {
    const trimmedName = displayName.trim().toLowerCase();
    
    // Check if the name is "aakash" or "mohith" (case insensitive)
    const isStoryCreator = trimmedName === 'aakash' || trimmedName === 'mohith';
    
    const newUser: AuthUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      displayName: displayName.trim(),
      isStoryCreator,
      isGuest: !isStoryCreator,
    };

    try {
      localStorage.setItem('planningPokerUser', JSON.stringify(newUser));
      setUser(newUser);
      return { error: null };
    } catch (error) {
      console.warn('Failed to save user to localStorage:', error);
      // Still set the user in state even if localStorage fails
      setUser(newUser);
      return { error: 'Failed to persist login state' };
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('planningPokerUser');
    } catch (error) {
      console.warn('Failed to remove user from localStorage:', error);
    }
    setUser(null);
    return { error: null };
  };

  return {
    user,
    loading,
    signInWithName,
    signOut,
  };
};