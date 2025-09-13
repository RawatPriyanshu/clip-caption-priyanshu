# AI Video Metadata Generator

**URL**: https://clip-caption.netlify.app/

## Overview

An AI-powered web application that automatically generates metadata and subtitles for video content. Designed for content creators, social media marketers, and video editors who need to optimize their videos for multiple platforms quickly and efficiently.

## Features

### Core Functionality
- **AI-Powered Transcription**: Automatic speech-to-text conversion using Whisper models
- **Multi-Platform Metadata Generation**: Create optimized titles, descriptions, and hashtags for different social media platforms
- **Subtitle Export**: Generate and download SRT subtitle files
- **Batch Processing**: Process multiple videos simultaneously with queue management
- **Video Upload & Management**: Secure file upload and storage with processing status tracking

### User Experience
- **Monochrome Design**: Clean, minimalistic interface with dark/light mode support
- **Responsive Layout**: Mobile-optimized design for on-the-go content creation
- **Real-time Progress**: Live updates on transcription and processing status
- **User Roles**: Free, premium, and admin tiers with different generation limits

### Security & Performance
- **Authentication**: Secure Supabase-based user authentication
- **Role-based Access**: Different permission levels and usage limits
- **Real-time Updates**: Live status updates using Supabase subscriptions
- **Optimized Processing**: WebGPU acceleration with CPU fallback for transcription

## Technology Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework with custom design system
- **shadcn/ui** - High-quality, accessible React components
- **React Router** - Client-side routing
- **React Hook Form** - Performant forms with easy validation

### Backend & Database
- **Supabase** - Backend-as-a-Service with PostgreSQL database
- **Supabase Auth** - User authentication and authorization
- **Supabase Storage** - File upload and storage
- **Row Level Security (RLS)** - Database-level security policies

### AI & Processing
- **Hugging Face Transformers** - AI model integration
- **Whisper Models** - Speech-to-text transcription
- **WebGPU/CPU Processing** - Optimized AI inference
- **Custom Queue System** - Batch processing management

### State Management & Utils
- **TanStack Query** - Server state management
- **React Context** - Global state management
- **Custom Hooks** - Reusable business logic
- **Zod** - Runtime type validation

## Getting Started

### Prerequisites
- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Local Development

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

## How to Edit This Code

### Use Lovable (Recommended)

Simply visit the [Lovable Project](https://lovable.dev/projects/f1ec8669-588c-4500-ac1f-c97b70622d73) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

### Use Your Preferred IDE

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

### Edit Files Directly in GitHub

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

### Use GitHub Codespaces

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Deployment

### Deploy with Lovable
Simply open [Lovable](https://lovable.dev/projects/f1ec8669-588c-4500-ac1f-c97b70622d73) and click on Share → Publish.

### Custom Domain
Yes, you can connect a custom domain! Navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── batch/          # Batch processing components
│   └── layout/         # Layout components
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── services/           # Business logic and API services
├── utils/              # Utility functions
└── integrations/       # Third-party integrations
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
