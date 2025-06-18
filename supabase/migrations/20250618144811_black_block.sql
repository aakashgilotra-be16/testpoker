/*
  # Fix infinite recursion in story_creators RLS policy

  1. Changes
    - Drop the problematic recursive policy that causes infinite recursion
    - Drop existing policies to avoid conflicts
    - Create new non-recursive policies for story_creators table

  2. Security
    - Allow public read access to story creators
    - Allow authenticated users to manage records where their email matches
*/

-- Drop all existing policies on story_creators to avoid conflicts
DROP POLICY IF EXISTS "Anyone can read story creators" ON story_creators;
DROP POLICY IF EXISTS "Only admins can manage story creators" ON story_creators;
DROP POLICY IF EXISTS "Story creators can manage own records" ON story_creators;

-- Create a simple policy for reading story creators (public access)
CREATE POLICY "Anyone can read story creators"
  ON story_creators
  FOR SELECT
  TO public
  USING (true);

-- Create a policy for story creators to manage their own records
CREATE POLICY "Story creators can manage own records"
  ON story_creators
  FOR ALL
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'))
  WITH CHECK (email = (auth.jwt() ->> 'email'));