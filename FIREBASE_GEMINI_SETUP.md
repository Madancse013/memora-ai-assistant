# Firebase + Gemini API Migration Guide

This guide explains how to set up your Memora application with Firebase Authentication and Gemini API.

## 🚀 Quick Setup

### 1. **Install Dependencies**

```bash
# Remove old dependencies and install new ones
npm remove @lovable.dev/cloud-auth-js lovable-tagger
npm install firebase
# or with bun:
bun install
```

### 2. **Firebase Setup**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select an existing one
3. Enable Authentication:
   - Go to **Authentication** → **Sign-in method**
   - Enable **Email/Password**
   - Enable **Google** (configure OAuth consent screen if needed)
4. Get your Firebase credentials:
   - Go to **Project Settings** → **General**
   - Copy your Web app configuration (Firebase SDK snippet)
   - You'll need: API Key, Auth Domain, Project ID, Storage Bucket, Messaging Sender ID, App ID

### 3. **Gemini API Setup**

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **"Get API Key"** or **"Create API Key"**
3. Create a new API key (or use existing)
4. Copy the API key

### 4. **Configure Environment Variables**

Create a `.env.local` file in the project root:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Gemini API Configuration
VITE_GEMINI_API_KEY=your_gemini_api_key

# Supabase Configuration (still needed for database)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### 5. **Update Supabase Database Structure**

The Supabase database now stores Firebase user IDs instead of Supabase user IDs. You may need to:

1. Create a migration script to update existing user_ids, OR
2. Start fresh (recommended for development)

**To start fresh:**
- Drop and recreate the Supabase tables
- Or clear the user-related data

## 📋 What Changed

### Authentication
- **Before:** Lovable OAuth via `@lovable.dev/cloud-auth-js`
- **After:** Firebase Authentication (Email/Password + Google OAuth)

### AI Integration
- **Before:** Lovable AI Gateway → Google Gemini
- **After:** Direct Google Generative AI API → Gemini

### Files Modified

1. **`src/integrations/firebase/index.ts`** (NEW)
   - Firebase initialization and auth exports
   
2. **`src/integrations/gemini/index.ts`** (NEW)
   - Gemini API integration functions
   
3. **`src/contexts/AuthContext.tsx`**
   - Updated to use Firebase instead of Supabase auth
   
4. **`src/pages/Auth.tsx`**
   - Updated to use Firebase authentication methods
   - Replaced Lovable Google OAuth with Firebase Google OAuth
   
5. **`src/pages/Chat.tsx`**
   - Removed Supabase function endpoint calls
   - Now uses Gemini API directly via `callGeminiAPIStream`
   
6. **`src/pages/DecisionAssistant.tsx`**
   - Replaced Supabase function calls with `callGeminiAPI`
   
7. **`src/pages/HabitLoop.tsx`**
   - Replaced Supabase function calls with `callGeminiAPI` for habit classification
   
8. **`package.json`**
   - Replaced `@lovable.dev/cloud-auth-js` with `@firebase/app` and `@firebase/auth`

## 🔧 Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Test email/password login:
   - Sign up with an email and password
   - Check Firebase Console to confirm user was created
   
3. Test Google OAuth:
   - Click "Sign in with Google"
   - Verify authentication works
   
4. Test AI features:
   - Chat functionality
   - Habit classification
   - Decision analysis

## 🐛 Troubleshooting

### "GEMINI_API_KEY is not configured"
- Ensure `VITE_GEMINI_API_KEY` is in your `.env.local` file
- Restart the dev server after changing environment variables

### Firebase Authentication not working
- Verify Firebase credentials in `.env.local`
- Check that Firebase project has Email/Password and Google providers enabled
- Check browser console for detailed error messages

### Database errors when creating decisions/habits
- Your Firebase user ID may not match existing Supabase records
- Consider clearing existing test data and starting fresh
- Or create a migration script to update user_ids

### "Google sign-in failed" with popup blocked
- Ensure popup is not blocked by browser
- Check Google OAuth configuration in Firebase Console
- Verify redirect URIs are correctly configured

## 📚 Useful Links

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Authentication Web Setup](https://firebase.google.com/docs/auth/web/start)
- [Google Gemini API Documentation](https://ai.google.dev/documentation)
- [Supabase Documentation](https://supabase.com/docs)

## ⚠️ Important Notes

1. **Database Migration**: Existing data tied to old Supabase user IDs will need to be migrated or cleared
2. **API Keys**: Never commit `.env.local` to version control. Use `.env.local.example` as a template
3. **Gemini API Costs**: Gemini API may have usage costs. Monitor your usage in Google Cloud Console
4. **Rate Limiting**: Consider implementing rate limiting for API calls to prevent excessive costs
