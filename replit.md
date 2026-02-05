# PushUp Pro

## Overview

PushUp Pro is a mobile fitness tracking application built with Expo/React Native that helps users set and achieve push-up goals over a defined time period. The app allows users to create challenges (e.g., 1000 push-ups by end of month), log daily push-ups with a tap counter, track progress with visual indicators, and view historical data. It supports iOS, Android, and web platforms.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture
- **Routing**: expo-router with file-based routing in the `app/` directory
- **State Management**: React Context (`PushupContext`) for app-wide state, TanStack React Query for server state
- **Data Persistence**: AsyncStorage for local data storage (goals, daily logs, settings)
- **Animations**: react-native-reanimated for smooth animations (progress rings, button interactions)
- **Haptic Feedback**: expo-haptics for tactile feedback on user interactions

### Navigation Structure
- Tab-based navigation with three main screens: Today (index), History, Settings
- Modal screens for Setup (goal creation) and Edit Log functionality
- Uses expo-router's typed routes for type-safe navigation

### Component Architecture
- Reusable UI components: `ProgressRing`, `CounterButton`, `StatCard`, `QuickAddButtons`
- Error boundary implementation for graceful error handling
- Platform-aware components that adapt to iOS, Android, and web

### Backend Architecture
- Express.js server running on Node.js
- Server handles CORS for Replit domains and localhost development
- Routes registered through `server/routes.ts`
- Currently uses in-memory storage (`MemStorage`) with Drizzle ORM schema prepared for PostgreSQL migration

### Data Models
- **PushupGoal**: Target count, start/end dates
- **DailyLog**: Date-based push-up count entries
- **ReminderSettings**: Notification preferences with time slots

### Build System
- Separate development workflows for Expo (`expo:dev`) and server (`server:dev`)
- Production builds use esbuild for server bundling
- Static web builds via custom `scripts/build.js`

## External Dependencies

### Database
- PostgreSQL via Drizzle ORM (configured but currently using in-memory storage)
- Schema defined in `shared/schema.ts` with users table

### Third-Party Services
- **Expo Notifications**: Push notification support for reminders
- **AsyncStorage**: Local data persistence on device

### Key Libraries
- **UI**: expo-blur, expo-linear-gradient, react-native-svg, @expo/vector-icons
- **Fonts**: Inter font family via @expo-google-fonts/inter
- **Date Handling**: date-fns for date manipulation and formatting
- **Validation**: Zod with drizzle-zod for schema validation