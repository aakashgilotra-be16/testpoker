# Planning Poker - Authentication Setup Instructions

## Default Story Creator Accounts

I've created the database records for Story Creators, but you need to manually create the actual user accounts in Supabase Auth. Here are the default credentials:

### Story Creator 1: Aakash
- **Email**: `aakash@planningpoker.com`
- **Password**: `poker123`
- **Role**: Story Creator

### Story Creator 2: Mohith  
- **Email**: `mohith@planningpoker.com`
- **Password**: `poker123`
- **Role**: Story Creator

## How to Create These Users in Supabase

### Method 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Users**
4. Click **"Add user"** button
5. For each user, enter:
   - Email: (use emails above)
   - Password: `poker123`
   - Email Confirm: ✅ (check this box)
6. Click **"Create user"**

### Method 2: Using SQL (Alternative)

If you prefer SQL, you can run this in your Supabase SQL Editor:

```sql
-- Note: This requires admin privileges and may not work in all Supabase setups
-- It's better to use the Dashboard method above

-- Create Aakash's account
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'aakash@planningpoker.com',
  crypt('poker123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"display_name": "Aakash"}'::jsonb
);

-- Create Mohith's account
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'mohith@planningpoker.com',
  crypt('poker123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"display_name": "Mohith"}'::jsonb
);
```

## Testing the Setup

After creating the users:

1. **Start your development server**: `npm run dev`
2. **Open the app**: http://localhost:5173
3. **Test Story Creator login**:
   - Enter display name: "Aakash"
   - Click Continue
   - Enter email: `aakash@planningpoker.com`
   - Enter password: `poker123`
   - Click Sign In

4. **Verify Story Creator features**:
   - You should see "Story Creator" badge in header
   - "New Story" button should be visible
   - You can create, edit, and delete stories
   - You can start voting sessions with timer controls

5. **Test Team Member access**:
   - Sign out
   - Enter any display name
   - Click "Join as Team Member"
   - You should be able to participate in voting but not manage stories

## Features Available

### For Story Creators:
- ✅ Create, edit, and delete stories
- ✅ Start voting sessions
- ✅ Configure deck types (Fibonacci, Powers of 2, T-Shirt)
- ✅ Set timer duration (30s, 1min, 2min, 5min)
- ✅ Start/stop voting timer
- ✅ Reveal/hide votes
- ✅ Reset voting sessions
- ✅ Save final story points
- ✅ Export stories (CSV/JSON)

### For Team Members:
- ✅ Join sessions as guest users
- ✅ Vote on stories
- ✅ View voting results when revealed
- ✅ Real-time updates

## Troubleshooting

If you encounter authentication issues:

1. **Check Supabase Auth settings**:
   - Go to Authentication → Settings
   - Ensure "Enable email confirmations" is disabled for testing
   - Check that your site URL is correct

2. **Verify user creation**:
   - Go to Authentication → Users
   - Confirm the users appear in the list
   - Check that email_confirmed_at is set

3. **Check browser console**:
   - Look for any error messages
   - Verify Supabase environment variables are set

4. **Database verification**:
   - Check that story_creators table has the records
   - Verify RLS policies are working correctly

## Next Steps

1. Create the user accounts in Supabase (see instructions above)
2. Test the authentication flow
3. Create some sample stories
4. Test voting sessions with multiple users
5. Configure production deployment settings