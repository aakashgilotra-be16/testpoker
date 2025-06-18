/*
  # Create Authentication Users and Story Creators

  1. New Tables
    - No new tables needed, using existing `story_creators` table
    
  2. Data Setup
    - Insert Story Creator records for Aakash and Mohith
    - These will be linked to Supabase auth users
    
  3. Security
    - Existing RLS policies will apply
    - Story creators can manage stories and voting sessions
    
  4. Authentication
    - Users will be created in Supabase Auth with email/password
    - Default credentials provided for testing
*/

-- Insert default story creators
INSERT INTO story_creators (email, display_name) 
VALUES 
  ('aakash@planningpoker.com', 'Aakash'),
  ('mohith@planningpoker.com', 'Mohith')
ON CONFLICT (email) DO NOTHING;

-- Add some sample stories for testing (optional)
INSERT INTO stories (title, description, created_by) 
VALUES 
  ('User Login Feature', 'Implement user authentication with email and password', NULL),
  ('Dashboard UI', 'Create responsive dashboard with user statistics', NULL),
  ('Real-time Voting', 'Add real-time voting functionality with WebSocket support', NULL)
ON CONFLICT DO NOTHING;