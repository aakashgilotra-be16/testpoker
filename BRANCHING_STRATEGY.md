# Git Branching Strategy for Planning PokerThis document outlines the Git branching strategy and workflow for the Planning Poker application.## Branch StructureWe follow a four-tier branching model:1. **Feature branches**: For developing new features and bug fixes2. **Develop branch**: Integration branch for completed features3. **QA branch**: For testing and quality assurance4. **Main branch**: Production-ready code## Branch Naming Conventions- **Feature branches**: `feature/US{number}-{short-description}` or `bugfix/US{number}-{short-description}`- **Develop branch**: `develop`- **QA branch**: `qa`- **Main branch**: `main`## Workflow### 1. Feature Development1. Create a new feature branch from `develop`:   ```bash   git checkout develop   git pull   git checkout -b feature/US123-add-new-feature   ```2. Make changes, commit regularly with meaningful messages:   ```bash   git add .   git commit -m "US123: Implement feature X"   ```3. Push your branch to remote:   ```bash   git push -u origin feature/US123-add-new-feature   ```4. When the feature is complete, create a Pull Request (PR) to merge into `develop`.### 2. Integration in Develop1. Code review is performed on the PR.2. Once approved, merge the feature branch into `develop`:   ```bash   git checkout develop   git merge feature/US123-add-new-feature   git push origin develop   ```3. Delete the feature branch after successful merge:   ```bash   git branch -d feature/US123-add-new-feature   git push origin --delete feature/US123-add-new-feature   ```### 3. QA Testing1. After sufficient features have been integrated into `develop`, merge `develop` into `qa` for testing:   ```bash   git checkout qa   git pull   git merge develop   git push origin qa   ```2. Deploy the `qa` branch to a testing environment.3. QA team tests the application and reports any issues.4. If bugs are found, create bugfix branches from `qa`, fix the issues, and merge back to both `qa` and `develop`.### 4. Production Release1. Once QA approves the release, merge `qa` into `main`:   ```bash   git checkout main   git pull   git merge qa   git push origin main   ```2. Tag the release:   ```bash   git tag -a v1.0.0 -m "Version 1.0.0"   git push origin v1.0.0   ```3. Deploy the `main` branch to production.## HotfixesFor critical bugs in production:1. Create a hotfix branch from `main`:   ```bash   git checkout main   git pull   git checkout -b hotfix/US124-critical-bug   ```

2. Fix the issue and commit:
   ```bash
   git add .
   git commit -m "US124: Fix critical bug"
   ```

3. Create a PR to merge into `main`.
4. After review, merge to `main`:
   ```bash
   git checkout main
   git merge hotfix/US124-critical-bug
   git push origin main
   ```

5. Also merge the hotfix into `develop` and `qa`:
   ```bash
   git checkout develop
   git merge hotfix/US124-critical-bug
   git push origin develop
   
   git checkout qa
   git merge hotfix/US124-critical-bug
   git push origin qa
   ```

6. Tag the hotfix release and deploy to production.

## Best Practices

1. Pull the latest changes before creating a new branch.
2. Commit frequently with meaningful messages.
3. Keep feature branches short-lived.
4. Always create a PR for code review before merging.
5. Delete branches after they are merged.
6. Never commit directly to `develop`, `qa`, or `main`.
7. Always include the user story number in commit messages.
