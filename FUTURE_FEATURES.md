# Cursor History Explorer V2 - Feature Roadmap

This document outlines potential features and enhancements for the next version of the Cursor History Explorer. The features are grouped into tiers based on complexity and impact.

---

### Tier 1: Core Usability Improvements

These features focus on making the existing tool more accessible, user-friendly, and polished.

*   **1. Cross-Platform Support (The "Make it for Everyone" feature):**
    *   **What:** Add a settings option or input field to let users manually select their Cursor history folder.
    *   **Why:** This is the single most important feature to make the tool useful for developers on Windows or Linux, who have their history stored in a different place (e.g., `%APPDATA%`).

*   **2. Syntax Highlighting (The "Make it Pretty" feature):**
    *   **What:** In the content preview pane, automatically detect the language of the file (`.js`, `.css`, `.py`, etc.) and apply code highlighting.
    *   **Why:** It would make reviewing code files infinitely easier and more pleasant on the eyes. This would likely involve adding a library like `react-syntax-highlighter`.

*   **3. Copy to Clipboard (The "Simple & Sweet" feature):**
    *   **What:** Add a "Copy Content" button to the content preview pane.
    *   **Why:** A small but hugely convenient quality-of-life improvement for quickly grabbing code snippets without manual selection.

---

### Tier 2: Powerful New Capabilities

These features would significantly expand the core functionality of the application, turning it into a more powerful analysis tool.

*   **4. Version Diffing (The "Time Machine" feature):**
    *   **What:** Allow a user to select *two* versions of the same file. The content pane would then show a side-by-side or inline "diff," highlighting exactly what lines were added, changed, or removed.
    *   **Why:** This would elevate the application from just a recovery tool to a powerful code archaeology tool, letting you trace the evolution of a file.

*   **5. Content Search (The "Super Search" feature):**
    *   **What:** Add a new search mode or an advanced search panel to search *inside* the content of all the file versions, not just the filenames.
    *   **Why:** Incredibly useful if you remember a specific variable name, function, or line of code but can't remember which file it was in.

---

### Tier 3: Advanced "Pro" Features

These are more complex features that would provide a seamless, professional-grade experience.

*   **6. Direct Restore (The "One-Click Restore" feature):**
    *   **What:** Instead of just downloading a zip, add a "Restore to..." button. This would open a native folder picker and then automatically extract the selected files into that location, recreating the directory structure on the user's machine.
    *   **Why:** This would make the final step of the recovery process completely seamless. This is significantly more complex as it requires deeper interaction with the local file system, potentially via a backend agent or different browser APIs.

*   **7. Session Saving (The "Save my Spot" feature):**
    *   **What:** The ability to save your current view—including all your filter settings and your list of selected files—and load it again later. The session could be saved to local storage in the browser.
    *   **Why:** Perfect for large recovery projects where you might need to stop and start multiple times without losing your place.
