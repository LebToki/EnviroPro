const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  // Service toggling
  document.getElementById('toggleApache').addEventListener('click', () => toggleService('apache'));
  document.getElementById('toggleMySQL').addEventListener('click', () => toggleService('mysql'));

  // Open phpMyAdmin
  document.getElementById('openPhpMyAdmin').addEventListener('click', () => {
    ipcRenderer.send('open-phpmyadmin');
  });

  // Set versions
  document.getElementById('setVersions').addEventListener('click', () => {
    const phpVersion = document.getElementById('phpVersion').value;
    const mysqlVersion = document.getElementById('mysqlVersion').value;
    ipcRenderer.send('set-versions', phpVersion, mysqlVersion);
  });

  // Create environment
  document.getElementById('createWordPress').addEventListener('click', () => createEnvironment('WordPress'));
  document.getElementById('createLaravel').addEventListener('click', () => createEnvironment('Laravel'));

  // Listen for messages from the main process
  ipcRenderer.on('service-status', (event, service, status) => {
    document.getElementById(`${service}Status`).textContent = status;
    document.getElementById(`${service}Status`).className = `service-status ${status}`;
  });

  ipcRenderer.on('versions-set', (event, data) => {
    appendToOutput(data.message);
  });

  ipcRenderer.on('environment-created', (event, data) => {
    appendToOutput(data.message);
  });

  ipcRenderer.on('error', (event, error) => {
    appendToOutput(`Error: ${error}`, 'error');
  });
});

function toggleService(service) {
  ipcRenderer.send('toggle-service', service);
}

function createEnvironment(envName) {
  const projectName = prompt(`Enter a name for your ${envName} project:`);
  if (projectName) {
    ipcRenderer.send('create-environment', envName, projectName);
  }
}

function appendToOutput(message, className = '') {
  const output = document.getElementById('output');
  const p = document.createElement('p');
  p.textContent = message;
  p.className = className;
  output.appendChild(p);
  output.scrollTop = output.scrollHeight;
}
