Goal: Allow users to edit code in SharedView AND create a PR directly through the GitShare application.

How it works technically:
1. User views code.
2. User makes a change in the UI (needs an editor).
3. User clicks "Submit PR".
4. The backend uses the original REPO OWNER's `accessToken` to:
   - Create a new branch.
   - Commit the changes to that branch.
   - Open a PR from that branch against the main branch.

This solves the private repo issue: The server simply commits on behalf of the owner, but attributes the PR text/title to the contributor, all without needing to add the contributor to GitHub.
