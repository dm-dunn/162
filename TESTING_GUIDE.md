# Testing Guide - MLB162 Dashboard Updates

## What's New

The app has been updated with the following changes:

1. **Consolidated Dashboard**: All game picks are now made directly from the dashboard - no separate "Make Picks" page
2. **Mock Data Mode**: Added mock data for easy UI testing without hitting the database
3. **Simplified Navigation**: Removed the "Make Picks" link from the header

## Testing the UI with Mock Data

### Current Setup
- Mock data is **ENABLED** by default
- You'll see 6 sample MLB games on the dashboard
- Picks are stored in local state (not the database)
- A yellow banner indicates mock mode is active

### Testing Steps

1. **View the Dashboard**
   - Navigate to http://localhost:5173/dashboard
   - You should see 6 game cards with teams like NYY vs BOS, LAD vs SF, etc.
   - Notice the yellow "Mock Data Mode" banner at the top

2. **Test Making Picks**
   - Click "Make Pick" on any game card
   - Select a pick type (Moneyline +1 or Spread +2/-1)
   - Select a team (home or away)
   - Click "Submit Pick"
   - The UI should update immediately showing your pick
   - Try changing a pick - click "Change Pick" and select different options

3. **Verify UI Updates**
   - Pick cards should show your selections immediately
   - The pick selector should close after submission
   - The button should change from "Make Pick" to "Change Pick"
   - No errors should appear in the console

4. **Test Multiple Picks**
   - Make picks on several different games
   - Verify each game shows your pick correctly
   - Refresh the page - picks will reset (expected in mock mode)

## Switching to Real Data

To test with the actual database:

1. Open `frontend/src/utils/mockData.js`
2. Change line 91: `export const USE_MOCK_DATA = true;` to `export const USE_MOCK_DATA = false;`
3. Save the file - Vite will hot-reload
4. The yellow banner will disappear
5. Picks will now save to the database via API calls

### Testing with Real Data

1. **Ensure Backend is Running**
   - Backend should be running on port 3000
   - Check `http://localhost:3000/api/health`

2. **Test Database Operations**
   - Make a pick on a game
   - Open your database and verify the pick was saved
   - Refresh the page - your picks should persist
   - Change a pick and verify the database updates

3. **Test Edge Cases**
   - Try making picks on locked games (should fail gracefully)
   - Try making picks when not logged in (should redirect to login)
   - Verify the leaderboard updates correctly

## UI Components to Verify

### GameCard Component (`frontend/src/components/game/GameCard.jsx`)
- ✅ Displays team names and scores correctly
- ✅ Shows game time in local timezone
- ✅ Indicates locked games with 🔒 icon
- ✅ Shows existing picks with blue highlight
- ✅ Displays pick results (win/loss) when available
- ✅ Toggle pick selector on button click

### PickSelector Component (`frontend/src/components/game/PickSelector.jsx`)
- ✅ Pick type buttons toggle correctly
- ✅ Team selection highlights active choice
- ✅ Submit button shows loading state
- ✅ Handles mock mode vs API mode
- ✅ Shows error messages if API fails
- ✅ Pre-fills existing pick for editing

### Dashboard Layout
- ✅ Stats cards show user rank, games, and win rate
- ✅ Top 5 leaderboard displays correctly
- ✅ Game cards in responsive grid (1 col mobile, 2 col tablet, 3 col desktop)
- ✅ Mock data banner appears when enabled

## Known Behaviors

1. **Mock Mode**:
   - Picks are stored in React state only
   - Data resets on page refresh
   - No authentication required for testing UI

2. **Real Mode**:
   - Picks saved to PostgreSQL database
   - Requires valid user authentication
   - Data persists across sessions

## Troubleshooting

### "Failed to fetch games" error
- Check if backend is running on port 3000
- Verify USE_MOCK_DATA is set correctly
- Check browser console for detailed errors

### Picks not showing up
- In mock mode: Check that handlePickMade is being called
- In real mode: Check API responses in Network tab
- Verify pick data structure matches expected format

### Styles look broken
- Run `npm install` in frontend directory
- Check that Tailwind is compiling correctly
- Verify all CSS classes are defined in `frontend/src/index.css`

## Next Steps

Once UI testing is complete:

1. Switch to real data mode
2. Test all database operations
3. Verify pick results update correctly
4. Test with multiple users
5. Check leaderboard calculations
6. Deploy to production

## Files Modified

- `frontend/src/pages/Dashboard.jsx` - Added game cards and picks interface
- `frontend/src/components/game/PickSelector.jsx` - Added mock mode support
- `frontend/src/App.jsx` - Removed /picks route
- `frontend/src/components/common/Header.jsx` - Removed "Make Picks" link
- `frontend/src/utils/mockData.js` - Created mock data utilities
- `frontend/src/pages/TodaysPicks.jsx` - No longer used (can be deleted)
