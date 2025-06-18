/*
  # Add timer functionality to voting sessions

  1. Changes
    - Add timer_duration column to voting_sessions table
    - Add timer_started_at column to voting_sessions table
    - Add default story creator account
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add timer columns to voting_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voting_sessions' AND column_name = 'timer_duration'
  ) THEN
    ALTER TABLE voting_sessions ADD COLUMN timer_duration integer DEFAULT 60;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voting_sessions' AND column_name = 'timer_started_at'
  ) THEN
    ALTER TABLE voting_sessions ADD COLUMN timer_started_at timestamptz;
  END IF;
END $$;

-- Insert default story creator (Aakash)
INSERT INTO story_creators (email, display_name) 
VALUES ('aakash@planningpoker.com', 'Aakash')
ON CONFLICT (email) DO NOTHING;

-- Insert default story creator (Mohith)
INSERT INTO story_creators (email, display_name) 
VALUES ('mohith@planningpoker.com', 'Mohith')
ON CONFLICT (email) DO NOTHING;