Goal: The user wants the ability to edit multiple files in the SharedView before opening a Pull Request with all of those changes combined into a single PR.

Current logic:
- `editMode` is local to a single file. Clicking "Create PR" sends a single `path` and `content`.
- GitHub PR endpoint takes one file.

Updated Architecture Needed:
1. **Frontend State**: We need a global state `pendingChanges` (a Map or Record of `[filePath]: editedContent`).
2. **Editor**: When saving edits to a file, instead of directly opening a PR, it saves to `pendingChanges` and shows a "Modified" badge.
3. **Global PR Button**: A floating button showing "Create PR (3 changes)" that opens the PR modal.
4. **Backend Endpoint**: Expand `POST /api/shares/:shareId/pr` to accept an array of `{ path, content }`.

Let's modify the frontend and backend to support this.
