const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess;

function startPythonServer() {
  const apiDir = path.join(__dirname, '..', 'api');
  // Try python, then python3
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  pythonProcess = spawn(pythonCmd, ['-m', 'uvicorn', 'main:app', '--port', '8000', '--reload'], {
    cwd: apiDir,
    env: { ...process.env },
    shell: true,
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[API] ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.log(`[API err] ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'default',
    title: 'Homeroom Hub',
    icon: path.join(__dirname, 'renderer', 'icon.png'),
    backgroundColor: '#F8FAFC',
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  startPythonServer();
  // Wait a moment for Python to start
  setTimeout(createWindow, 1500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (pythonProcess) pythonProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (pythonProcess) pythonProcess.kill();
});
