# RepGather - App Overview & Features

## What is RepGather?

RepGather is a fitness tracking app that helps you set exercise goals, track your daily progress, and compete with friends. Whether you're doing push-ups on your own or challenging a group of friends to a month-long squat competition, RepGather keeps everyone accountable and motivated.

The app works on iPhone, Android, and web browsers.

---

## Supported Exercise Types

RepGather supports 12 exercise types:

| Exercise | Unit |
|----------|------|
| Push-ups | reps |
| Sit-ups | reps |
| Squats | reps |
| Pull-ups | reps |
| Burpees | reps |
| Lunges | reps |
| Planks | seconds |
| Running | miles |
| Cycling | miles |
| Jump Rope | reps |
| Jumping Jacks | reps |
| Other (Custom) | reps (default) |

**Custom Exercise Types**: When you select "Other," a text input appears where you can type any workout name (up to 30 characters). Your custom name is then used throughout the app wherever the exercise type is displayed -- in challenge pickers, progress labels, leaderboard, and history.

---

## User Accounts & Registration

### Sign Up
- Create an account with an **email address**, display name, and password
- Email format is validated (must be a valid email like name@example.com)
- During registration, you'll select your age range and gender (used for leaderboard filtering)
- Age range options: Under 18, 18-24, 25-34, 35-44, 45-54, 55-64, 65+
- Gender options: Male, Female, Other, Prefer not to answer

### Sign In / Sign Out
- Log in with your email address and password
- Session-based authentication keeps you logged in
- Log out anytime from the Settings tab

---

## Challenge System

Challenges are the core of RepGather. There are two types:

### Personal Challenges
- Created just for you -- no one else can see or join them
- Set your own exercise type (including custom workout names), goal, and time period
- Example: "Do 1,000 push-ups in February" or "Do 500 Yoga sessions in March"

### Group Challenges
- Created for teams -- anyone with the invite code can join
- Two goal modes:
  - **Group Goal**: Everyone contributes toward a shared total (e.g., "Our team will do 5,000 squats together")
  - **Individual Goal**: Each member has their own target within the group (e.g., "Each person does 500 squats")
- Each group gets a unique 6-character invite code for easy sharing

### Running Multiple Challenges
- You can have several challenges going at the same time (e.g., a push-up challenge AND a running challenge)
- A challenge picker (horizontal scrolling chips) lets you switch between them
- One challenge is "active" at a time for tracking on the Home screen

### Challenge Status
- Challenges can be **active** or **completed**
- Completed challenges are filtered out of the active list but preserved for history

---

## App Screens

### Home Tab
The main screen for daily tracking.

- **Challenge Picker**: Scroll through your active challenges and tap to switch
- **Progress Ring**: Visual circular progress indicator showing how far you are toward your goal
- **Counter**: Shows today's count with **+** and **-** buttons to increment or decrement
- **Save Button**: Saves your daily count to the server
  - Appears **orange** when you have unsaved changes
  - Switches to **green outline** after saving
  - Returns to orange if you change the count again
- **Progress Stats**: Shows total completed, daily average, and days remaining

### History Tab
Review your past activity.

- **Challenge Picker**: Switch between challenges to view different histories
- **Progress Summary**: Total count, percentage complete, and streak information
- **Calendar View**: Month-by-month calendar showing activity on each day
  - Days with logged activity are highlighted
  - Tap any day to edit that day's entry
- **Activity Log**: Scrollable list of daily entries below the calendar
- **Edit Log**: Tap on a past entry to modify the count for that day

### Leaderboard Tab
See how you rank against others.

- **Challenge Picker**: Select which challenge's leaderboard to view
- **Rankings**: Shows all participants ordered by total progress
- **Demographic Filters**: For group challenges, filter the leaderboard by:
  - Age range (e.g., show only 25-34 year olds)
  - Gender
- **Progress Display**: Each participant shows their total count and percentage of goal

### Groups Tab
Manage your group challenges.

- **Group List**: Shows all collaborative (non-personal) groups you belong to
- **Create Group**: Set up a new group challenge with:
  - Group name
  - Exercise type (including custom workout names via "Other")
  - Goal type (group total vs. individual)
  - Total or individual goal amount
  - Start and end dates
- **Join Group**: Enter a 6-character invite code to join an existing group
- **Group Detail View**: See group info, members, and leaderboard
- **Individual Goal Setting**: Set or update your personal target within a group (for individual goal groups)
- **Leave Group**: Members can leave a group (except the creator)
- **Delete Group**: The group creator can delete the entire group

### Settings Tab
Manage your account and challenges.

- **Active Challenge**: Shows which challenge is currently being tracked
- **All Challenges**: Lists all your challenges (personal and group)
  - **Swipe left to delete**: Slide any challenge left to reveal a delete button
- **Notifications**: Toggle push notification reminders on/off
- **Account Info**: View your email address and display name
- **Logout**: Sign out of your account

---

## Goal Achievement Celebration

When you reach 100% of your challenge goal:

1. **Confetti Animation**: 60 colorful particles burst across the screen
2. **Trophy Modal**: A celebration popup appears with three options:
   - **Complete and Save Challenge**: Marks the challenge as completed and archives it
   - **Keep Going!**: Dismisses the modal so you can continue beyond your goal
   - **Delete Challenge**: Removes the challenge entirely

---

## Technical Details

### Platforms
- iOS (via Expo Go or App Store)
- Android (via Expo Go or Play Store)
- Web browsers

### Data Storage
- All data is stored server-side in a PostgreSQL database
- User accounts, challenges, group memberships, and daily logs are all persisted on the server
- The only local storage used is remembering which challenge you last had selected

### Data Models

**Users**
- Email address (used as username), display name, password (hashed)
- Age range and gender (for leaderboard filtering)

**Challenges/Groups**
- Name, exercise type, goal type, total goal
- Start date and end date
- Personal flag (personal vs. group)
- Status (active or completed)
- Invite code (for group challenges)
- Created by (user who set it up)

**Group Members**
- Links users to groups
- Optional individual goal per member

**Daily Logs**
- One entry per user, per challenge, per day
- Stores the count for that day
- Unique constraint prevents duplicate entries

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create new account |
| POST | /api/auth/login | Sign in |
| POST | /api/auth/logout | Sign out |
| GET | /api/auth/me | Get current user info |
| GET | /api/challenges | List all your challenges |
| POST | /api/challenges/personal | Create personal challenge |
| POST | /api/challenges/:id/complete | Mark challenge complete |
| DELETE | /api/challenges/:id | Delete a challenge |
| POST | /api/groups | Create a group |
| POST | /api/groups/join | Join group with invite code |
| GET | /api/groups | List your groups |
| GET | /api/groups/:id/members | View group members |
| GET | /api/groups/:id/leaderboard | View group rankings |
| PUT | /api/groups/:id/individual-goal | Set your goal in a group |
| DELETE | /api/groups/:id/leave | Leave a group |
| POST | /api/logs | Log daily activity |
| PUT | /api/logs | Update a day's count |
| GET | /api/logs/:groupId | Get logs for a challenge |
| DELETE | /api/logs/:groupId/:date | Delete a day's entry |

### Technology Stack
- **Frontend**: Expo SDK 54, React Native 0.81, TypeScript
- **Routing**: expo-router (file-based)
- **State Management**: React Context + TanStack React Query
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Animations**: react-native-reanimated
- **Haptic Feedback**: expo-haptics
- **Icons**: @expo/vector-icons (Ionicons)
- **Fonts**: Inter font family
- **Date Handling**: date-fns
- **Validation**: Zod with drizzle-zod
