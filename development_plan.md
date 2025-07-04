# Cursor History Explorer: Development and Recovery Plan

## 1. Project Goal & Core Mission

The primary goal of this project is to create a standalone desktop utility, the **"Cursor History Explorer,"** that provides a simple and intuitive graphical user interface for exploring, previewing, and recovering files from the Cursor code editor's local history.

This tool will solve the problem of file recovery when traditional methods (like iCloud Restore or filesystem-level recovery tools) fail, by directly accessing the application's own version history.

---

## 2. Core Features

The application will be designed around a simple, three-pane user flow:

*   **Automatic History Scan:** On launch, the app will automatically locate and parse the Cursor history folder (`~/Library/Application Support/Cursor/User/History/`).
*   **Master File List:** It will display a searchable and sortable list of all unique, original file paths found in the history.
*   **Version History View:** Selecting a file from the master list will populate a second view showing all available historical versions of that file, sorted from newest to oldest.
*   **Code Preview Pane:** Selecting a specific version will display its full contents in a read-only code viewer with syntax highlighting.
*   **Recovery Actions:** The user will have two clear actions for any previewed file:
    1.  **Save As...:** Opens a native file dialog to save the recovered file to any location on the disk.
    2.  **Copy to Clipboard:** Copies the entire content of the previewed file to the system clipboard.

---

## 3. Proposed Technology Stack

We will build this as a modern desktop application using web technologies for a fast and straightforward development process.

*   **Framework:** **Electron**.
    *   **Why?** It allows us to build a native desktop application for macOS (and potentially Windows/Linux later) using HTML, CSS, and JavaScript. It provides the necessary bridge to access the local file system with ease.
*   **Backend Logic:** **Node.js**.
    *   **Why?** Electron is built on Node.js, giving us direct access to its powerful core modules, specifically the `fs` (File System) and `path` modules, which are essential for scanning directories and reading files.
*   **Frontend UI:** **HTML, CSS, and vanilla JavaScript**.
    *   **Why?** For a simple utility like this, we don't need a heavy frontend framework. Standard web technologies will be fast, efficient, and easy to implement.
*   **Syntax Highlighting:** A library like **`highlight.js`**.
    *   **Why?** To make the code preview pane useful and readable, we need a simple, lightweight library to apply syntax coloring.

---

## 4. Detailed Development Plan

We will build the application in four distinct phases.

### Phase 1: Project Setup & Initialization

*Objective: Create the basic Electron project structure and get a blank window running.*

1.  **Create Project Directory:** `mkdir cursor-history-explorer`
2.  **Initialize npm:** `cd cursor-history-explorer` and run `npm init -y` to create a `package.json` file.
3.  **Install Electron:** Run `npm install --save-dev electron`.
4.  **Configure `package.json`:**
    *   Set the `main` property to `main.js`.
    *   Add a `start` script: `"start": "electron ."`.
5.  **Create Core Files:**
    *   `main.js`: This will contain the main Electron process logic (creating windows, handling the backend).
    *   `index.html`: The main window's HTML structure.
    *   `renderer.js`: The JavaScript that will run in the `index.html` window (frontend logic).
    *   `style.css`: For basic styling of the UI.

### Phase 2: The "Engine" - File System & History Logic

*Objective: Write the backend code in `main.js` to scan the history and prepare the data for the UI.*

1.  **Locate History:** Define the absolute path to the Cursor history directory.
2.  **Implement `scanHistory()` function:**
    *   This function will recursively read all directories within the history path.
    *   It will identify every `entries.json` file.
3.  **Parse and Structure Data:**
    *   For each `entries.json`, read and parse its content.
    *   Create a clean, structured JavaScript `Map` or `Object` where:
        *   The **key** is the original file path (e.g., `/Users/travis/TitaniumProjects/SmarterCerts 3/resources/app.js`).
        *   The **value** is an `Array` of objects, with each object representing a saved version (containing its cryptic filename, full path, and modification timestamp).
    *   Sort the version arrays for each file by timestamp, newest first.
4.  **Set up IPC (Inter-Process Communication):**
    *   Create an `ipcMain` handler for a `'get-file-list'` event. When the UI requests it, this handler will send back the complete, structured data map.
    *   Create another `ipcMain` handler for `'get-file-content'`. It will receive a path to a specific version file (e.g., `.../History/152f6650/ApES.js`) and will read its contents and send them back to the UI.

### Phase 3: The UI - Building the Frontend

*Objective: Create the three-pane interface and connect it to the backend engine.*

1.  **HTML (`index.html`):**
    *   Structure the three main containers: `#file-list`, `#version-list`, and `#preview-pane`.
    *   Add a `<pre><code id="code-block"></code></pre>` element within the preview pane.
    *   Link the `style.css` and `renderer.js` files.
2.  **Renderer (`renderer.js`):**
    *   On startup, use `ipcRenderer.send('get-file-list')` to request data from `main.js`.
    *   Write a function to dynamically populate the `#file-list` container with the original file paths received from the backend.
    *   Attach click event listeners to the file list items. When an item is clicked:
        *   Clear the `#version-list` and `#preview-pane`.
        *   Populate the `#version-list` with the historical versions for that file, including their timestamps.
    *   Attach click event listeners to the version list items. When a version is clicked:
        *   Use `ipcRenderer.send('get-file-content', versionFilePath)` to request the file's content.
        *   When the content is received, display it in the `#code-block` element.

### Phase 4: Actions, Syntax Highlighting, and Polish

*Objective: Implement the final user-facing features and refine the UI.*

1.  **Implement "Save As...":**
    *   Add a "Save As..." button to the UI.
    *   On click, send the content of the preview pane to `main.js` via an IPC message.
    *   The `main.js` handler will use Electron's `dialog.showSaveDialog()` to open a native save prompt.
    *   If the user selects a location, use `fs.writeFileSync()` to save the file.
2.  **Implement "Copy to Clipboard":**
    *   Add a "Copy" button.
    *   On click, use Electron's `clipboard.writeText()` API to copy the preview pane's content directly.
3.  **Add Syntax Highlighting:**
    *   Integrate `highlight.js` into the project.
    *   After placing text into the `#code-block` element in `renderer.js`, call `hljs.highlightElement()` on it to apply styling.
4.  **Final Polish:**
    *   Implement a simple search bar to filter the master file list.
    *   Add "empty states" and loading messages (e.g., "Scanning history...", "Select a file to begin").
    *   Refine the CSS to ensure the layout is clean and readable. 