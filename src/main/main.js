const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  setupIpcHandlers(mainWindow);
}

function setupIpcHandlers(mainWindow) {
  ipcMain.handle('execute-command', async (event, command) => {
    return executeCommand(command);
  });

  ipcMain.on('toggle-service', (event, service) => {
    toggleService(service, mainWindow);
  });

  ipcMain.on('open-phpmyadmin', () => {
    shell.openExternal('http://localhost/phpmyadmin');
  });

  ipcMain.on('set-versions', (event, phpVersion, mysqlVersion) => {
    setVersions(phpVersion, mysqlVersion, mainWindow);
  });

  ipcMain.on('create-project', (event, projectType) => {
    createProject(projectType, mainWindow);
  });
}

function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        reject(`Stderr: ${stderr}`);
        return;
      }
      resolve(stdout);
    });
  });
}

function toggleService(service, mainWindow) {
  const isRunning = checkServiceStatus(service);
  const action = isRunning ? 'stop' : 'start';
  const command = getServiceCommand(service, action);

  executeCommand(command)
    .then(() => {
      const newStatus = action === 'start' ? 'running' : 'stopped';
      logMessage(`${service} ${action}ed successfully`);
      mainWindow.webContents.send('service-status', service, newStatus);
    })
    .catch((error) => {
      logError(`Error ${action}ing ${service}: ${error}`);
      mainWindow.webContents.send('service-status', service, isRunning ? 'running' : 'stopped');
    });
}

function checkServiceStatus(service) {
  // Implement logic to check if the service is running
  // This is a placeholder and should be replaced with actual status checking logic
  return false;
}

function getServiceCommand(service, action) {
  const commands = {
    apache: {
      start: 'start "" "D:\\EnviroPro\\bin\\apache\\bin\\httpd.exe"',
      stop: 'taskkill /F /IM httpd.exe'
    },
    mysql: {
      start: 'start "" "D:\\EnviroPro\\bin\\mysql\\bin\\mysqld.exe" --console',
      stop: 'taskkill /F /IM mysqld.exe'
    }
  };

  return commands[service][action];
}

function setVersions(phpVersion, mysqlVersion, mainWindow) {
  // Implement logic to set PHP and MySQL versions
  logMessage(`Setting PHP version to ${phpVersion} and MySQL version to ${mysqlVersion}`);
  mainWindow.webContents.send('versions-set', phpVersion, mysqlVersion);
}

function createProject(projectType, mainWindow) {
  // Implement logic to create WordPress or Laravel projects
  logMessage(`Creating ${projectType} project`);
  mainWindow.webContents.send('project-created', projectType);
}

function logMessage(message) {
  const logPath = path.join(__dirname, 'log.txt');
  fs.appendFileSync(logPath, `${new Date().toISOString()} - ${message}\n`);
}

function logError(error) {
  const logPath = path.join(__dirname, 'error_log.txt');
  fs.appendFileSync(logPath, `${new Date().toISOString()} - ${error}\n`);
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
