# Cloudflare Zero Trust Tunnel Configuration

## Setup Steps

### 1. Cloudflare Tunnel Configuration
Your `cloudflared` tunnel should be configured to forward traffic to both frontend and backend:

```yaml
# Example tunnel configuration (config.yml)
tunnel: your-tunnel-id
credentials-file: /path/to/tunnel-credentials.json

ingress:
  # Frontend (React/Vite dev server)
  - hostname: jesus.stevensumpter.com
    service: http://localhost:5173
    originRequest:
      noTLSVerify: true
  
  # Backend API (Express server)  
  - hostname: jesus.stevensumpter.com
    path: /api/*
    service: http://localhost:3001
    originRequest:
      noTLSVerify: true
  
  # Static files and uploads
  - hostname: jesus.stevensumpter.com
    path: /uploads/*
    service: http://localhost:3001
    originRequest:
      noTLSVerify: true
      
  # Catch-all
  - service: http_status:404
```

### 2. Environment Variables
Update your `.env` file:
```env
FRONTEND_URL=https://jesus.stevensumpter.com
FRONTEND_URL_LOCAL=http://localhost:5173
```

### 3. Frontend Configuration
Create/update `frontend/.env`:
```env
VITE_API_URL=https://jesus.stevensumpter.com:3001
```

### 4. Start Services
1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm run dev`
3. Start tunnel: `cloudflared tunnel run your-tunnel-name`

### 5. Access Your Application
Visit: https://jesus.stevensumpter.com

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Check that your domain is in the allowedOrigins array
2. **Host Header Errors**: Ensure domain is in vite.config.js allowedHosts
3. **API Connection Issues**: Verify VITE_API_URL points to correct tunnel URL
4. **File Upload Issues**: Check that /uploads/* path is properly routed

### Development vs Production:
- **Development**: Use tunnel for external access while developing
- **Production**: Consider using Cloudflare Pages or proper reverse proxy

### Security Notes:
- Zero Trust tunnels provide built-in authentication
- No need to expose ports directly to internet
- All traffic encrypted end-to-end