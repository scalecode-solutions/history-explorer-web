const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

const app = express();
const port = 3001; // We'll use a port other than React's default 3000

app.use(cors());
app.use(express.json());

// Helper function to get and validate the history path
const getHistoryPath = (userPath) => {
  if (userPath) {
    // Basic security: ensure the path is within the user's home directory
    const home = os.homedir();
    const resolvedPath = path.resolve(userPath);
    if (resolvedPath.startsWith(home)) {
      return resolvedPath;
    }
    return null; // Invalid path
  }
  // Fallback to default for safety, though the frontend should always provide a path
  return path.join(os.homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'History');
};

// New endpoint to find potential history directories
app.get('/api/history/find', (req, res) => {
  const home = os.homedir();
  const potentialPaths = [
    // macOS
    path.join(home, 'Library', 'Application Support', 'Cursor', 'User', 'History'),
    // Windows
    path.join(home, 'AppData', 'Roaming', 'Cursor', 'User', 'History'),
    // Linux
    path.join(home, '.config', 'Cursor', 'User', 'History'),
    // Flatpak
    path.join(home, '.var', 'app', 'com.cursor.Cursor', 'config', 'cursor', 'User', 'History')
  ];

  const foundPaths = potentialPaths.filter(p => fs.existsSync(p));
  res.json(foundPaths);
});

// API endpoint to get the file history
app.get('/api/history', (req, res) => {
  const historyPath = getHistoryPath(req.query.basePath);
  if (!historyPath) {
    return res.status(400).json({ error: 'Invalid history path provided.' });
  }

  let fileHistory = {};

  fs.readdir(historyPath, { withFileTypes: true }, (err, files) => {
    if (err) {
      console.error('Error reading history directory:', err);
      return res.status(500).json({ error: 'Failed to read history directory' });
    }

    files.forEach(file => {
      if (file.isDirectory()) {
        const folderPath = path.join(historyPath, file.name);
        const entryPath = path.join(folderPath, 'entries.json');
        try {
          if (fs.existsSync(entryPath)) {
            const content = fs.readFileSync(entryPath, 'utf8');
            const entry = JSON.parse(content);

            if (entry.resource && entry.entries && entry.entries.length > 0) {
              const originalPath = entry.resource.replace('file://', '');
              if (!fileHistory[originalPath]) {
                fileHistory[originalPath] = [];
              }

              entry.entries.forEach(version => {
                const versionFilePath = path.join(folderPath, version.id);
                let actualSize = 0;
                try {
                  if (fs.existsSync(versionFilePath)) {
                    actualSize = fs.statSync(versionFilePath).size;
                  }
                } catch (statError) {
                  console.error(`Could not get stats for file ${versionFilePath}:`, statError);
                }

                fileHistory[originalPath].push({
                  id: version.id,
                  timestamp: version.timestamp,
                  size: actualSize,
                  source: version.source,
                  // We'll construct a path the client can use to request content
                  contentUrl: `/api/history/content/${file.name}/${version.id}`
                });
              });

              fileHistory[originalPath].sort((a, b) => b.timestamp - a.timestamp);
            }
          }
        } catch (e) {
          console.error(`Error processing entry ${entryPath}:`, e);
        }
      }
    });
    
    res.json(fileHistory);
  });
});

// API endpoint to get the content of a specific version
app.get('/api/history/content/:folder/:fileId', (req, res) => {
  const { folder, fileId } = req.params;
  const historyPath = getHistoryPath(req.query.basePath);
  if (!historyPath) {
    return res.status(400).json({ error: 'Invalid history path provided.' });
  }
  const filePath = path.join(historyPath, folder, fileId);

  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.send(content);
    } else {
      res.status(404).send('File not found.');
    }
  } catch (e) {
    console.error(`Error reading file ${filePath}:`, e);
    res.status(500).send('Failed to read file.');
  }
});

app.get('/', (req, res) => {
  res.send('Hello from the Express server!');
});

app.get('/api/search', async (req, res) => {
  const { q, basePath } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const historyPath = getHistoryPath(basePath);
  if (!historyPath) {
    return res.status(400).json({ error: 'Invalid history path provided.' });
  }
  const matchingFilePaths = new Set();

  try {
    const allFiles = await readdir(historyPath, { withFileTypes: true });
    const directories = allFiles.filter(file => file.isDirectory());

    await Promise.all(directories.map(async (folder) => {
      const folderPath = path.join(historyPath, folder.name);
      const entryFilePath = path.join(folderPath, 'entries.json');
      let originalPath = '';

      try {
        if (fs.existsSync(entryFilePath)) {
          const entryContent = await readFile(entryFilePath, 'utf8');
          originalPath = JSON.parse(entryContent)?.resource?.replace('file://', '');
        }

        // Add filename to search scope
        if (originalPath && originalPath.toLowerCase().includes(q.toLowerCase())) {
          matchingFilePaths.add(originalPath);
        }

        const versionFiles = await readdir(folderPath);
        await Promise.all(versionFiles.map(async (versionFile) => {
          if (versionFile !== 'entries.json' && originalPath) {
            const versionPath = path.join(folderPath, versionFile);
            const content = await readFile(versionPath, 'utf8');
            if (content.toLowerCase().includes(q.toLowerCase())) {
              matchingFilePaths.add(originalPath);
            }
          }
        }));
      } catch (e) {
        console.error(`Error processing folder ${folderPath}:`, e);
      }
    }));

    res.json(Array.from(matchingFilePaths));

  } catch (err) {
    console.error('Error reading history directory:', err);
    return res.status(500).json({ error: 'Failed to read history directory' });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
}); 