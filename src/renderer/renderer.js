const { ipcRenderer } = require('electron');

document.getElementById('createEnv').addEventListener('click', () => {
  const envName = document.getElementById('environment').value;
  const projectName = document.getElementById('projectName').value.trim();

  if (!projectName) {
    document.getElementById('output').innerText = 'Please enter a project name.';
    return;
  }

  createEnvironment(envName, projectName);
});

document.getElementById('setVersions').addEventListener('click', () => {
  const phpVersion = document.getElementById('phpVersion').value;
  const mysqlVersion = document.getElementById('mysqlVersion').value;
  setVersions(phpVersion, mysqlVersion);
});

document.getElementById('startApache').addEventListener('click', () => {
  ipcRenderer.send('start-service', 'apache');
});

document.getElementById('stopApache').addEventListener('click', () => {
  ipcRenderer.send('stop-service', 'apache');
});

document.getElementById('startMySQL').addEventListener('click', () => {
  ipcRenderer.send('start-service', 'mysql');
});

document.getElementById('stopMySQL').addEventListener('click', () => {
  ipcRenderer.send('stop-service', 'mysql');
});

document.getElementById('openPhpMyAdmin').addEventListener('click', () => {
  ipcRenderer.send('open-phpmyadmin');
});

ipcRenderer.on('service-status', (event, service, status) => {
  const statusIndicator = document.getElementById(`${service}Status`);
  if (status === 'running') {
    statusIndicator.classList.remove('red');
    statusIndicator.classList.add('green');
  } else {
    statusIndicator.classList.remove('green');
    statusIndicator.classList.add('red');
  }
  showPopup(`${service} is now ${status}`);
});

ipcRenderer.on('log-message', (event, message) => {
  showDebugInfo(message);
});

function createEnvironment(envName, projectName) {
  showPopup(`Creating environment for ${projectName}...`);

  fetch('http://localhost:8000/server.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      action: 'createEnvironment',
      envName: envName,
      projectName: projectName,
    }),
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.text();
  })
  .then(text => {
    try {
      const data = JSON.parse(text);
      document.getElementById('output').innerText = data.message || data.error;
      hidePopup();
    } catch (error) {
      document.getElementById('output').innerText = `Error parsing JSON: ${error.message}`;
      showDebugInfo(text);
    }
  })
  .catch(error => {
    document.getElementById('output').innerText = `Fetch error: ${error.message}`;
    showDebugInfo(error.message);
  });
}

function setVersions(phpVersion, mysqlVersion) {
  fetch('http://localhost:8000/server.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      action: 'setVersions',
      phpVersion: phpVersion,
      mysqlVersion: mysqlVersion,
    }),
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.text();
  })
  .then(text => {
    try {
      const data = JSON.parse(text);
      document.getElementById('output').innerText = data.message || data.error;
    } catch (error) {
      document.getElementById('output').innerText = `Error parsing JSON: ${error.message}`;
      showDebugInfo(text);
    }
  })
  .catch(error => {
    document.getElementById('output').innerText = `Fetch error: ${error.message}`;
    showDebugInfo(error.message);
  });
}

function showPopup(message) {
  const popup = document.getElementById('popup');
  const popupContent = document.getElementById('popupContent');
  popupContent.innerText = message;
  popup.style.display = 'block';
}

function hidePopup() {
  const popup = document.getElementById('popup');
  popup.style.display = 'none';
}

function showDebugInfo(info) {
  const debugContent = document.getElementById('debugContent');
  debugContent.innerText = info;
  console.log(info); // Log to console as well
}
