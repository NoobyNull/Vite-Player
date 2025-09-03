# 🔌 GoogleAI App Player - API Documentation

## Base URL
```
http://localhost:8081/api
```

## 📤 Upload Endpoints

### POST /upload
Upload and install a new Vite application from GoogleAI Studio.

**Request:**
```bash
curl -X POST \
  -F "app=@myapp.zip" \
  http://localhost:8081/api/upload
```

**Response (Success):**
```json
{
  "success": true,
  "app": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "My Vite App",
    "version": "1.0.0",
    "description": "A sample Vite application",
    "framework": "Vite",
    "status": "stopped",
    "port": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "size": "2.5 MB"
  },
  "message": "App 'My Vite App' installed successfully"
}
```

**Response (Error):**
```json
{
  "error": "Invalid Vite app: package.json not found or invalid",
  "details": "Detailed error information (in development mode)"
}
```

### POST /upload/validate
Validate a ZIP file before installation.

**Request:**
```bash
curl -X POST \
  -F "app=@myapp.zip" \
  http://localhost:8081/api/upload/validate
```

**Response:**
```json
{
  "valid": true,
  "message": "ZIP file appears to be a valid Vite application",
  "details": {
    "hasPackageJson": true,
    "hasIndexHtml": true,
    "fileCount": 156
  }
}
```

---

## 📱 Application Management

### GET /apps
Retrieve all installed applications.

**Response:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "My Vite App",
    "version": "1.0.0",
    "description": "A sample application",
    "framework": "Vite",
    "status": "running",
    "port": 3000,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "size": "2.5 MB"
  }
]
```

### GET /apps/:id
Get details for a specific application.

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "My Vite App",
  "version": "1.0.0",
  "status": "running",
  "port": 3000,
  "path": "/path/to/app",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### POST /apps/:id/start
Start a specific application.

**Response (Success):**
```json
{
  "success": true,
  "message": "App 'My Vite App' started successfully",
  "port": 3000,
  "status": "running"
}
```

**Response (Error):**
```json
{
  "error": "App is already running",
  "port": 3000
}
```

### POST /apps/:id/stop
Stop a running application.

**Response:**
```json
{
  "success": true,
  "message": "App 'My Vite App' stopped successfully",
  "status": "stopped"
}
```

### POST /apps/:id/restart
Restart an application (stop then start).

**Response:**
```json
{
  "success": true,
  "message": "App 'My Vite App' restarted successfully",
  "port": 3000,
  "status": "running"
}
```

### DELETE /apps/:id
Delete an application permanently.

**Response:**
```json
{
  "success": true,
  "message": "App 'My Vite App' deleted successfully"
}
```

### GET /apps/:id/status
Get current status of a specific application.

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "My Vite App",
  "status": "running",
  "port": 3000,
  "url": "http://localhost:3000",
  "uptime": 3600000
}
```

### GET /apps/:id/logs
Get logs for a specific application.

**Query Parameters:**
- `lines` (number): Number of log lines to return (default: 100)
- `level` (string): Log level filter ('all', 'error', 'warn', 'info')

**Response:**
```json
{
  "appId": "123e4567-e89b-12d3-a456-426614174000",
  "appName": "My Vite App",
  "logs": [
    {
      "timestamp": "2024-01-15T10:30:00.000Z",
      "level": "INFO",
      "message": "App started successfully"
    }
  ],
  "totalLines": 1
}
```

### PATCH /apps/:id
Update application metadata.

**Request:**
```json
{
  "name": "Updated App Name",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "success": true,
  "message": "App updated successfully",
  "app": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Updated App Name",
    "description": "Updated description"
  }
}
```

---

## 📦 Bulk Operations

### POST /apps/bulk/start
Start multiple applications at once.

**Request:**
```json
{
  "appIds": [
    "123e4567-e89b-12d3-a456-426614174000",
    "456e7890-e89b-12d3-a456-426614174001"
  ]
}
```

**Response:**
```json
{
  "success": [
    {
      "appId": "123e4567-e89b-12d3-a456-426614174000",
      "status": "started",
      "port": 3000
    }
  ],
  "errors": [
    {
      "appId": "456e7890-e89b-12d3-a456-426614174001",
      "error": "App not found"
    }
  ],
  "summary": {
    "total": 2,
    "succeeded": 1,
    "failed": 1
  }
}
```

### POST /apps/bulk/stop
Stop multiple applications at once.

**Request:**
```json
{
  "appIds": ["app-id-1", "app-id-2"]
}
```

---

## ⚙️ Settings Management

### GET /settings
Get current system settings.

**Response:**
```json
{
  "portRange": "3000-3999",
  "maxApps": 5,
  "autoStart": true,
  "mode": "single"
}
```

### POST /settings
Update system settings.

**Request:**
```json
{
  "portRange": "3000-3999",
  "maxApps": 10,
  "autoStart": false,
  "mode": "multi"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "settings": {
    "portRange": "3000-3999",
    "maxApps": 10,
    "autoStart": false,
    "mode": "multi"
  }
}
```

### POST /settings/reset
Reset settings to defaults.

