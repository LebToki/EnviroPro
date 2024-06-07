const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  ipcMain.handle('execute-command', async (event, command) => {
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
  });

  ipcMain.on('start-service', (event, service) => {
    let command;
    if (service === 'apache') {
      command = 'start "" "D:\\EnviroPro\\bin\\apache\\bin\\httpd.exe"';
    } else if (service === 'mysql') {
      command = 'start "" "D:\\EnviroPro\\bin\\mysql\\bin\\mysqld.exe" --console';
    }
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logError(`Error starting ${service}: ${error.message}`);
        mainWindow.webContents.send('service-status', service, 'stopped');
      } else {
        logMessage(`${service} started successfully`);
        mainWindow.webContents.send('service-status', service, 'running');
      }
      if (stderr) {
        logError(`Stderr starting ${service}: ${stderr}`);
      }
    });
  });

  ipcMain.on('stop-service', (event, service) => {
    let command;
    if (service === 'apache') {
      command = 'taskkill /F /IM httpd.exe';
    } else if (service === 'mysql') {
      command = 'taskkill /F /IM mysqld.exe';
    }
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logError(`Error stopping ${service}: ${error.message}`);
        mainWindow.webContents.send('service-status', service, 'running');
      } else {
        logMessage(`${service} stopped successfully`);
        mainWindow.webContents.send('service-status', service, 'stopped');
      }
      if (stderr) {
        logError(`Stderr stopping ${service}: ${stderr}`);
      }
    });
  });

  ipcMain.on('open-phpmyadmin', () => {
    shell.openExternal('http://localhost/phpmyadmin');
  });
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
