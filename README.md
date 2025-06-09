# Goals App 🎯

> A React Native goal tracking app with intelligent notifications and AI-powered reminder messages

## 📱 Overview

The app acts as a sort of basic AI assisstant, allowing you to schedule tasks and reminders and then uses Chat-GPT 4o-mini to generate sarcastic tailored reminders based on your task and

## ✨ Features

### Core Features
- ✅ **Goal Management** - Create, edit, and delete goals
- 📅 **Weekly Scheduling** - Set goals for specific days of the week
- 🔔 **Smart Notifications** - Up to 3 custom notifications per day
- ⏰ **Custom Timing** - Set exact notification times (hour & minute)
- 📊 **Progress Tracking** - Track streaks and completion stats
- 🎯 **Goal Types** - Task-based and incremental goals

### Advanced Features
- 🤖 **AI-Powered Reminders** - Custom reminder messages generated via API
- 🔄 **Automatic Scheduling** - Notifications auto-schedule when goals are saved
- 📱 **Cross-Platform** - Works on iOS and Android
- ☁️ **Cloud Sync** - Firebase integration for data persistence
- 🔐 **User Authentication** - Secure login and profile management

## 🛠️ Tech Stack

### Frontend
- **React Native** - Mobile app framework
- **Expo** - Development platform
- **TypeScript** - Type safety
- **React Navigation** - Navigation library

### Backend & Services
- **Firebase Firestore** - Database
- **Firebase Authentication** - User management
- **Expo Notifications** - Push notifications
- **Custom Reminder API** - AI-generated messages

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- [Add your other dev tools]

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator / Android Emulator or physical device

### Installation

1. **Clone the repository**
   ```bash
   git clone [your-repo-url]
   cd goals-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in your Firebase config and API endpoints.

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

## ⚙️ Configuration

### Firebase Setup
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Firestore Database
3. Enable Authentication (Email/Password)
4. Add your Firebase config to `firebaseConfig.ts`

### Reminder API Setup
1. Set up your reminder generation API at `http://localhost:8080/reminders`
2. API should accept: `{"tasks":"goal name","times":["18:00","21:00"]}`
3. API should return: `{"reminders":["Custom message 1","Custom message 2"]}`

### Notification Permissions
The app will request notification permissions on first use. Users can manage these in device settings.

## 📁 Project Structure

```
goals-app/
├── app/                          # Main app directory
│   ├── (tabs)/                   # Tab navigation screens
│   │   ├── goals/               # Goals-related screens
│   │   │   ├── index.tsx        # Goals dashboard
│   │   │   └── edit.tsx         # Goals editing interface
│   │   └── settings.tsx         # Settings & testing
│   ├── components/              # Reusable components
│   ├── context/                 # React context providers
│   │   └── AuthContext.tsx      # Authentication context
│   ├── hooks/                   # Custom React hooks
│   │   └── goalsHook.ts         # Goals management hook
│   ├── services/                # Business logic & API calls
│   │   ├── goalsService.ts      # Goals CRUD operations
│   │   └── notificationService.ts # Notification management
│   └── types/                   # TypeScript type definitions
│       └── goals.ts             # Goal-related types
├── firebaseConfig.ts            # Firebase configuration
├── package.json
└── README.md
```

## 🔔 Notification System

### How It Works
1. **Goal Creation** - When users create goals, notifications are automatically scheduled
2. **Weekly Recurring** - Notifications repeat on selected days of the week
3. **Custom Times** - Users can set exact notification times (e.g., 9:15 AM, 3:30 PM)
4. **AI Messages** - Reminder messages are generated via external API for personality
5. **Automatic Management** - System handles scheduling, updating, and canceling notifications

### Notification Types
- **Calendar Notifications** - Scheduled for specific days/times
- **Immediate Testing** - For development and testing
- **Delayed Testing** - Short-term scheduled notifications for testing

## 🎯 Goal Types

### Task Goals
- Simple completion tracking
- Mark as done/undone
- Streak tracking

### Incremental Goals
- Numeric progress tracking (e.g., "Drink 8 glasses of water")
- Daily targets
- Progress visualization

## 📊 Data Models

### Goal Structure
```typescript
interface Goal {
  id: string;
  user_id: string;
  goal_name: string;
  goal_type: 'task' | 'incremental';
  target_count: number | null;
  active: boolean;
  repeat: DayOfWeek[];              // [0,1,2,3,4,5,6] for days
  daily_reminders: 0 | 1 | 2 | 3;  // Number of reminders per day
  notification_times: GoalNotificationTimes[];
  reminders: string[];             // Custom AI-generated messages
  // ... other tracking fields
}
```

## 🧪 Testing & Development

### Notification Testing
The app includes a comprehensive testing suite in Settings:
- Permission management
- Immediate notifications
- Delayed notifications (5s, 10s)
- Goal notification scheduling
- Scheduled notification inspection

### Development Tips
- Use console logs to debug notification scheduling
- Test on physical devices for accurate notification behavior
- Use the "Show Scheduled" feature to inspect pending notifications

## 🚀 Deployment

### Expo Build
```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Environment Setup
- Ensure all environment variables are set
- Test notification permissions on target platforms
- Verify Firebase security rules for production

---

## 🔧 Troubleshooting

### Common Issues

**Notifications not appearing**
- Check device notification permissions
- Verify app is in foreground/background correctly
- Check console logs for scheduling errors

**Firebase connection issues**
- Verify Firebase config in `firebaseConfig.ts`
- Check Firestore security rules
- Ensure internet connection

**API reminder generation failing**
- Check if reminder API is running on `localhost:8080`
- Verify API endpoint format
- App will fall back to default messages if API fails

### Debug Mode
Enable detailed logging by checking console output during goal creation and notification scheduling.

---

*Last updated: 06/7/25*