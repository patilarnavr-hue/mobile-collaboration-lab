# AgroEye - Smart Agricultural Monitoring

A Progressive Web App designed to help farmers monitor and manage crucial environmental factors that affect crop growth and productivity.

## Features

- **Real-time Moisture Monitoring**: Track soil moisture levels with visual indicators
- **Fertility Level Tracking**: Monitor soil fertility data with historical trends
- **Time Slot Management**: Create and manage watering schedules
- **Dashboard Overview**: Quick access to all key metrics
- **Data Logging**: Automatic recording of readings over time
- **Alert System**: Notifications for low moisture levels or scheduled watering times
- **Offline Capability**: Basic functionality when internet connection is limited

## Tech Stack

- **Frontend**: React with TypeScript, Tailwind CSS, Vite
- **Backend**: Lovable Cloud (Supabase) - Authentication, Database, Real-time
- **PWA**: Service Workers for offline functionality

## Project info

**URL**: https://lovable.dev/projects/0b28801d-fc56-4319-b363-135e72a077ee

## Getting Started

Follow these steps to run the project locally:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Installation as PWA

### Desktop
1. Visit the app in Chrome/Edge
2. Click the install icon in the address bar
3. Click "Install" in the prompt

### Mobile
1. Visit the app in your mobile browser
2. Tap the share/menu button
3. Select "Add to Home Screen"

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Technologies

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Lovable Cloud (Supabase)

## Deployment

Simply open [Lovable](https://lovable.dev/projects/0b28801d-fc56-4319-b363-135e72a077ee) and click on Share -> Publish.

The app can also be deployed to any static hosting service:
- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

Ensure your Lovable Cloud backend is properly configured with the correct redirect URLs.

## Custom Domain

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Security

- Row Level Security (RLS) policies protect user data
- Authentication required for all data operations
- Secure environment variable handling

## Support

For issues and questions, visit [Lovable](https://lovable.dev/projects/0b28801d-fc56-4319-b363-135e72a077ee) and use the AI assistant.
