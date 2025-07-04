import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
  const [selectedForZip, setSelectedForZip] = useState(new Set());
  const [isZipping, setIsZipping] = useState(false);
  const [fontSize, setFontSize] = useState('medium'); // 'small', 'medium', 'large'
  const [copyStatus, setCopyStatus] = useState(''); // To show 'Copied!' message

  const FONT_SIZES = {
    small: '12px',
    medium: '14px',
    large: '16px',
  };

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

  const getFileLanguage = (filePath) => {
    if (!filePath) return 'plaintext';
    const extension = filePath.split('.').pop().toLowerCase();
    switch (extension) {
      case 'js': return 'javascript';
      case 'ts': return 'typescript';
      case 'css': return 'css';
      case 'html': return 'html';
      case 'json': return 'json';
      case 'md': return 'markdown';
      default: return 'plaintext';
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

  const handleCopyContent = () => {
    if (!fileContent) return;
    navigator.clipboard.writeText(fileContent).then(() => {
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(''), 2000); // Reset after 2 seconds
    }, (err) => {
      setCopyStatus('Failed!');
      console.error('Failed to copy content: ', err);
      setTimeout(() => setCopyStatus(''), 2000);
    });
  };

  const handleZipSelection = (path, isSelected) => {
    setSelectedForZip(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(path);
      } else {
        newSet.delete(path);
      }
      return newSet;
    });
  };

  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      setSelectedForZip(new Set(filteredAndSortedPaths));
    } else {
      setSelectedForZip(new Set());
    }
  };

  const handleDownloadZip = async () => {
    if (selectedForZip.size === 0) return;

    setIsZipping(true);
    const zip = new JSZip();

    try {
      const fetchPromises = Array.from(selectedForZip).map(async (path) => {
        const latestVersion = history[path]?.[0];
        if (latestVersion) {
          const response = await fetch(`${API_URL}${latestVersion.contentUrl}`);
          if (response.ok) {
            const content = await response.text();
            // Decode the path here to fix folder names in the zip file
            const decodedPath = decodeURIComponent(path);
            // Use the full path but remove the user's home directory prefix for a cleaner structure
            const relativePath = decodedPath.replace(/^(?:C:\\Users\\[^\\]+|Users\/[^/]+)/, '');
            zip.file(relativePath, content);
          }
        }
      });

      await Promise.all(fetchPromises);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `cursor_history_export_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

    } catch (e) {
      console.error("Error creating zip file", e);
      // You might want to show an error to the user here
    } finally {
      setIsZipping(false);
    }
  };

  const allVisibleSelected = filteredAndSortedPaths.length > 0 && filteredAndSortedPaths.every(path => selectedForZip.has(path));

  return (
    <div className="App">
      <div className="container">
        <div className="left-column">
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
                    <option key={dir} value={dir}>{decodeURIComponent(dir)}</option>
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
            <div className="select-all-container">
              <input
                type="checkbox"
                id="select-all"
                title="Select all visible files"
                checked={allVisibleSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              <label htmlFor="select-all">Select all visible files</label>
            </div>
            <div className="list-box">
              {filteredAndSortedPaths.map(path => {
                const fileName = path.split('/').pop();
                const dirPath = path.substring(0, path.lastIndexOf('/'));
                const isSelected = selectedForZip.has(path);

                return (
                  <div
                    key={path}
                    className={`list-item ${selectedFile === path ? 'selected' : ''}`}
                    title={path}
                  >
                    <input 
                      type="checkbox" 
                      className="file-checkbox"
                      checked={isSelected}
                      onChange={(e) => handleZipSelection(path, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="file-info" onClick={() => handleFileSelect(path)}>
                      <div className="file-name">{fileName}</div>
                      <div className="dir-path">{decodeURIComponent(dirPath)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pane-footer">
              <span>{filteredAndSortedPaths.length} files shown</span>
              <button 
                onClick={handleDownloadZip} 
                disabled={isZipping || selectedForZip.size === 0}
              >
                {isZipping ? 'Zipping...' : `Download ${selectedForZip.size} Selected as .zip`}
              </button>
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
        </div>

        <div className="pane content-pane">
          <div className="content-header">
            <h2>Content Preview</h2>
            <div className="font-size-selector">
              <button onClick={() => setFontSize('small')} className={fontSize === 'small' ? 'active' : ''}>Small</button>
              <button onClick={() => setFontSize('medium')} className={fontSize === 'medium' ? 'active' : ''}>Medium</button>
              <button onClick={() => setFontSize('large')} className={fontSize === 'large' ? 'active' : ''}>Large</button>
            </div>
            <div className="content-actions">
              <button onClick={handleCopyContent} disabled={!fileContent}>
                {copyStatus || 'Copy Content'}
              </button>
              {selectedVersion && <button onClick={handleSaveAs} className="save-as-button">Save As...</button>}
            </div>
          </div>
          <div className="content-box">
            {isContentLoading ? (
              <div>Loading content...</div>
            ) : (
              <SyntaxHighlighter
                language={getFileLanguage(selectedFile)}
                style={oneDark}
                showLineNumbers
                wrapLines={true}
                customStyle={{ margin: 0, height: '100%', width: '100%', fontSize: FONT_SIZES[fontSize] }}
              >
                {fileContent}
              </SyntaxHighlighter>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
