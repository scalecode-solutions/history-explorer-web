import React, { useState, useEffect, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { diffLines } from 'diff';
import './App.css';

const API_URL = 'http://localhost:3001';

const loadSession = () => {
  try {
    const saved = localStorage.getItem('historyExplorerSession');
    if (saved) {
      const session = JSON.parse(saved);
      // Ensure we convert the array back to a Set
      session.selectedForZip = new Set(session.selectedForZip || []);
      return session;
    }
  } catch (e) {
    console.error("Failed to load session:", e);
    return {};
  }
  return {};
};

function App() {
  const [session] = useState(loadSession());

  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historyPath, setHistoryPath] = useState(localStorage.getItem('historyPath') || '');
  const [setupStep, setSetupStep] = useState(historyPath ? 'done' : 'finding'); // finding, confirming, manual, done
  const [foundPaths, setFoundPaths] = useState([]);
  const [manualPath, setManualPath] = useState('');
  const [isLoadingPath, setIsLoadingPath] = useState(!historyPath);

  const [selectedPath, setSelectedPath] = useState(session.selectedPath || null);
  const [selectedFile, setSelectedFile] = useState(session.selectedFile || null);
  const [fileContent, setFileContent] = useState('');
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState(session.sortOrder || 'name');
  const [activeExtensions, setActiveExtensions] = useState(session.activeExtensions || []);
  const [selectedDirectory, setSelectedDirectory] = useState(session.selectedDirectory || '');
  const [selectedForZip, setSelectedForZip] = useState(session.selectedForZip || new Set());
  const [isZipping, setIsZipping] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [fontSize, setFontSize] = useState(session.fontSize || 'medium');
  const [copyStatus, setCopyStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState(session.searchTerm || '');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [directorySearchTerm, setDirectorySearchTerm] = useState(session.directorySearchTerm || '');
  const [isDirectoryDropdownOpen, setIsDirectoryDropdownOpen] = useState(false);
  const directoryFilterRef = useRef(null);

  const [selectedForDiff, setSelectedForDiff] = useState(session.selectedForDiff || []);
  const [diffResult, setDiffResult] = useState([]);
  const [isDiffMode, setIsDiffMode] = useState(session.isDiffMode || false);
  const [diffError, setDiffError] = useState(null);

  const { directoryCounts, extensionCounts } = useMemo(() => {
    const dirs = {};
    const exts = {};
    if (history) {
      Object.keys(history).forEach(path => {
        const lastSlash = path.lastIndexOf('/');
        const dir = lastSlash > -1 ? path.substring(0, lastSlash) : '(root)';
        
        // Check if this path is in the selected directory or its subdirectories
        const matchesDirectory = !selectedDirectory || 
          dir === selectedDirectory || 
          (selectedDirectory !== '(root)' && dir.startsWith(selectedDirectory + '/'));
        
        if (matchesDirectory) {
          dirs[dir] = (dirs[dir] || 0) + 1;

          const lastDot = path.lastIndexOf('.');
          const ext = lastDot > -1 ? path.substring(lastDot) : '.none';
          exts[ext] = (exts[ext] || 0) + 1;
        }
      });
    }
    return { directoryCounts: dirs, extensionCounts: exts };
  }, [history, selectedDirectory]);

  const FONT_SIZES = {
    small: '12px',
    medium: '14px',
    large: '16px',
  };

  useEffect(() => {
    const newSession = {
      sortOrder,
      activeExtensions,
      selectedDirectory,
      selectedForZip: Array.from(selectedForZip), // Sets must be converted to arrays for JSON
      fontSize,
      searchTerm,
      directorySearchTerm,
      selectedPath,
      selectedFile,
      selectedForDiff,
      isDiffMode,
    };
    localStorage.setItem('historyExplorerSession', JSON.stringify(newSession));
  }, [
    sortOrder,
    activeExtensions,
    selectedDirectory,
    selectedForZip,
    fontSize,
    searchTerm,
    directorySearchTerm,
    selectedPath,
    selectedFile,
    selectedForDiff,
    isDiffMode,
  ]);

  useEffect(() => {
    const findAndSetHistoryPath = async () => {
      if (setupStep === 'finding') {
        setIsLoadingPath(true);
        try {
          const response = await fetch(`${API_URL}/api/history/find`);
          const paths = await response.json();
          if (paths.length > 0) {
            setFoundPaths(paths);
            setSetupStep('confirming');
          } else {
            setSetupStep('manual');
          }
        } catch (e) {
          setError('Could not connect to the server to find the history path.');
          setSetupStep('manual');
        } finally {
          setIsLoadingPath(false);
        }
      }
    };

    findAndSetHistoryPath();
  }, [setupStep]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!historyPath) {
        setLoading(false); // Set loading to false if no path
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/api/history?basePath=${encodeURIComponent(historyPath)}`);
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
  }, [historyPath]);

  const handleFileSelect = (path) => {
    setSelectedPath(path);
    setSelectedFile(null); // Clear previous version selection
    setFileContent('');
    setSelectedForDiff([]); // Reset diff selection when file changes
    setIsDiffMode(false); // Exit diff mode
    setDiffError(null); // Clear any old errors
  };

  const handleVersionClick = async (path, version) => {
    setIsDiffMode(false);
    setSelectedFile({ path, version });
    setIsContentLoading(true);
    setFileContent('');
    try {
      const response = await fetch(`${API_URL}${version.contentUrl}?basePath=${encodeURIComponent(historyPath)}`);
      const content = await response.text();
      setFileContent(content);
    } catch (e) {
      setFileContent('Error loading file content.');
    } finally {
      setIsContentLoading(false);
    }
  };

  const handleDiffSelection = (version) => {
    setSelectedForDiff(prev => {
      const isSelected = prev.some(v => v.timestamp === version.timestamp);
      if (isSelected) {
        return prev.filter(v => v.timestamp !== version.timestamp);
      }
      if (prev.length < 2) {
        return [...prev, version];
      }
      return prev; // Do not add more than 2
    });
  };

  const handleCompare = async () => {
    if (selectedForDiff.length !== 2) return;
    
    // Ensure "old" is always the one with the smaller timestamp
    const [v1, v2] = selectedForDiff.sort((a, b) => a.timestamp - b.timestamp);

    setIsContentLoading(true);
    setIsDiffMode(true);
    setDiffResult([]);
    setDiffError(null);

    try {
      const [res1, res2] = await Promise.all([
        fetch(`${API_URL}${v1.contentUrl}?basePath=${encodeURIComponent(historyPath)}`),
        fetch(`${API_URL}${v2.contentUrl}?basePath=${encodeURIComponent(historyPath)}`),
      ]);
      const oldFileContent = await res1.text();
      const newFileContent = await res2.text();

      const changes = diffLines(oldFileContent, newFileContent);
      setDiffResult(changes);

      if (changes.length === 1 && !changes[0].added && !changes[0].removed) {
        setDiffError('The two selected versions are identical.');
      }
    } catch (e) {
      console.error('Failed to fetch files for diffing', e);
      setDiffError(e.message);
      setDiffResult([]);
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

  useEffect(() => {
    // Function to close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (directoryFilterRef.current && !directoryFilterRef.current.contains(event.target)) {
        setIsDirectoryDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDirectorySelect = (dir) => {
    setSelectedDirectory(dir);
    setIsDirectoryDropdownOpen(false);
    
    // Clear any extension filters that don't exist in the new directory or its subdirectories
    if (activeExtensions.length > 0) {
      const validExtensions = activeExtensions.filter(ext => {
        // If no directory selected, all extensions are valid
        if (!dir) return true;
        
        // Check if this extension exists in the selected directory or its subdirectories
        return Object.keys(history).some(path => {
          const pathDir = path.lastIndexOf('/') > -1 ? path.substring(0, path.lastIndexOf('/')) : '(root)';
          const pathExt = path.lastIndexOf('.') > -1 ? path.substring(path.lastIndexOf('.')) : '.none';
          
          return (pathDir === dir || 
                 (dir !== '(root)' && pathDir.startsWith(dir + '/'))) && 
                 pathExt === ext;
        });
      });
      
      setActiveExtensions(validExtensions);
    }
  };

  const clearDirectoryFilter = () => {
    setSelectedDirectory('');
    setDirectorySearchTerm('');
    setIsDirectoryDropdownOpen(false);
  };

  const filteredDirectories = Object.keys(directoryCounts)
    .filter(dir => decodeURIComponent(dir).toLowerCase().includes(directorySearchTerm.toLowerCase()))
    .sort();

  const handleExtensionToggle = (extToToggle) => {
    setActiveExtensions(prev =>
      prev.includes(extToToggle)
        ? prev.filter(ext => ext !== extToToggle)
        : [...prev, extToToggle]
    );
  };

  const filteredAndSortedPaths = Object.keys(history || {})
    .filter(path => {
      if (searchResults && !searchResults.includes(path)) return false;
      if (selectedDirectory && !path.startsWith(selectedDirectory)) return false;
      if (activeExtensions.length > 0 && !activeExtensions.some(ext => path.endsWith(ext))) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'date') {
        const dateA = new Date(history[a][0].timestamp);
        const dateB = new Date(history[b][0].timestamp);
        return dateB - dateA;
      }
      if (sortOrder === 'size') {
        const sizeA = history[a][0].size;
        const sizeB = history[b][0].size;
        return sizeB - sizeA;
      }
      if (sortOrder === 'extension') {
        const extA = a.split('.').pop();
        const extB = b.split('.').pop();
        return extA.localeCompare(extB);
      }
      // Default to sorting by name
      return a.localeCompare(b);
    });

  const handleSaveAs = () => {
    if (!fileContent || !selectedFile) return;
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedFile.path.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyContent = () => {
    if (!fileContent) return;
    navigator.clipboard.writeText(fileContent).then(() => {
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(''), 2000);
    }, () => {
      setCopyStatus('Failed!');
      setTimeout(() => setCopyStatus(''), 2000);
    });
  };

  const handleSearch = async () => {
    if (!searchTerm) return;
    setIsSearching(true);
    setSearchResults(null);
    try {
      const response = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(searchTerm)}&basePath=${encodeURIComponent(historyPath)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (e) {
      console.error("Super search failed", e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults(null);
  };

  const handleZipSelection = (path, isSelected) => {
    setSelectedForZip(prev => {
      const newSelection = new Set(prev);
      if (isSelected) newSelection.add(path);
      else newSelection.delete(path);
      return newSelection;
    });
  };

  const handleSelectAll = (isChecked) => {
    if (isChecked) setSelectedForZip(new Set(filteredAndSortedPaths));
    else setSelectedForZip(new Set());
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
            const decodedPath = decodeURIComponent(path);
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
    } finally {
      setIsZipping(false);
    }
  };

  const handleDirectRestore = async () => {
    if (!window.showDirectoryPicker) {
      alert('Your browser does not support the File System Access API. Please use a modern Chromium-based browser like Chrome or Edge.');
      return;
    }
    if (selectedForZip.size === 0) return;

    setIsRestoring(true);
    try {
      const dirHandle = await window.showDirectoryPicker();
      
      for (const path of selectedForZip) {
        const latestVersion = history[path]?.[0];
        if (latestVersion) {
          const response = await fetch(`${API_URL}${latestVersion.contentUrl}?basePath=${encodeURIComponent(historyPath)}`);
          if (response.ok) {
            const content = await response.text();
            const decodedPath = decodeURIComponent(path);
            const relativePath = decodedPath.replace(/^(?:C:\\Users\\[^\\]+|Users\/[^/]+)/, '');
            const pathParts = relativePath.split(/[\\/]/).filter(p => p);
            
            let currentHandle = dirHandle;
            for (let i = 0; i < pathParts.length - 1; i++) {
              currentHandle = await currentHandle.getDirectoryHandle(pathParts[i], { create: true });
            }

            const fileHandle = await currentHandle.getFileHandle(pathParts[pathParts.length - 1], { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
          }
        }
      }
      alert(`Successfully restored ${selectedForZip.size} files!`);
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error("Error during direct restore:", e);
        alert(`An error occurred during restore: ${e.message}`);
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePathConfirmed = (path) => {
    localStorage.setItem('historyPath', path);
    setHistoryPath(path);
    setSetupStep('done');
  };

  const handleManualPathSubmit = () => {
    if (manualPath) {
      handlePathConfirmed(manualPath);
    }
  };

  const handleCloseSetup = () => {
    if (historyPath) {
      setSetupStep('done');
    } else {
      setSetupStep('closed');
    }
  }

  const handleResetPath = () => {
    localStorage.removeItem('historyPath');
    setHistoryPath('');
    setHistory(null);
    setSetupStep('finding');
    setIsLoadingPath(true);
  };

  const allVisibleSelected = filteredAndSortedPaths.length > 0 && filteredAndSortedPaths.every(path => selectedForZip.has(path));

  const handleResetSession = () => {
    localStorage.removeItem('historyExplorerSession');
    window.location.reload();
  };

  const renderSetupModal = () => {
    if (setupStep !== 'done') {
      return (
        <div className="modal-overlay">
          <div className="setup-container">
            {isLoadingPath ? (
              <div className="setup-card"><h2>Finding Cursor history...</h2></div>
            ) : (
              <div className="setup-card">
                <button onClick={handleCloseSetup} className="close-button">&times;</button>
                <h2>History Explorer Setup</h2>
                {setupStep === 'confirming' && (
                  <>
                    <h3>We found the following history folder:</h3>
                    {foundPaths.map(p => (
                      <div key={p}>
                        <p className="path-display">{p}</p>
                        <button onClick={() => handlePathConfirmed(p)}>Use this path</button>
                      </div>
                    ))}
                    <hr />
                    <button className="secondary-action" onClick={() => setSetupStep('manual')}>Enter path manually</button>
                  </>
                )}
                {setupStep === 'manual' && (
                  <>
                    <h3>Please enter the full path to your Cursor history folder.</h3>
                    <p>This is usually `~/.config/Cursor/User/History` on Linux or `%APPDATA%\\Cursor\\User\\History` on Windows.</p>
                    <input
                      type="text"
                      value={manualPath}
                      onChange={(e) => setManualPath(e.target.value)}
                      placeholder="/path/to/your/Cursor/User/History"
                    />
                    <button onClick={handleManualPathSubmit} disabled={!manualPath}>Save and Continue</button>
                  </>
                )}
                {setupStep === 'closed' && (
                    <div className="setup-required">
                      <h3>Setup Required</h3>
                      <p>Please configure your history path to begin.</p>
                      <button onClick={handleResetPath}>Start Setup</button>
                    </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderHelpModal = () => {
    if (!isHelpModalOpen) return null;

    return (
      <div className="modal-overlay" onClick={() => setIsHelpModalOpen(false)}>
        <div className="setup-card help-modal" onClick={e => e.stopPropagation()}>
          <button onClick={() => setIsHelpModalOpen(false)} className="close-button">&times;</button>
          <h2>How to Use History Explorer</h2>
          <div className="help-content">
            <p><strong>1. Select Your History Folder:</strong> The app will try to find your Cursor history folder automatically. If it can't, you'll be prompted to enter the path manually.</p>
            <p><strong>2. Browse Files:</strong> Use the left-most panel to browse and select files. You can filter the list by directory or file extension, and sort by name, date, size, or extension.</p>
            <p><strong>3. View Versions:</strong> Once you select a file, its available history versions will appear in the "Versions" panel. Click any version to view its content in the main preview pane.</p>
            <p><strong>4. Compare Versions (Diff):</strong> To see what changed between two versions, check the box next to two different versions and click the "Compare Selected" button that appears.</p>
            <p><strong>5. Restore Files:</strong> Select one or more files using the checkboxes in the main file list. Then, use the buttons in the footer to either "Download .zip" or, in compatible browsers, "Restore Files..." directly to a folder on your machine.</p>
            <p><strong>6. Super Search:</strong> Use the search bar at the top to search for text inside the content of all file versions, not just the filenames.</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div>Loading history...</div>;
  if (error) return (
    <div className="setup-container">
      <h2>Error Loading History</h2>
      <div className="setup-card">
        <p>Could not load data from the specified path:</p>
        <p className="path-display">{historyPath}</p>
        <p><strong>Error:</strong> {error}</p>
        <hr/>
        <button onClick={handleResetPath}>Choose a different path</button>
      </div>
    </div>
  );

  return (
    <div className="App">
      {renderSetupModal()}
      {renderHelpModal()}
      <div className="container">
        <div className="left-column">
          <div className="files-pane">
            <div className="pane-header">
              <div className="title-container">
                <h2>File History Explorer</h2>
                <button onClick={() => setIsHelpModalOpen(true)} className="help-button" title="How to use this app">
                  ℹ️
                </button>
              </div>
              <div className="path-display-container">
                <span className="current-path-label">PATH:</span>
                <span className="current-path-text">{historyPath}</span>
                <button onClick={() => setSetupStep('finding')} className="change-path-button" title="Change History Path">Change</button>
              </div>
            </div>
            <div className="controls-container">
              <div className="controls-row">
                <div className="filter-container" ref={directoryFilterRef}>
                  <div className="searchable-dropdown">
                    <input
                      type="text"
                      placeholder="Filter by directory..."
                      value={directorySearchTerm}
                      onChange={(e) => {
                        setDirectorySearchTerm(e.target.value);
                        setIsDirectoryDropdownOpen(true);
                      }}
                      onFocus={() => setIsDirectoryDropdownOpen(true)}
                    />
                    {isDirectoryDropdownOpen && (
                      <div className="dropdown-content">
                        <div onClick={clearDirectoryFilter} className="dropdown-item">
                          <em>Show All Directories</em>
                        </div>
                        {filteredDirectories.map(dir => (
                          <div key={dir} onClick={() => handleDirectorySelect(dir)} className="dropdown-item">
                            {decodeURIComponent(dir)} ({directoryCounts[dir]})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="super-search-container">
                  <input
                    type="text"
                    placeholder="Search filenames and content..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  {searchResults ? (
                    <button onClick={clearSearch}>Clear</button>
                  ) : (
                    <button onClick={handleSearch} disabled={isSearching || !searchTerm}>
                      {isSearching ? '...' : 'Search'}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="files-list">
              <div className="files-list-header">
                <div className="selection-controls">
                  <input
                    type="checkbox"
                    id="select-all"
                    title="Select all visible files"
                    checked={allVisibleSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                  <label htmlFor="select-all">Select all ({selectedForZip.size})</label>
                  <button onClick={handleResetSession} className="secondary-action">
                    Reset View
                  </button>
                </div>
                <div className="extension-dropdown-container">
                  <select 
                    value={activeExtensions.length === 1 ? activeExtensions[0] : ''} 
                    onChange={(e) => {
                      const ext = e.target.value;
                      setActiveExtensions(ext ? [ext] : []);
                    }}
                  >
                    <option value="">All Extensions</option>
                    {Object.entries(extensionCounts).map(([ext, count]) => (
                      <option key={ext} value={ext}>
                        {ext} ({count})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sort-dropdown-container">
                  <label htmlFor="sort-order">Sort by:</label>
                  <select id="sort-order" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                    <option value="name">Name</option>
                    <option value="date">Date</option>
                    <option value="size">Size</option>
                    <option value="extension">Extension</option>
                  </select>
                </div>
              </div>
              <div className="list-box">
                {filteredAndSortedPaths.map(path => {
                  const fileName = path.split('/').pop();
                  const dirPath = path.substring(0, path.lastIndexOf('/'));
                  const isSelectedForZip = selectedForZip.has(path);

                  return (
                    <div
                      key={path}
                      className={`list-item ${selectedPath === path ? 'selected' : ''}`}
                      onClick={() => handleFileSelect(path)}
                      title={path}
                    >
                      <input
                        type="checkbox"
                        className="file-checkbox"
                        checked={isSelectedForZip}
                        onChange={(e) => handleZipSelection(path, e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="file-info">
                        <div className="file-name">{fileName}</div>
                        <div className="dir-path">{decodeURIComponent(dirPath)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="files-list-footer">
                <div className="footer-actions">
                  <span className="selected-count-label">{selectedForZip.size} files selected</span>
                  <button
                    onClick={handleDownloadZip}
                    disabled={isZipping || selectedForZip.size === 0}
                  >
                    {isZipping ? 'Zipping...' : 'Download .zip'}
                  </button>
                   <button
                    onClick={handleDirectRestore}
                    disabled={isRestoring || selectedForZip.size === 0}
                  >
                    {isRestoring ? 'Restoring...' : 'Restore Files...'}
                  </button>
                </div>
                <div className="footer-info">
                  <span>{filteredAndSortedPaths.length} files shown</span>
                </div>
              </div>
            </div>
          </div>
          <div className="versions-pane">
            <h3>Versions</h3>
            {selectedPath && (
              <div className="version-controls">
                <button onClick={handleCompare} disabled={selectedForDiff.length !== 2}>
                  Compare Selected ({selectedForDiff.length}/2)
                </button>
              </div>
            )}
            {selectedPath && history[selectedPath] ? (
              <ul>
                {history[selectedPath].map((version, index) => {
                  const isSelectedForDiff = selectedForDiff.some(v => v.timestamp === version.timestamp);
                  return (
                    <li
                      key={index}
                      className={`${(selectedFile && !isDiffMode && selectedFile.version.timestamp === version.timestamp) ? 'selected' : ''} ${isSelectedForDiff ? 'selected-for-diff' : ''}`}
                      onClick={() => handleVersionClick(selectedPath, version)}
                    >
                      <input
                        type="checkbox"
                        className="diff-checkbox"
                        checked={isSelectedForDiff}
                        onChange={() => handleDiffSelection(version)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {selectedPath.split('/').pop()} - {new Date(version.timestamp).toLocaleString()} ({(version.size || 0).toLocaleString()} bytes)
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="placeholder-text">Select a file to see its versions.</div>
            )}
          </div>
        </div>
        <div className="resizer"></div>
        <div className="main-content">
          {history ? (
            <>
              <div className="content-header">
                <div className="font-size-selector">
                  <button onClick={() => setFontSize('small')} className={fontSize === 'small' ? 'active' : ''}>Small</button>
                  <button onClick={() => setFontSize('medium')} className={fontSize === 'medium' ? 'active' : ''}>Medium</button>
                  <button onClick={() => setFontSize('large')} className={fontSize === 'large' ? 'active' : ''}>Large</button>
                </div>
                <div className="content-actions">
                  <button onClick={handleCopyContent} disabled={!fileContent}>
                    {copyStatus || 'Copy Content'}
                  </button>
                  <button onClick={handleSaveAs} disabled={!selectedFile || isDiffMode} className="save-as-button">Save As...</button>
                </div>
              </div>
              <div className="content-box">
                {isContentLoading ? (
                  <div className="placeholder-text">Loading content...</div>
                ) : isDiffMode ? (
                  diffError ? (
                    <div className="diff-error">
                      <h3>Comparison Result</h3>
                      <p>{diffError}</p>
                    </div>
                  ) : (
                    <div className="diff-view">
                      {diffResult.map((part, index) => {
                        const partClass = part.added
                          ? 'added'
                          : part.removed
                          ? 'removed'
                          : 'normal';
                        return (
                          <div key={index} className={`diff-line ${partClass}`}>
                            <pre>{part.value}</pre>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : fileContent ? (
                  <SyntaxHighlighter
                    language={getFileLanguage(selectedPath)}
                    style={oneDark}
                    showLineNumbers
                    customStyle={{ height: '100%', margin: 0, boxSizing: 'border-box' }}
                    codeTagProps={{ style: { fontSize: FONT_SIZES[fontSize] } }}
                  >
                    {fileContent}
                  </SyntaxHighlighter>
                ) : (
                  <div className="placeholder-text">Select a file version to view its content.</div>
                )}
              </div>
            </>
          ) : (
            <div className="placeholder-text setup-required">
              <h3>Setup Required</h3>
              <p>Please configure your history path to begin.</p>
              <button onClick={handleResetPath}>Start Setup</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
