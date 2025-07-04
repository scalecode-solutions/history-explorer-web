# Cursor History Explorer: A Development Diary

This project was born from a crisis and built in a whirlwind of collaborative coding. It's a testament to turning a data-loss disaster into a powerful, bespoke recovery tool. This guide documents its story, architecture, and features.

## The Origin Story

The project began when a critical `resources` folder for a Titanium project was accidentally overwritten by an iCloud sync. Standard recovery methods failed, leaving the files seemingly lost forever.

The breakthrough came from an unconventional idea: searching the local history cache of the Cursor code editor, located at `~/Library/Application Support/Cursor/User/History/`. This directory contained hashed folders, each representing a file, with `entries.json` mapping out its version history.

Our initial recovery was manual, using `grep` and `find` to locate specific files the user remembered. The key discovery was a common line of code (`var theme = require('/helpers/theme');`) that acted as a "fingerprint" to identify all the lost files. While successful, this process was slow and laborious. From this challenge, the idea for the **Cursor History Explorer** was born.

## Tech Stack

-   **Backend:** Node.js with Express.js
-   **Frontend:** React.js (created with Create React App)
-   **File Zipping:** JSZip library on the client-side
-   **Core Modules:** Node.js `fs`, `path`, and `os` for file system interaction.

## Project Architecture

The application uses a simple but effective client-server model.

### Backend (Express Server)

The server (`server/index.js`) is the workhorse responsible for all file system interaction. Its sole purpose is to abstract away the complexities of the Cursor history format and provide clean data to the front end via a REST API.

-   **`/api/history`**:
    -   Scans the `~/Library/Application Support/Cursor/User/History/` directory.
    -   Reads each subdirectory's `entries.json` file.
    -   Parses these files to build a large JSON object where keys are the original file paths and values are arrays of their saved versions (timestamps, IDs, etc.).
    -   Sends this complete history object to the client.

-   **`/api/history/content/:folder/:fileId`**:
    -   Serves the raw text content of a specific file version, identified by its folder hash and file ID.

### Frontend (React App)

The client (`client/src/App.js`) is responsible for all user interaction and presentation. It fetches data from the backend and renders the three-pane interface. All state management, filtering, sorting, and UI logic happens here.

## Running the Project Locally

1.  **Start the Server:**
    Open a terminal, navigate to the project root, and run:
    ```bash
    cd server
    npm install
    node index.js
    ```
    The server will start on `http://localhost:3001`.

2.  **Start the Client:**
    Open a *second* terminal, navigate to the project root, and run:
    ```bash
    cd client
    npm install
    npm start
    ```
    The React development server will start, and the application will open in your browser at `http://localhost:3000`.

## Feature Evolution

The application was built iteratively, with features added in a logical progression:

1.  **Initial Three-Pane Layout:** The core UI, displaying the file list, version list, and content preview.
2.  **Search & Sorting:** A search box to filter files by name and buttons to sort the list alphabetically or by most recent modification.
3.  **Advanced Filtering:** Checkboxes for file extensions and a dropdown for parent directories were added to allow for more granular control over the displayed files.
4.  **Save As... (Single File):** A button in the preview pane to download the content of a single selected file version.
5.  **Bulk Download (.zip):** This was the killer feature.
    -   The `jszip` library was added to the client.
    -   Checkboxes were added to each file in the list.
    -   A "Select All" checkbox was added to easily select all *visible* files.
    -   A "Download Selected as .zip" button was implemented. This function iterates through the selected files, fetches the content of their *most recent version* from the backend, and adds them to a zip archive with their original directory structure intact.
6.  **UI/UX Polish:**
    -   Directory paths with spaces were initially shown with `%20`. We used `decodeURIComponent()` in both the filter dropdown and the zip creation logic to ensure paths were human-readable.
    -   The "Select All" checkbox was repositioned and given a clear label to improve usability.
    -   File counts and other small details were added to make the interface more informative.

## Future Enhancements (V2 Ideas)

-   **Configurable History Path:** Add a settings modal or input field to allow the user to specify a custom path to the history directory, making the tool cross-platform.
-   **Version Diffing:** In the preview pane, add the ability to select two versions of the same file and display a side-by-side "diff" to see what changed.
-   **Bulk Restore:** Add a "Restore All to..." button that would take the generated zip and extract it to a user-selected location, preserving the entire directory structure automatically. 