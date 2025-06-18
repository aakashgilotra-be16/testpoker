/*
  # Planning Poker Database Schema

  1. New Tables
    - `story_creators`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `display_name` (text)
      - `created_at` (timestamp)
    
    - `stories`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `final_points` (text, nullable)
      - `created_by` (uuid, foreign key)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `voting_sessions`
      - `id` (uuid, primary key)
      - `story_id` (uuid, foreign key)
      - `deck_type` (text)
      - `is_active` (boolean)
      - `votes_revealed` (boolean)
      - `created_by` (uuid, foreign key)
      - `created_at` (timestamp)
    
    - `votes`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `display_name` (text)
      - `vote_value` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Story creators can manage stories and voting sessions
    - All authenticated users can vote
    - Public read access for stories and active sessions
*/

-- Create story_creators table
CREATE TABLE IF NOT EXISTS story_creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  final_points text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create voting_sessions table
CREATE TABLE IF NOT EXISTS voting_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE,
  deck_type text NOT NULL DEFAULT 'fibonacci',
  is_active boolean DEFAULT true,
  votes_revealed boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES voting_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  display_name text NOT NULL,
  vote_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE story_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Story creators policies
CREATE POLICY "Anyone can read story creators"
  ON story_creators FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can manage story creators"
  ON story_creators FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM story_creators WHERE email = auth.jwt()->>'email'));

-- Stories policies
CREATE POLICY "Anyone can read stories"
  ON stories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only story creators can manage stories"
  ON stories FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'email' IN (SELECT email FROM story_creators));

CREATE POLICY "Only story creators can update stories"
  ON stories FOR UPDATE
  TO authenticated
  USING (auth.jwt()->>'email' IN (SELECT email FROM story_creators));

CREATE POLICY "Only story creators can delete stories"
  ON stories FOR DELETE
  TO authenticated
  USING (auth.jwt()->>'email' IN (SELECT email FROM story_creators));

-- Voting sessions policies
CREATE POLICY "Anyone can read voting sessions"
  ON voting_sessions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only story creators can manage voting sessions"
  ON voting_sessions FOR ALL
  TO authenticated
  USING (auth.jwt()->>'email' IN (SELECT email FROM story_creators));

-- Votes policies
CREATE POLICY "Anyone can read votes"
  ON votes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own votes"
  ON votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert initial story creators
INSERT INTO story_creators (email, display_name) VALUES 
  ('mohith@example.com', 'Mohith'),
  ('aakash@example.com', 'Aakash')
ON CONFLICT (email) DO NOTHING;

-- Create updated_at trigger for stories
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();