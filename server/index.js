const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

const app = express();

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/build')));

app.use(cors());
app.use(express.json());

// Helper function to get history path
function getHistoryPath(basePath) {
  if (!basePath) {
    return path.join(os.homedir(), 'Library/Application Support/Code/User/History');
  }
  return basePath;
}

// API Routes
app.get('/api/history/find', async (req, res) => {
  const home = os.homedir();
  const potentialPaths = [
    path.join(home, 'Library/Application Support/Code/User/History'),
    // Add more potential paths here
  ];

  try {
    const foundPaths = await Promise.all(
      potentialPaths.map(async p => {
        try {
          await fs.access(p);
          return p;
        } catch {
          return null;
        }
      })
    );
    res.json(foundPaths.filter(p => p !== null));
  } catch (err) {
    res.status(500).json({ error: 'Failed to check paths' });
  }
});

app.get('/api/history', async (req, res) => {
  const historyPath = getHistoryPath(req.query.basePath);
  if (!historyPath) {
    return res.status(400).json({ error: 'No history path provided' });
  }

  try {
    const fileHistory = {};
    const files = await fs.readdir(historyPath, { withFileTypes: true });
    
    for (const file of files) {
      if (file.isDirectory()) {
        const folderPath = path.join(historyPath, file.name);
        const entryPath = path.join(folderPath, 'entries.json');
        
        try {
          await fs.access(entryPath);
          const content = await fs.readFile(entryPath, 'utf8');
          const entry = JSON.parse(content);

          if (entry.resource && entry.entries && entry.entries.length > 0) {
            const originalPath = entry.resource.replace('file://', '');
            if (!fileHistory[originalPath]) {
              fileHistory[originalPath] = [];
            }

            for (const version of entry.entries) {
              const versionFilePath = path.join(folderPath, version.id);
              let actualSize = 0;
              
              try {
                const stats = await fs.stat(versionFilePath);
                actualSize = stats.size;
              } catch (statError) {
                console.error(`Could not get stats for file ${versionFilePath}:`, statError);
              }

              fileHistory[originalPath].push({
                id: version.id,
                timestamp: version.timestamp,
                size: actualSize,
                source: version.source,
                contentUrl: `/api/content/${file.name}/${version.id}`
              });
            }

            fileHistory[originalPath].sort((a, b) => b.timestamp - a.timestamp);
          }
        } catch (e) {
          console.error(`Error processing entry ${entryPath}:`, e);
        }
      }
    }
    
    res.json(fileHistory);
  } catch (err) {
    console.error('Error reading history directory:', err);
    return res.status(500).json({ error: 'Failed to read history directory' });
  }
});

app.get('/api/content/:folder/:fileId', async (req, res) => {
  const { folder, fileId } = req.params;
  const historyPath = getHistoryPath(req.query.basePath);
  
  if (!historyPath) {
    return res.status(400).json({ error: 'No history path provided' });
  }

  const filePath = path.join(historyPath, folder, fileId);
  
  try {
    await fs.access(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    res.send(content);
  } catch (err) {
    console.error('Error reading file:', {
      error: err.message,
      code: err.code,
      path: filePath,
      historyPath,
      folder,
      fileId
    });
    res.status(404).json({ 
      error: 'File not found',
      details: {
        message: err.message,
        code: err.code,
        path: filePath
      }
    });
  }
});

app.get('/api/search', async (req, res) => {
  const { query, path: searchPath } = req.query;
  const historyPath = getHistoryPath(searchPath);
  
  if (!query || !historyPath) {
    return res.status(400).json({ error: 'Missing query or path' });
  }

  try {
    const results = [];
    const files = await fs.readdir(historyPath, { withFileTypes: true });
    
    for (const file of files) {
      if (file.isDirectory()) {
        const folderPath = path.join(historyPath, file.name);
        const entryPath = path.join(folderPath, 'entries.json');
        
        try {
          await fs.access(entryPath);
          const entryContent = await fs.readFile(entryPath, 'utf8');
          const entry = JSON.parse(entryContent);
          
          if (entry.resource && entry.resource.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              path: entry.resource.replace('file://', ''),
              folder: file.name
            });
          }
        } catch (e) {
          console.error(`Error processing entry ${entryPath}:`, e);
        }
      }
    }
    
    res.json(results);
  } catch (err) {
    console.error('Error searching files:', err);
    res.status(500).json({ error: 'Failed to search files' });
  }
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`History Explorer running at http://localhost:${port}`);
}); 