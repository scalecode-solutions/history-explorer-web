import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:3001';
const FILTERABLE_EXTENSIONS = ['js', 'json', 'md', 'tsx', 'css', 'html', 'ts'];

function App() {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('name'); // 'name' or 'date'
  const [selectedExtensions, setSelectedExtensions] = useState({});
  const [selectedDirectory, setSelectedDirectory] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_URL}/api/history`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setHistory(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);
  
  const handleFileSelect = (filePath) => {
    setSelectedFile(filePath);
    setSelectedVersion(null);
    setFileContent('');
  };

  const handleVersionSelect = async (version) => {
    setSelectedVersion(version.id);
    setIsContentLoading(true);
    setFileContent('');
    try {
      const response = await fetch(`${API_URL}${version.contentUrl}`);
      const content = await response.text();
      setFileContent(content);
    } catch (e) {
      setFileContent('Error loading file content.');
    } finally {
      setIsContentLoading(false);
    }
  };

  const handleExtensionToggle = (ext) => {
    setSelectedExtensions(prev => ({
      ...prev,
      [ext]: !prev[ext]
    }));
  };

  if (loading) return <div>Loading history...</div>;
  if (error) return <div>Error fetching history: {error}</div>;

  const activeExtensions = Object.entries(selectedExtensions)
    .filter(([, isActive]) => isActive)
    .map(([ext]) => `.${ext}`);

  const filteredAndSortedPaths = Object.keys(history)
    .filter(path => {
      const searchMatch = path.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;

      if (selectedDirectory && !path.startsWith(selectedDirectory)) {
        return false;
      }

      if (activeExtensions.length > 0) {
        return activeExtensions.some(ext => path.endsWith(ext));
      }
      
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'date') {
        const lastModifiedA = history[a][0]?.timestamp || 0;
        const lastModifiedB = history[b][0]?.timestamp || 0;
        return lastModifiedB - lastModifiedA;
      }
      return a.localeCompare(b); // Default sort by name
    });

  const uniqueDirectories = [...new Set(Object.keys(history).map(path => path.substring(0, path.lastIndexOf('/'))))].sort();

  const handleSaveAs = () => {
    if (!fileContent || !selectedFile) return;

    // Create a blob from the file content
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    
    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor tag to trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedFile.split('/').pop(); // Suggest original filename
    
    // Append to the document, click, and then remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
  };

  return (
    <div className="App">
      <h1>Cursor History Explorer (React Edition)</h1>
      <div className="container">
        <div className="pane file-list-container">
          <div className="header-bar">
            <h2>Files</h2>
            <div className="sort-options">
              <button onClick={() => setSortOrder('name')} className={sortOrder === 'name' ? 'active' : ''}>By Name</button>
              <button onClick={() => setSortOrder('date')} className={sortOrder === 'date' ? 'active' : ''}>By Date</button>
            </div>
          </div>
          <div className="filter-box">
            <div className="directory-filter">
              <select value={selectedDirectory} onChange={(e) => setSelectedDirectory(e.target.value)}>
                <option value="">All Directories</option>
                {uniqueDirectories.map(dir => (
                  <option key={dir} value={dir}>{dir}</option>
                ))}
              </select>
            </div>
            {FILTERABLE_EXTENSIONS.map(ext => (
              <div key={ext} className="filter-item">
                <input
                  type="checkbox"
                  id={`ext-${ext}`}
                  checked={!!selectedExtensions[ext]}
                  onChange={() => handleExtensionToggle(ext)}
                />
                <label htmlFor={`ext-${ext}`}>{ext.toUpperCase()}</label>
              </div>
            ))}
          </div>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="list-box">
            {filteredAndSortedPaths.map(path => {
              const fileName = path.split('/').pop();
              const dirPath = path.substring(0, path.lastIndexOf('/'));

              return (
                <div
                  key={path}
                  className={`list-item ${selectedFile === path ? 'selected' : ''}`}
                  onClick={() => handleFileSelect(path)}
                  title={path}
                >
                  <div className="file-name">{fileName}</div>
                  <div className="dir-path">{dirPath}</div>
                </div>
              );
            })}
          </div>
          <div className="pane-footer">
            {filteredAndSortedPaths.length} files shown
          </div>
        </div>

        <div className="pane version-list-container">
          <h2>Versions</h2>
          <div className="list-box">
            {selectedFile ? (
              history[selectedFile].map(version => (
                <div
                  key={version.id}
                  className={`list-item ${selectedVersion === version.id ? 'selected' : ''}`}
                  onClick={() => handleVersionSelect(version)}
                >
                  {new Date(version.timestamp).toLocaleString()}
                </div>
              ))
            ) : (
              <p>Select a file</p>
            )}
          </div>
        </div>

        <div className="pane preview-pane-container">
          <div className="header-bar">
            <h2>Preview</h2>
            <button onClick={handleSaveAs} disabled={!fileContent}>
              Save As...
            </button>
          </div>
          <pre className="preview-pane">
            <code>
              {isContentLoading ? 'Loading...' : fileContent}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}

export default App;
