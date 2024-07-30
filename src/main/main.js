const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.on('start-service', (event, service) => {
  startService(service);
});

ipcMain.on('stop-service', (event, service) => {
  stopService(service);
});

ipcMain.on('open-phpmyadmin', () => {
  shell.openExternal('http://localhost/phpmyadmin');
});

ipcMain.on('create-environment', async (event, envName, projectName) => {
  try {
    const response = await axios.post('http://localhost:8000/server.php', {
      action: 'createEnvironment',
      envName,
      projectName
    });
    mainWindow.webContents.send('environment-created', response.data);
  } catch (error) {
    mainWindow.webContents.send('error', error.message);
  }
});

ipcMain.on('set-versions', async (event, phpVersion, mysqlVersion) => {
  try {
    const response = await axios.post('http://localhost:8000/server.php', {
      action: 'setVersions',
      phpVersion,
      mysqlVersion
    });
    mainWindow.webContents.send('versions-set', response.data);
  } catch (error) {
    mainWindow.webContents.send('error', error.message);
  }
});

// Service management functions
function startService(service) {
  let command;
  if (service === 'apache') {
    command = 'D:\\EnviroPro\\bin\\apache\\bin\\httpd.exe';
  } else if (service === 'mysql') {
    command = 'D:\\EnviroPro\\bin\\mysql\\bin\\mysqld.exe --console';
  } else {
    mainWindow.webContents.send('error', `Unknown service: ${service}`);
    return;
  }

  exec(command, (error, stdout, stderr) => {
    if (error) {
      mainWindow.webContents.send('error', `Error starting ${service}: ${error.message}`);
      mainWindow.webContents.send('service-status', service, 'stopped');
    } else {
      mainWindow.webContents.send('service-status', service, 'running');
    }
    logMessage(`${service} start attempt: ${stdout}`);
    if (stderr) logError(`${service} start error: ${stderr}`);
  });
}

function stopService(service) {
  let command;
  if (service === 'apache') {
    command = 'taskkill /F /IM httpd.exe';
  } else if (service === 'mysql') {
    command = 'taskkill /F /IM mysqld.exe';
  } else {
    mainWindow.webContents.send('error', `Unknown service: ${service}`);
    return;
  }

  exec(command, (error, stdout, stderr) => {
    if (error) {
      mainWindow.webContents.send('error', `Error stopping ${service}: ${error.message}`);
      mainWindow.webContents.send('service-status', service, 'running');
    } else {
      mainWindow.webContents.send('service-status', service, 'stopped');
    }
    logMessage(`${service} stop attempt: ${stdout}`);
    if (stderr) logError(`${service} stop error: ${stderr}`);
  });
}

// Logging functions
function logMessage(message) {
  const logPath = path.join(__dirname, 'log.txt');
  fs.appendFileSync(logPath, `${new Date().toISOString()} - ${message}\n`);
  mainWindow.webContents.send('log-message', message);
}

function logError(error) {
  const logPath = path.join(__dirname, 'error_log.txt');
  fs.appendFileSync(logPath, `${new Date().toISOString()} - ${error}\n`);
  mainWindow.webContents.send('log-message', `ERROR: ${error}`);
}
