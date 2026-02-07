# PushUp Pro

## Overview

PushUp Pro is a mobile fitness tracking application built with Expo/React Native that helps users set and achieve push-up goals over a defined time period. The app supports both solo challenges (local storage) and group challenges (server-backed with PostgreSQL). Users can create/join groups with invite codes, share progress, and compete on a leaderboard. It supports iOS, Android, and web platforms.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture
- **Routing**: expo-router with file-based routing in the `app/` directory
- **State Management**: React Context (`PushupContext`, `AuthContext`) for app-wide state, TanStack React Query for server state
- **Data Persistence**: AsyncStorage for local/solo data; PostgreSQL for group data
- **Animations**: react-native-reanimated for smooth animations (progress rings, button interactions)
- **Haptic Feedback**: expo-haptics for tactile feedback on user interactions

### Authentication
- Session-based auth with express-session and connect-pg-simple
- AuthContext manages user state (login, register, logout)
- Auth screen shown before main app when no user session
- Endpoints: POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me

### Navigation Structure
- Tab-based navigation with four main screens: Today (index), History, Groups, Settings
- Modal screens for Setup (goal creation) and Edit Log functionality
- Uses expo-router's typed routes for type-safe navigation

### Component Architecture
- Reusable UI components: `ProgressRing`, `CounterButton`, `StatCard`, `QuickAddButtons`, `MonthCalendar`
- Error boundary implementation for graceful error handling
- Platform-aware components that adapt to iOS, Android, and web

### Backend Architecture
- Express.js server running on Node.js (port 5000)
- Session-based authentication with PostgreSQL session store
- Drizzle ORM for database operations
- Routes: auth, groups, daily logs

### Data Models
- **Users**: id, username, displayName, passwordHash
- **Groups**: id, name, inviteCode (6-char), totalGoal, startDate, endDate, createdBy
- **GroupMembers**: id, groupId, userId, joinedAt
- **DailyLogs**: id, userId, groupId, date, count (unique per user+group+date)
- **PushupGoal** (local): Target count, start/end dates, planType
- **ReminderSettings** (local): Notification preferences with time slots

### Group System
- Users create groups with a name, push-up goal, and date range
- 6-character invite codes generated server-side for joining
- "Active group" concept: selecting a group makes the Today tab track that group's data
- Leaderboard shows member rankings with progress bars
- Group creator cannot leave; other members can leave

### Dual Data Mode (PushupContext)
- **Solo mode** (no active group): Uses AsyncStorage locally for goals and logs
- **Group mode** (active group set): Fetches goal from group data, logs from server API
- Active group ID stored in AsyncStorage (persists across sessions)
- Switching between modes is seamless via group selection in Groups tab

### API Endpoints
- Auth: register, login, logout, me
- Groups: POST /api/groups, POST /api/groups/join, GET /api/groups, GET /api/groups/:id/members, GET /api/groups/:id/leaderboard, DELETE /api/groups/:id/leave
- Logs: POST /api/logs, PUT /api/logs, GET /api/logs/:groupId, DELETE /api/logs/:groupId/:date

### Build System
- Separate development workflows for Expo (`expo:dev`) and server (`server:dev`)
- Production builds use esbuild for server bundling
- Static web builds via custom `scripts/build.js`

## External Dependencies

### Database
- PostgreSQL via Drizzle ORM (active, used for auth, groups, and group logs)
- Schema defined in `shared/schema.ts`

### Third-Party Services
- **Expo Notifications**: Push notification support for reminders
- **AsyncStorage**: Local data persistence for solo mode and settings

### Key Libraries
- **UI**: expo-blur, expo-linear-gradient, react-native-svg, @expo/vector-icons
- **Fonts**: Inter font family via @expo-google-fonts/inter
- **Date Handling**: date-fns for date manipulation and formatting
- **Validation**: Zod with drizzle-zod for schema validation
- **Auth**: express-session, connect-pg-simple, bcrypt

## Recent Changes
- 2026-02-07: Added user authentication (register/login/logout)
- 2026-02-07: Added Groups tab with create, join, leaderboard functionality
- 2026-02-07: Connected Today tab to server data for group mode tracking
- 2026-02-07: Added account section and sign out to Settings
