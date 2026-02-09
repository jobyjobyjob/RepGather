# RepGather

## Overview

RepGather is a generic fitness tracking application built with Expo/React Native that supports multiple exercise types (push-ups, sit-ups, squats, running, etc.). Users can set fitness goals over defined time periods, create/join groups with invite codes, share progress, and compete on a leaderboard. All challenges (personal and group) are stored server-side with PostgreSQL. Users can run multiple concurrent challenges and switch between them using challenge pickers. It supports iOS, Android, and web platforms.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture
- **Routing**: expo-router with file-based routing in the `app/` directory
- **State Management**: React Context (`PushupContext`, `AuthContext`) for app-wide state, TanStack React Query for server state
- **Data Persistence**: All data server-backed via PostgreSQL; AsyncStorage only for active challenge ID selection
- **Animations**: react-native-reanimated for smooth animations (progress rings, button interactions)
- **Haptic Feedback**: expo-haptics for tactile feedback on user interactions

### Authentication
- Session-based auth with express-session and connect-pg-simple
- AuthContext manages user state (login, register, logout)
- Auth screen shown before main app when no user session
- Endpoints: POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me

### Navigation Structure
- Tab-based navigation with five main screens: Home (index), History, Leaderboard, Groups, Settings
- Modal screens for Setup (personal challenge creation) and Edit Log functionality
- Uses expo-router's typed routes for type-safe navigation

### Component Architecture
- Reusable UI components: `ProgressRing`, `CounterButton`, `StatCard`, `QuickAddButtons`, `CalendarDateRangePicker`
- Error boundary implementation for graceful error handling
- Platform-aware components that adapt to iOS, Android, and web

### Backend Architecture
- Express.js server running on Node.js (port 5000)
- Session-based authentication with PostgreSQL session store
- Drizzle ORM for database operations
- Routes: auth, challenges, groups, daily logs

### Data Models
- **Users**: id, username, displayName, password
- **Groups**: id, name, inviteCode (6-char), exerciseType, goalType, totalGoal, individualGoal, startDate, endDate, isPersonal, createdBy
- **GroupMembers**: id, groupId, userId, individualGoal, joinedAt
- **DailyLogs**: id, userId, groupId, date, count (unique per user+group+date)

### Challenge System (Unified)
- Personal challenges and group challenges are both stored as `groups` in the database
- Personal challenges have `isPersonal: true` flag; cannot be joined via invite code
- Group challenges have `isPersonal: false` and can be joined with invite codes
- Users can have multiple concurrent challenges (e.g., push-ups AND sit-ups)
- Challenge picker (horizontal scrolling chips) shown in Today and History tabs
- Only one challenge can be "active" at a time for tracking
- Active challenge ID stored in AsyncStorage for persistence

### Groups Tab
- Shows only non-personal (collaborative) groups
- Create group, join group via invite code, view leaderboard
- Group creator cannot leave; other members can leave

### API Endpoints
- Auth: register, login, logout, me
- Challenges: GET /api/challenges (all user challenges), POST /api/challenges/personal, DELETE /api/challenges/:id
- Groups: POST /api/groups, POST /api/groups/join, GET /api/groups, GET /api/groups/:id/members, GET /api/groups/:id/leaderboard, PUT /api/groups/:id/individual-goal, DELETE /api/groups/:id/leave
- Logs: POST /api/logs, PUT /api/logs, GET /api/logs/:groupId, DELETE /api/logs/:groupId/:date

### Build System
- Separate development workflows for Expo (`expo:dev`) and server (`server:dev`)
- Production builds use esbuild for server bundling
- Static web builds via custom `scripts/build.js`

## External Dependencies

### Database
- External PostgreSQL via Neon (neon.tech), connected via EXTERNAL_DATABASE_URL secret
- Drizzle ORM for database operations (auth, challenges, groups, and logs)
- Schema defined in `shared/schema.ts`
- server/db.ts prioritizes EXTERNAL_DATABASE_URL over DATABASE_URL

### Third-Party Services
- **Expo Notifications**: Push notification support for reminders
- **AsyncStorage**: Only for storing active challenge ID selection

### Key Libraries
- **UI**: expo-blur, expo-linear-gradient, react-native-svg, @expo/vector-icons
- **Fonts**: Inter font family via @expo-google-fonts/inter
- **Date Handling**: date-fns for date manipulation and formatting
- **Validation**: Zod with drizzle-zod for schema validation
- **Auth**: express-session, connect-pg-simple

## Recent Changes
- 2026-02-09: Migrated database to external Neon PostgreSQL (user-owned account); EXTERNAL_DATABASE_URL takes priority over DATABASE_URL
- 2026-02-09: Swipe-left-to-delete gesture for challenges in Settings tab using PanResponder
- 2026-02-09: Home screen counter reworked: +/- buttons with local state, save button (orange=unsaved, green=saved)
- 2026-02-09: Fixed group deletion/leave not refreshing challenge list on home page
- 2026-02-08: Added demographic collection (age range, gender) during user registration with picker modals
- 2026-02-08: Goal achievement celebration: confetti animation (60 particles) + trophy modal when reaching 100% goal
- 2026-02-08: Achievement modal offers 3 options: "Complete and save challenge", "Keep Going!", "Delete Challenge"
- 2026-02-08: Challenge status system: groups have "active"/"completed" status; completed challenges filtered from active list
- 2026-02-08: POST /api/challenges/:id/complete endpoint for marking challenges complete
- 2026-02-08: Leaderboard demographic filtering with age range and gender filter chips (group challenges only)
- 2026-02-07: Added dedicated Leaderboard tab with challenge picker for viewing progress across all challenges
- 2026-02-07: "Track in Home" button now toggles: dull "Remove from Home" when active, gradient when inactive
- 2026-02-07: "Finish Day" button shows selected state visually; subsequent taps update the day
- 2026-02-07: Added "Delete Group" with confirmation for group creators
- 2026-02-07: "Leave Group" option for non-creator members in group detail
- 2026-02-07: Restructured to fully server-backed multi-challenge system (removed local storage solo mode)
- 2026-02-07: Added challenge picker (horizontal chips) to Today and History tabs
- 2026-02-07: Personal challenges created via POST /api/challenges/personal
- 2026-02-07: Groups tab now filters to show only collaborative (non-personal) groups
- 2026-02-07: Settings tab shows active challenge info and personal challenge management
- 2026-02-07: PushupContext rewritten to support multiple concurrent server-backed challenges
- 2026-02-07: Renamed app from GritGather to RepGather
- 2026-02-07: Added exercise type selection (12 types: push-ups, sit-ups, squats, running, etc.)
- 2026-02-07: Implemented individual vs group goal system with toggle in group creation
- 2026-02-07: Enhanced leaderboard with exercise-specific unit labels and percentage display
- 2026-02-07: Added user authentication (register/login/logout)
- 2026-02-07: Added Groups tab with create, join, leaderboard functionality
