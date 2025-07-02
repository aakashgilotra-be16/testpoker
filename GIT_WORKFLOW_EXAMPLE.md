# Git Workflow Example

This document provides practical examples of implementing our Git branching strategy for Planning Poker.

## Feature Development Workflow

### 1. Start a new feature

```bash
# Make sure you're on the develop branch
git checkout develop

# Pull the latest changes
git pull

# Create a new feature branch
git checkout -b feature/US102-new-feature-name
```

### 2. Make changes and commit

```bash
# Make your changes...

# Add files to staging
git add .

# Commit changes with meaningful message including user story number
git commit -m "US102: Descriptive commit message"

# Push to remote repository
git push -u origin feature/US102-new-feature-name
```

### 3. Create a Pull Request to develop

Create a PR on GitHub from `feature/US102-new-feature-name` to `develop`.

### 4. Code Review

The team reviews your code and provides feedback. Make any necessary changes:

```bash
# Make requested changes
git add src/components/VotingSession.tsx
git commit -m "US102: Update component based on code review feedback"
git push
```

### 5. Merge to develop

After code review and approval, merge the PR to the develop branch:

```bash
git checkout develop
git pull
git merge feature/US102-new-feature-name
git push origin develop
```

### 6. Delete feature branch

```bash
git branch -d feature/US102-new-feature-name
git push origin --delete feature/US102-new-feature-name
```

### 7. Promote to QA

```bash
git checkout qa
git pull
git merge develop
git push origin qa

# Deploy to QA environment for testing
```

### 8. Release to production

After QA testing and approval:

```bash
git checkout main
git pull
git merge qa
git push origin main

# Tag the release
git tag -a v1.2.0 -m "Version 1.2.0 - Feature US102"
git push origin v1.2.0

# Deploy to production
```

## Hotfix Workflow

### 1. Create a hotfix branch

```bash
git checkout main
git pull
git checkout -b hotfix/US123-critical-fix
```

### 2. Fix the issue and commit

```bash
# Make your hotfix...

git add .
git commit -m "US123: Fix critical issue with voting session"
git push -u origin hotfix/US123-critical-fix
```

### 3. Create a PR and review

Create a PR on GitHub from `hotfix/US123-critical-fix` to `main`.
Get the PR reviewed and approved.

### 4. Merge to main

```bash
git checkout main
git pull
git merge hotfix/US123-critical-fix
git push origin main

# Tag the hotfix release
git tag -a v1.2.1 -m "Version 1.2.1 - Hotfix US123"
git push origin v1.2.1
```

### 5. Propagate fixes to other branches

```bash
# Merge to qa
git checkout qa
git pull
git merge hotfix/US123-critical-fix
git push origin qa

# Merge to develop
git checkout develop
git pull
git merge hotfix/US123-critical-fix
git push origin develop
```

### 6. Clean up

```bash
git branch -d hotfix/US123-critical-fix
git push origin --delete hotfix/US123-critical-fix
```

## Real Example: Fixing Voting Card Selection

This is a real example of how we fixed the voting card selection issue:

```bash
# Create a feature branch from develop
git checkout develop
git pull
git checkout -b feature/US101-fix-voting-card-selection

# Make changes to the affected files
# Update useSocket.ts to store the actual vote value
# Update VotingSession.tsx to highlight the correct card

# Commit changes
git add src/hooks/useSocket.ts
git commit -m "US101: Fix vote storage to keep actual vote value"

git add src/components/VotingSession.tsx
git commit -m "US101: Update card highlighting logic"

# Push changes
git push -u origin feature/US101-fix-voting-card-selection

# Create PR to develop, get review and approval

# Merge to develop
git checkout develop
git merge feature/US101-fix-voting-card-selection
git push origin develop

# Later, promote to qa for testing
git checkout qa
git pull
git merge develop
git push origin qa

# After QA approval, release to production
git checkout main
git pull
git merge qa
git push origin main
git tag -a v1.1.0 -m "Version 1.1.0 - Fixed voting card selection"
git push origin v1.1.0
```
