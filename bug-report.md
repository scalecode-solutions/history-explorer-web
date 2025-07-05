# Bug Report

## UI/Layout Issues

### BUG-001: Directory Selection Modal Layout
**Status:** Open  
**Severity:** High  
**Description:** The modal that prompts for directory selection disrupts the application layout.  
**Expected Behavior:** Modal should maintain proper layout and not affect the underlying application structure.  
**Actual Behavior:** Modal causes layout disruption.

### BUG-002: Limited History Directory Detection
**Status:** Open  
**Severity:** High  
**Description:** Application only detects VS Code history directories, missing Cursor and Windsurf directories.  
**Expected Behavior:** Application should:
1. Search for history directories from multiple editors:
   - VS Code
   - Cursor
   - Windsurf
2. Present all found locations in a dropdown list
3. Replace the "File History Explorer" header with this dropdown

## Enhancement Suggestions

### ENH-001: Path Selection Dropdown
**Status:** Proposed  
**Description:** Convert the current path display into a dropdown menu that:
1. Shows all detected history directories
2. Replaces the current "File History Explorer" header
3. Allows quick switching between different editor history locations

## Template for New Issues

### BUG-XXX: Title
**Status:** Open/In Progress/Resolved  
**Severity:** Low/Medium/High/Critical  
**Description:** Detailed description of the issue  
**Expected Behavior:** What should happen  
**Actual Behavior:** What actually happens  
**Steps to Reproduce:** If applicable 