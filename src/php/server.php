<?php

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json'); // Ensure the response is JSON
    try {
        $action = $_POST['action'];

        switch ($action) {
            case 'createEnvironment':
                $envName = $_POST['envName'];
                $projectName = $_POST['projectName'];
                createEnvironment($envName, $projectName);
                break;
            case 'setVersions':
                $phpVersion = $_POST['phpVersion'];
                $mysqlVersion = $_POST['mysqlVersion'];
                setVersions($phpVersion, $mysqlVersion);
                break;
            default:
                echo json_encode(['error' => 'Invalid action']);
        }
    } catch (Exception $e) {
        logError($e->getMessage());
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createEnvironment($envName, $projectName)
{
    try {
        logMessage("Starting environment creation for $envName with project name $projectName.");
        $config = parseConfigFile(__DIR__ . '/../../config.ini');

        if (isset($config[$envName])) {
            $command = str_replace('%s', $projectName, $config[$envName]);

            // Create the project directory
            $projectDir = __DIR__ . '/../../www/' . $projectName;
            if (!file_exists($projectDir)) {
                if (!mkdir($projectDir, 0777, true)) {
                    throw new Exception("Failed to create project directory: $projectDir");
                }
                logMessage("Project directory created: $projectDir");
            } else {
                logMessage("Project directory already exists: $projectDir");
            }

            // Download and extract WordPress
            if ($envName === 'WordPress') {
                $wpZipUrl = $config[$envName];
                $zipFile = $projectDir . '/latest.tar.gz';
                file_put_contents($zipFile, fopen($wpZipUrl, 'r'));
                $phar = new PharData($zipFile);
                $phar->decompress(); // creates files.tar
                $phar = new PharData(str_replace('.gz', '', $zipFile));
                $phar->extractTo($projectDir);

                // Remove the tar file
                unlink($zipFile);
                logMessage("WordPress extracted to $projectDir");

                // Set up pretty URL
                $domain = $projectName . '.local';
                updateHostsFile($domain);
                setupApacheVirtualHost($domain, $projectDir);

                // Set up the database
                $dbName = strtolower($projectName) . '_db';
                setupDatabase($dbName);

                echo json_encode(['message' => "$envName environment created successfully at $projectDir with URL http://$domain:8081"]);
            } else {
                shell_exec($command);
                echo json_encode(['message' => "$envName environment created successfully"]);
            }
        } else {
            throw new Exception('Unknown environment');
        }
    } catch (Exception $e) {
        logError($e->getMessage());
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function setVersions($phpVersion, $mysqlVersion)
{
    try {
        // Adjust commands for Windows if necessary
        shell_exec("update-alternatives --set php /usr/bin/php$phpVersion");
        shell_exec("docker pull mysql:$mysqlVersion && docker run --name mysql-server -e MYSQL_ROOT_PASSWORD=root -d mysql:$mysqlVersion");
        echo json_encode(['message' => "Switched to PHP $phpVersion and MySQL $mysqlVersion"]);
    } catch (Exception $e) {
        logError($e->getMessage());
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function parseConfigFile($fileName)
{
    $config = parse_ini_file($fileName);
    return $config;
}

function updateHostsFile($domain)
{
    $hostsFile = 'C:/Windows/System32/drivers/etc/hosts';
    $line = "127.0.0.1\t$domain\n";
    file_put_contents($hostsFile, $line, FILE_APPEND | LOCK_EX);
}

function setupApacheVirtualHost($domain, $projectDir)
{
    $vhostConfigFile = 'D:/EnviroPro/bin/apache/conf/extra/vhosts.conf';
    $vhostConfigTemplate = "
<VirtualHost *:8081>
    DocumentRoot \"$projectDir\"
    ServerName $domain
    <Directory \"$projectDir\">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
";
    file_put_contents($vhostConfigFile, $vhostConfigTemplate, FILE_APPEND | LOCK_EX);

    // Restart Apache to apply changes
    shell_exec('D:/EnviroPro/bin/apache/bin/httpd.exe -k restart');
}

function setupDatabase($dbName)
{
    $mysqli = new mysqli("localhost", "root", "root_password", "", 3307); // Update with your MySQL credentials

    if ($mysqli->connect_error) {
        die("Connection failed: " . $mysqli->connect_error);
    }

    // Create database
    $sql = "CREATE DATABASE IF NOT EXISTS $dbName";
    if ($mysqli->query($sql) === true) {
        logMessage("Database created successfully: $dbName");
    } else {
        throw new Exception("Error creating database: " . $mysqli->error);
    }

    $mysqli->close();
}

function logMessage($message)
{
    file_put_contents(__DIR__ . '/log.txt', date('Y-m-d H:i:s') . " - " . $message . "\n", FILE_APPEND);
}

function logError($error)
{
    file_put_contents(__DIR__ . '/error_log.txt', date('Y-m-d H:i:s') . " - " . $error . "\n", FILE_APPEND);
}
