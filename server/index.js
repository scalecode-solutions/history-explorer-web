const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const port = 3001; // We'll use a port other than React's default 3000

app.use(cors());
app.use(express.json());

// API endpoint to get the file history
app.get('/api/history', (req, res) => {
  const historyPath = path.join(os.homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'History');
  let fileHistory = {};

  fs.readdir(historyPath, { withFileTypes: true }, (err, files) => {
    if (err) {
      console.error('Error reading history directory:', err);
      return res.status(500).json({ error: 'Failed to read history directory' });
    }

    files.forEach(file => {
      if (file.isDirectory()) {
        const entryPath = path.join(historyPath, file.name, 'entries.json');
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
                fileHistory[originalPath].push({
                  id: version.id,
                  timestamp: version.timestamp,
                  size: version.size,
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
  const historyPath = path.join(os.homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'History');
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

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
}); 