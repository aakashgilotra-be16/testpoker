# Git Branching Strategy

This document outlines our Git branching strategy for the Planning Poker application.

## Branch Structure

```
main (production)
  ↑
 qa (pre-production testing)
  ↑
develop (integration branch)
  ↑
feature branches (individual features)
```

## Branches

### Main Branch
- Represents the production-ready code
- Always stable and deployable
- Protected: requires approved pull requests from QA branch

### QA Branch
- Pre-production testing environment
- Features are tested here before being merged to main
- Protected: requires approved pull requests from develop branch
- Periodic releases to main when features pass QA

### Develop Branch
- Integration branch where feature branches are merged
- May contain features that are complete but not yet tested
- CI runs automated tests on this branch
- Features are merged here first, then promoted to QA

### Feature Branches
- Created from develop branch
- Used for developing new features or fixing bugs
- Naming convention: `feature/US-123-short-description` or `bugfix/issue-456-short-description`
- Merged back to develop when complete

## Workflow

1. **Start a new feature**:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/US-123-short-description
   ```

2. **Work on the feature**:
   - Make commits with meaningful messages
   - Push changes to remote repository

3. **Complete a feature**:
   ```bash
   git checkout develop
   git pull
   git checkout feature/US-123-short-description
   git merge develop  # Resolve any conflicts
   git push
   ```

4. **Create a Pull Request**:
   - Create PR from feature branch to develop
   - Ensure tests pass and code is reviewed
   - Merge to develop when approved

5. **Promote to QA**:
   - Create PR from develop to qa
   - QA team tests the features
   - Fix any issues found in QA

6. **Release to Production**:
   - Create PR from qa to main
   - Final approval from product owner
   - Merge to main
   - Tag the release with version number

## Hotfix Process

For urgent fixes needed in production:

1. Create hotfix branch from main:
   ```bash
   git checkout main
   git pull
   git checkout -b hotfix/issue-789-critical-fix
   ```

2. Fix the issue and create PRs to:
   - main (for immediate deployment)
   - develop (to ensure the fix is in future releases)

## Best Practices

- Always pull latest changes before creating a new branch
- Regularly merge develop into your feature branch to reduce merge conflicts
- Write meaningful commit messages
- Create focused, small pull requests for easier review
- Delete feature branches after they're merged
