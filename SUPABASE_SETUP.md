# 🚀 Supabase Setup Guide for The Founders Series

## Step 1: Configure Environment Variables

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Get your Supabase credentials:
   - Go to your **Supabase Dashboard** (https://supabase.com/dashboard)
   - Select your project
   - Go to **Settings** → **API**
   - Copy:
     - **Project URL** (looks like: `https://abcdefghijklmnop.supabase.co`)
     - **Project API Key** (anon public key)

3. Update `.env.local` with your actual values:
   ```env
   REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 2: Set Up Database Schema

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Click **Run** to create all tables, indexes, and initial data

## Step 3: Verify Setup

1. Check that tables were created:
   - Go to **Table Editor** in Supabase
   - You should see: `players`, `tournaments`, `tournament_results`

2. Verify initial data:
   - Open the `players` table
   - You should see 47 players with TrackmanID mappings

## Step 4: Start the Application

```bash
npm run dev
```

The app should now:
- ✅ Load player mappings from Supabase
- ✅ Persist tournament data across browser refreshes
- ✅ Show real-time updates (when multiple users are online)
- ✅ Handle admin functions through the database

## 🔧 What Changed

### Database Structure
- **`players`** - TrackmanID to Name/Club mappings
- **`tournaments`** - Tournament metadata
- **`tournament_results`** - Individual player results per tournament

### Features Added
- **Persistent Data** - No more losing data on refresh
- **Real-time Updates** - Live leaderboard changes
- **Multi-user Support** - Multiple admins can work simultaneously
- **Data Integrity** - Foreign key relationships ensure data consistency
- **Performance** - Indexed queries for fast leaderboard generation

### Admin Features
- All existing admin functions work the same
- Data now persists permanently
- Player mappings are stored in database
- Tournament uploads create permanent records

## 🎯 Next Steps

1. **Test Tournament Upload** - Upload a CSV to verify everything works
2. **Invite Other Admins** - They can use the same admin credentials
3. **Backup Strategy** - Supabase handles backups automatically
4. **Mobile Access** - The web app works on mobile devices

## 🚨 Troubleshooting

### "Invalid API key" error
- Double-check your `.env.local` file
- Make sure you copied the **anon** key, not the service role key
- Restart your dev server after changing environment variables

### "Permission denied" errors
- Check that RLS policies are set up correctly
- Verify the SQL schema was run completely

### Data not loading
- Check browser console for specific error messages
- Verify your Supabase project is active and not paused

## 📊 Database Access

You can view and manage data directly in Supabase:
- **Table Editor** - View/edit data with a spreadsheet interface
- **SQL Editor** - Run custom queries
- **Database** - Monitor performance and usage
- **Auth** - Manage user authentication (for future features)

The app is now production-ready with enterprise-grade database features! 🏆