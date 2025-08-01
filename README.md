# AI Chat Platform

A self-hosted AI chatbot platform similar to ChatGPT, customizable for different use cases.

## Features

- 🚀 Self-hosted solution with Docker support
- 💬 Multiple AI agents with custom personalities
- 🔒 Local authentication with JWT
- 🎨 Customizable branding and themes
- 📱 Mobile-responsive design
- 🤖 Open WebUI API integration
- 📤 Export chats as images or PDFs
- 🛠️ Easy installation wizard

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Express.js + Node.js
- **Database**: MySQL
- **Auth**: JWT + bcrypt
- **Image Processing**: Sharp (backend) / html2canvas (frontend)

## Installation

### Prerequisites

- Node.js 16+
- MySQL 5.7+
- npm or yarn

### Quick Start

1. Clone the repository
```bash
git clone <repository-url>
cd ChatPlatform
```

2. Install dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. Start the backend server
```bash
cd backend
npm run dev
```

4. Start the frontend development server
```bash
cd frontend
npm run dev
```

5. Open http://localhost:5173 in your browser

6. Follow the installation wizard to:
   - Configure database connection
   - Create admin user
   - Set up initial configuration

## Development

### Backend API

The backend runs on port 3001 by default and provides these endpoints:

- `/api/health` - Health check
- `/api/install/*` - Installation wizard endpoints
- `/api/auth/*` - Authentication endpoints
- `/api/chat/*` - Chat functionality
- `/api/admin/*` - Admin panel endpoints

### Frontend Structure

```
/frontend/
├── /pages/          - Page components
├── /components/     - Reusable components
├── /contexts/       - React contexts
├── /hooks/          - Custom hooks
├── /services/       - API services
└── /utils/          - Utility functions
```

## Docker Deployment

```bash
docker-compose up -d
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Backend Configuration
PORT=3001
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=chatplatform

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Open WebUI Configuration
OPEN_WEBUI_BASE_URL=http://localhost:8080
OPEN_WEBUI_API_KEY=
```

## License

MIT