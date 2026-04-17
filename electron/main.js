const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;
const PORT = 3456; // Use non-standard port to avoid conflicts

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'AccSense Intelligence — Accenture Compass',
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0a0a0a',
    show: false, // Show after loaded
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Remove default menu bar
  Menu.setApplicationMenu(null);

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Intercept navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.includes(`localhost:${PORT}`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  mainWindow.loadURL(`http://localhost:${PORT}/explore/united-states/intelligence`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  return new Promise((resolve) => {
    const nextPath = path.join(__dirname, '..', 'node_modules', '.bin', 'next');
    const projectDir = path.join(__dirname, '..');

    serverProcess = spawn(process.platform === 'win32' ? 'cmd' : 'sh',
      process.platform === 'win32' ? ['/c', `"${nextPath}" start -p ${PORT}`] : ['-c', `"${nextPath}" start -p ${PORT}`],
      {
        cwd: projectDir,
        shell: true,
        env: { ...process.env, NODE_ENV: 'production' },
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log('[Next.js]', msg.trim());
      if (msg.includes('Ready') || msg.includes('started') || msg.includes(`${PORT}`)) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('[Next.js]', data.toString().trim());
    });

    // Fallback — resolve after 5 seconds regardless
    setTimeout(resolve, 5000);
  });
}

function stopServer() {
  if (serverProcess) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
    } else {
      serverProcess.kill('SIGTERM');
    }
    serverProcess = null;
  }
}

// App lifecycle
app.whenReady().then(async () => {
  await startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  stopServer();
  app.quit();
});

app.on('before-quit', () => {
  stopServer();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
