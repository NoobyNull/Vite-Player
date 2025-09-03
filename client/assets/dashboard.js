class GoogleAIAppPlayer {
    constructor() {
        this.apiBase = '';
        this.ws = null;
        this.apps = [];
        this.settings = {
            portRange: '3000-3999',
            maxApps: 5,
            autoStart: true,
            mode: 'single'
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.connectWebSocket();
        this.loadApps();
        this.loadSettings();
        this.updateSystemStatus();
    }

    setupEventListeners() {
        // Upload mode switching
        const zipModeBtn = document.getElementById('zipModeBtn');
        const base64ModeBtn = document.getElementById('base64ModeBtn');
        const uploadArea = document.getElementById('uploadArea');
        const base64UploadArea = document.getElementById('base64UploadArea');

        zipModeBtn.addEventListener('click', () => {
            this.switchUploadMode('zip');
        });

        base64ModeBtn.addEventListener('click', () => {
            this.switchUploadMode('base64');
        });

        // ZIP Upload functionality
        const fileInput = document.getElementById('fileInput');
        const browseBtn = document.getElementById('browseBtn');

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });

        // Browse button
        browseBtn.addEventListener('click', () => {
            fileInput.click();
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // Base64 Upload functionality
        const validateBase64Btn = document.getElementById('validateBase64Btn');
        const uploadBase64Btn = document.getElementById('uploadBase64Btn');

        validateBase64Btn.addEventListener('click', () => {
            this.validateBase64();
        });

        uploadBase64Btn.addEventListener('click', () => {
            this.handleBase64Upload();
        });

        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettings();
        });

        document.getElementById('closeSettings').addEventListener('click', () => {
            this.hideSettings();
        });

        document.getElementById('cancelSettings').addEventListener('click', () => {
            this.hideSettings();
        });

        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });

        // Mode select
        document.getElementById('modeSelect').addEventListener('change', (e) => {
            this.settings.mode = e.target.value;
            this.updateSettings();
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadApps();
        });

        // Modal overlay click
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.hideSettings();
            }
        });
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.updateSystemStatus(true);
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.updateSystemStatus(false);
            // Attempt to reconnect after 3 seconds
            setTimeout(() => {
                this.connectWebSocket();
            }, 3000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showToast('Connection error', 'error');
        };
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'app_status_changed':
                this.updateAppStatus(data.appId, data.status, data.port);
                break;
            case 'app_installed':
                this.loadApps();
                this.showToast(`App "${data.name}" installed successfully`, 'success');
                break;
            case 'upload_progress':
                this.updateUploadProgress(data.progress);
                break;
            case 'error':
                this.showToast(data.message, 'error');
                break;
        }
    }

    switchUploadMode(mode) {
        const zipModeBtn = document.getElementById('zipModeBtn');
        const base64ModeBtn = document.getElementById('base64ModeBtn');
        const uploadArea = document.getElementById('uploadArea');
        const base64UploadArea = document.getElementById('base64UploadArea');

        if (mode === 'zip') {
            zipModeBtn.classList.add('active');
            base64ModeBtn.classList.remove('active');
            uploadArea.classList.remove('hidden');
            base64UploadArea.classList.add('hidden');
        } else {
            base64ModeBtn.classList.add('active');
            zipModeBtn.classList.remove('active');
            uploadArea.classList.add('hidden');
            base64UploadArea.classList.remove('hidden');
        }
    }

    async handleFileUpload(file) {
        if (!file.name.endsWith('.zip')) {
            this.showToast('Please select a ZIP file', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('app', file);

        // Show upload progress
        this.showUploadProgress();

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                this.hideUploadProgress();
                this.showToast(`App "${result.app.name}" uploaded successfully`, 'success');
                this.loadApps();
                
                if (this.settings.autoStart) {
                    setTimeout(() => {
                        this.startApp(result.app.id);
                    }, 1000);
                }
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            this.hideUploadProgress();
            this.showToast(`Upload failed: ${error.message}`, 'error');
        }
    }

    async validateBase64() {
        const base64Input = document.getElementById('base64Input');
        const base64Data = base64Input.value.trim();

        if (!base64Data) {
            this.showToast('Please enter Base64 data first', 'error');
            return;
        }

        const validateBtn = document.getElementById('validateBase64Btn');
        const originalText = validateBtn.textContent;
        validateBtn.textContent = '🔄 Validating...';
        validateBtn.disabled = true;

        try {
            const response = await fetch('/api/base64/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ base64Data })
            });

            const result = await response.json();

            if (response.ok && result.valid) {
                this.showToast(
                    `✅ Valid Vite app detected! Files: ${result.details.fileCount}, Size: ${result.details.decodedSize}`,
                    'success'
                );
            } else {
                this.showToast(`❌ Invalid: ${result.message || result.error}`, 'error');
            }
        } catch (error) {
            this.showToast(`Validation failed: ${error.message}`, 'error');
        } finally {
            validateBtn.textContent = originalText;
            validateBtn.disabled = false;
        }
    }

    async handleBase64Upload() {
        const base64Input = document.getElementById('base64Input');
        const appName = document.getElementById('appName');
        const appDescription = document.getElementById('appDescription');

        const base64Data = base64Input.value.trim();

        if (!base64Data) {
            this.showToast('Please enter Base64 data', 'error');
            return;
        }

        const uploadBtn = document.getElementById('uploadBase64Btn');
        const originalText = uploadBtn.textContent;
        uploadBtn.textContent = '🚀 Uploading...';
        uploadBtn.disabled = true;

        try {
            const requestData = {
                base64Data: base64Data,
                name: appName.value.trim() || undefined,
                description: appDescription.value.trim() || undefined
            };

            const response = await fetch('/api/base64/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showToast(`App "${result.app.name}" uploaded successfully from Base64!`, 'success');
                
                // Clear form
                base64Input.value = '';
                appName.value = '';
                appDescription.value = '';
                
                // Reload apps
                this.loadApps();
                
                // Auto-start if enabled
                if (this.settings.autoStart) {
                    setTimeout(() => {
                        this.startApp(result.app.id);
                    }, 1000);
                }
            } else {
                throw new Error(result.error || 'Base64 upload failed');
            }
        } catch (error) {
            this.showToast(`Upload failed: ${error.message}`, 'error');
        } finally {
            uploadBtn.textContent = originalText;
            uploadBtn.disabled = false;
        }
    }

    showUploadProgress() {
        document.querySelector('.upload-content').classList.add('hidden');
        document.getElementById('uploadProgress').classList.remove('hidden');
    }

    hideUploadProgress() {
        document.querySelector('.upload-content').classList.remove('hidden');
        document.getElementById('uploadProgress').classList.add('hidden');
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('progressText').textContent = 'Uploading... 0%';
    }

    updateUploadProgress(progress) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Uploading... ${progress}%`;
    }

    async loadApps() {
        try {
            const response = await fetch('/api/apps');
            if (response.ok) {
                this.apps = await response.json();
                this.renderApps();
            } else {
                throw new Error('Failed to load apps');
            }
        } catch (error) {
            console.error('Error loading apps:', error);
            this.showToast('Failed to load applications', 'error');
        }
    }

    renderApps() {
        const appsGrid = document.getElementById('appsGrid');
        const emptyState = document.getElementById('emptyState');

        if (this.apps.length === 0) {
            appsGrid.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        appsGrid.classList.remove('hidden');
        emptyState.classList.add('hidden');

        appsGrid.innerHTML = this.apps.map(app => this.renderAppCard(app)).join('');

        // Add event listeners to app cards
        this.apps.forEach(app => {
            this.attachAppEventListeners(app.id);
        });
    }

    renderAppCard(app) {
        const statusClass = app.status === 'running' ? 'running' : 'stopped';
        const statusText = app.status === 'running' ? 'Running' : 'Stopped';
        const portInfo = app.port ? `:${app.port}` : '';

        return `
            <div class="app-card" data-app-id="${app.id}">
                <div class="app-header">
                    <div class="app-info">
                        <h3>${app.name}</h3>
                        <p>Version: ${app.version || '1.0.0'}</p>
                    </div>
                    <div class="app-status ${statusClass}">
                        <span class="status-dot ${statusClass}"></span>
                        ${statusText}${portInfo}
                    </div>
                </div>
                
                <div class="app-meta">
                    <span class="meta-item">📅 ${new Date(app.createdAt).toLocaleDateString()}</span>
                    <span class="meta-item">📦 ${app.size || 'Unknown'}</span>
                    ${app.framework ? `<span class="meta-item">⚡ ${app.framework}</span>` : ''}
                </div>

                <div class="app-actions">
                    ${app.status === 'running' 
                        ? `<button class="btn btn-danger btn-small stop-btn" data-app-id="${app.id}">⏹️ Stop</button>
                           <button class="btn btn-secondary btn-small view-btn" data-app-id="${app.id}" data-port="${app.port}">👁️ View</button>`
                        : `<button class="btn btn-success btn-small start-btn" data-app-id="${app.id}">▶️ Start</button>`
                    }
                    <button class="btn btn-secondary btn-small restart-btn" data-app-id="${app.id}">🔄 Restart</button>
                    <button class="btn btn-danger btn-small delete-btn" data-app-id="${app.id}">🗑️ Delete</button>
                </div>
            </div>
        `;
    }

    attachAppEventListeners(appId) {
        const card = document.querySelector(`[data-app-id="${appId}"]`);
        if (!card) return;

        // Start button
        const startBtn = card.querySelector('.start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startApp(appId));
        }

        // Stop button
        const stopBtn = card.querySelector('.stop-btn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopApp(appId));
        }

        // Restart button
        const restartBtn = card.querySelector('.restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restartApp(appId));
        }

        // View button
        const viewBtn = card.querySelector('.view-btn');
        if (viewBtn) {
            viewBtn.addEventListener('click', () => {
                const port = viewBtn.dataset.port;
                if (port) {
                    window.open(`http://localhost:${port}`, '_blank');
                }
            });
        }

        // Delete button
        const deleteBtn = card.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteApp(appId));
        }
    }

    async startApp(appId) {
        try {
            const response = await fetch(`/api/apps/${appId}/start`, {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                this.showToast(`App started on port ${result.port}`, 'success');
                this.updateAppStatus(appId, 'running', result.port);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to start app');
            }
        } catch (error) {
            this.showToast(`Failed to start app: ${error.message}`, 'error');
        }
    }

    async stopApp(appId) {
        try {
            const response = await fetch(`/api/apps/${appId}/stop`, {
                method: 'POST'
            });

            if (response.ok) {
                this.showToast('App stopped', 'success');
                this.updateAppStatus(appId, 'stopped');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to stop app');
            }
        } catch (error) {
            this.showToast(`Failed to stop app: ${error.message}`, 'error');
        }
    }

    async restartApp(appId) {
        try {
            await this.stopApp(appId);
            setTimeout(() => {
                this.startApp(appId);
            }, 2000);
        } catch (error) {
            this.showToast(`Failed to restart app: ${error.message}`, 'error');
        }
    }

    async deleteApp(appId) {
        if (!confirm('Are you sure you want to delete this app? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/apps/${appId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showToast('App deleted successfully', 'success');
                this.loadApps();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete app');
            }
        } catch (error) {
            this.showToast(`Failed to delete app: ${error.message}`, 'error');
        }
    }

    updateAppStatus(appId, status, port = null) {
        const app = this.apps.find(a => a.id === appId);
        if (app) {
            app.status = status;
            if (port) app.port = port;
            if (status === 'stopped') app.port = null;
        }
        this.renderApps();
    }

    showSettings() {
        const modal = document.getElementById('settingsModal');
        
        // Populate current settings
        document.getElementById('portRange').value = this.settings.portRange;
        document.getElementById('maxApps').value = this.settings.maxApps;
        document.getElementById('autoStart').checked = this.settings.autoStart;
        document.getElementById('modeSelect').value = this.settings.mode;

        modal.classList.add('active');
    }

    hideSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }

    async saveSettings() {
        const settings = {
            portRange: document.getElementById('portRange').value,
            maxApps: parseInt(document.getElementById('maxApps').value),
            autoStart: document.getElementById('autoStart').checked,
            mode: document.getElementById('modeSelect').value
        };

        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                this.settings = settings;
                this.showToast('Settings saved successfully', 'success');
                this.hideSettings();
            } else {
                throw new Error('Failed to save settings');
            }
        } catch (error) {
            this.showToast(`Failed to save settings: ${error.message}`, 'error');
        }
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/settings');
            if (response.ok) {
                const settings = await response.json();
                this.settings = { ...this.settings, ...settings };
                document.getElementById('modeSelect').value = this.settings.mode;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async updateSettings() {
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.settings)
            });
        } catch (error) {
            console.error('Error updating settings:', error);
        }
    }

    updateSystemStatus(online = false) {
        const statusIndicator = document.getElementById('systemStatus');
        const statusDot = statusIndicator.querySelector('.status-dot');
        const statusText = statusIndicator.querySelector('.status-text');

        if (online) {
            statusDot.className = 'status-dot online';
            statusText.textContent = 'Online';
        } else {
            statusDot.className = 'status-dot offline';
            statusText.textContent = 'Offline';
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Remove toast after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GoogleAIAppPlayer();
});