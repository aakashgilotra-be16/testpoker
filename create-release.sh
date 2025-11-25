#!/bin/bash

# This script helps automate the release process for the Planning Poker app

# Make sure we're in the project directory
cd "$(dirname "$0")"

# Function to help with error handling
handle_error() {
    echo "ERROR: $1"
    exit 1
}

# Check if a version number was provided
if [ -z "$1" ]; then
    echo "Please provide a version number (e.g., ./create-release.sh 1.1.0)"
    exit 1
fi

VERSION="v$1"

# Verify we're on the main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    handle_error "Must be on 'main' branch to create a release. Currently on: $CURRENT_BRANCH"
fi

# Make sure the working directory is clean
if ! git diff-index --quiet HEAD --; then
    handle_error "You have uncommitted changes. Please commit or stash them before creating a release."
fi

echo "Creating release $VERSION..."

# Pull the latest from main to ensure we're up to date
git pull origin main || handle_error "Failed to pull latest changes from main"

# Create a tag
git tag -a "$VERSION" -m "Release $VERSION" || handle_error "Failed to create tag $VERSION"

# Push the tag to the remote
git push origin "$VERSION" || handle_error "Failed to push tag $VERSION to remote"

# Prompt for release notes
echo ""
echo "Release $VERSION created and pushed to remote."
echo ""
echo "Now, please update RELEASE_NOTES.md with information about this release."
echo "The file has been opened for editing (if your editor supports it)."

# Try to open the release notes file in an editor
if [ -n "$EDITOR" ]; then
    $EDITOR RELEASE_NOTES.md
elif command -v code >/dev/null 2>&1; then
    code RELEASE_NOTES.md
elif command -v vim >/dev/null 2>&1; then
    vim RELEASE_NOTES.md
elif command -v nano >/dev/null 2>&1; then
    nano RELEASE_NOTES.md
else
    echo "No suitable editor found. Please manually edit RELEASE_NOTES.md"
fi

echo ""
echo "Release process completed for $VERSION!"
echo "Don't forget to commit and push any changes to RELEASE_NOTES.md"
