# History Explorer

A powerful web application for exploring and managing file history across multiple code editors. Built by Scalecode Solutions.

## 📖 The Origin Story

This project was born from a crisis and built in a whirlwind of collaborative coding. It's a testament to turning a data-loss disaster into a powerful, bespoke recovery tool.

The project began when a critical `resources` folder for a Titanium project was accidentally overwritten by an iCloud sync. Standard recovery methods failed, leaving the files seemingly lost forever.

The breakthrough came from an unconventional idea: searching the local history cache of the Cursor code editor, located at `~/Library/Application Support/Cursor/User/History/`. This directory contained hashed folders, each representing a file, with `entries.json` mapping out its version history.

Our initial recovery was manual, using `grep` and `find` to locate specific files the user remembered. The key discovery was a common line of code (`var theme = require('/helpers/theme');`) that acted as a "fingerprint" to identify all the lost files. While successful, this process was slow and laborious. From this challenge, the History Explorer was born.

## 🌟 Features

- 🔍 Search through your file history across multiple editors
- 📂 Filter by directory and file extension
- 📊 View file versions and changes over time
- 💻 Syntax-highlighted code viewing
- ↕️ Side-by-side diff comparison
- 📦 Bulk export of historical files
- ⌨️ Keyboard shortcuts for power users
- 🎨 Customizable font sizes and UI preferences

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/history-explorer-web.git
   cd history-explorer-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm run serve
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3001
   ```

## 🛠️ Tech Stack

- **Backend:** Node.js with Express.js
- **Frontend:** React.js (created with Create React App)
- **File Zipping:** JSZip library on the client-side
- **Core Modules:** Node.js `fs`, `path`, and `os` for file system interaction

## 📖 Usage Guide

1. **Initial Setup**
   - On first launch, the app will automatically search for editor history directories
   - You can also manually specify a history directory path
   > ⚠️ Note: The initial directory selection modal has some known layout issues that will be addressed in future releases.

2. **Navigation**
   - Use the directory tree to browse files
   - Filter files by extension using the dropdown
   - Search across all files using the search box
   - Use keyboard shortcuts for quick navigation

3. **Keyboard Shortcuts**
   - `Ctrl/Cmd + F`: Focus search
   - `Ctrl/Cmd + /`: Focus directory filter
   - `Ctrl/Cmd + .`: Focus extension filter
   - Arrow keys: Navigate file list
   - Shift + Arrow keys: Multi-select files
   - Space: Toggle file selection
   - Escape: Clear selection

4. **File Operations**
   - View file versions and their timestamps
   - Compare different versions using the diff viewer
   - Export selected files as a ZIP archive
   - Restore files to their original locations

## 🔄 Supported Editors

- Visual Studio Code
- Cursor
- Windsurf
- More coming soon!

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## 📄 License

Copyright © 2024 Scalecode Solutions

This software is licensed under the Elastic License 2.0 (ELv2). This means:

1. **Free Usage**: You can freely use, modify, and distribute this software.
2. **Source Availability**: The source code is available and can be modified.
3. **Commercial Use**: You can use this software in commercial products.
4. **Restrictions**: You cannot:
   - Provide the software as a managed service
   - Circumvent license key functionality or remove/obscure features protected by license keys
   - Remove or obscure any licensing, copyright, or other notices

For the complete license terms, see [LICENSE](LICENSE)

## 🔗 Links

- [Report a Bug](bug-report.md)
- [Future Features](FUTURE_FEATURES.md)
- [Development Plan](development_plan.md)

---

Made with ❤️ by Scalecode Solutions 