**Response:**
```json
{
  "success": true,
  "message": "Settings reset to defaults",
  "settings": {
    "portRange": "3000-3999",
    "maxApps": 5,
    "autoStart": true,
    "mode": "single"
  }
}
```

### GET /settings/export
Export current settings and app list.

**Response:**
```json
{
  "settings": {
    "portRange": "3000-3999",
    "maxApps": 5,
    "autoStart": true,
    "mode": "single"
  },
  "apps": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "My App",
      "version": "1.0.0",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "exportedAt": "2024-01-15T12:00:00.000Z",
  "version": "1.0.0"
}
```

### GET /settings/system
Get system information and statistics.

**Response:**
```json
{
  "node": {
    "version": "v18.17.0",
    "platform": "linux",
    "arch": "x64",
    "uptime": 3600
  },
  "system": {
    "hostname": "myserver",
    "platform": "linux",
    "totalMemory": 8589934592,
    "freeMemory": 4294967296,
    "cpus": 4
  },
  "application": {
    "totalApps": 5,
    "runningApps": 2,
    "usedPorts": [3000, 3001],
    "totalDiskUsage": "150 MB",
    "appsDirectory": "/path/to/apps"
  }
}
```

### POST /settings/validate-ports
Validate a port range for availability.

**Request:**
```json
{
  "portRange": "3000-3010"
}
```

**Response:**
```json
{
  "valid": true,
  "portRange": {
    "min": 3000,
    "max": 3010
  },
  "totalRange": 11,
  "sampledPorts": 10,
  "availablePorts": [3000, 3001, 3003, 3005],
  "busyPorts": [3002, 3004],
  "availabilityRate": 0.6
}
```

---

## 📊 System Status

### GET /status
Get comprehensive system status.

**Response:**
```json
{
  "system": "online",
  "apps": [
    {
      "id": "app-id",
      "name": "App Name",
      "status": "running",
      "port": 3000
    }
  ],
  "ports": [3000, 3001],
  "settings": {
    "mode": "multi",
    "maxApps": 5
  }
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "uptime": 3600,
  "apps": 5,
  "runningApps": 2
}
```

---

## 🔌 WebSocket Events

Connect to: `ws://localhost:8081/ws`

### Client → Server Events

#### ping
```json
{
  "type": "ping"
}
```

#### get_apps
```json
{
  "type": "get_apps"
}
```

### Server → Client Events

#### connected
Sent when client connects.
```json
{
  "type": "connected",
  "apps": [...],
  "settings": {...}
}
```

#### app_status_changed
Sent when app status changes.
```json
{
  "type": "app_status_changed",
  "appId": "app-id",
  "status": "running",
  "port": 3000
}
```

#### app_installed
Sent when new app is installed.
```json
{
  "type": "app_installed",
  "app": {...}
}
```

#### app_deleted
Sent when app is deleted.
```json
{
  "type": "app_deleted",
  "appId": "app-id",
  "name": "App Name"
}
```

#### settings_updated
Sent when settings are changed.
```json
{
  "type": "settings_updated",
  "settings": {...}
}
```

#### error
Sent when an error occurs.
```json
{
  "type": "error",
  "message": "Error description"
}
```

---

## 🚨 Error Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| 400 | Bad Request | Invalid parameters, malformed ZIP |
| 404 | Not Found | App ID doesn't exist |
| 409 | Conflict | App already running, max apps reached |
| 422 | Unprocessable Entity | npm install failed, invalid Vite app |
| 500 | Internal Server Error | System error, disk full |
| 503 | Service Unavailable | No available ports |

---

## 📝 Example Usage Scripts

### JavaScript/Node.js
```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Upload app
const uploadApp = async (zipPath) => {
  const form = new FormData();
  form.append('app', fs.createReadStream(zipPath));
  
  try {
    const response = await axios.post('http://localhost:8081/api/upload', form, {
      headers: form.getHeaders()
    });
    console.log('App uploaded:', response.data.app.name);
    return response.data.app.id;
  } catch (error) {
    console.error('Upload failed:', error.response.data.error);
  }
};

// Start app
const startApp = async (appId) => {
  try {
    const response = await axios.post(`http://localhost:8081/api/apps/${appId}/start`);
    console.log(`App started on port ${response.data.port}`);
  } catch (error) {
    console.error('Start failed:', error.response.data.error);
  }
};
```

### Python
```python
import requests

# Upload app
def upload_app(zip_path):
    with open(zip_path, 'rb') as f:
        files = {'app': f}
        response = requests.post('http://localhost:8081/api/upload', files=files)
        
    if response.status_code == 200:
        app = response.json()['app']
        print(f"App uploaded: {app['name']}")
        return app['id']
    else:
        print(f"Upload failed: {response.json()['error']}")

# Get all apps
def get_apps():
    response = requests.get('http://localhost:8081/api/apps')
    return response.json()
```

### cURL Examples
```bash
# Upload app
curl -X POST -F "app=@myapp.zip" http://localhost:8081/api/upload

# Get all apps
curl http://localhost:8081/api/apps

# Start app
curl -X POST http://localhost:8081/api/apps/APP_ID/start

# Get system status
curl http://localhost:8081/api/health
```

---

**📖 For more examples and advanced usage, see the main [README.md](README.md)**