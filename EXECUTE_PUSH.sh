#!/bin/bash
# Execute this script to push to GitHub
# Run: bash EXECUTE_PUSH.sh

cd "$(dirname "$0")"

echo "🚀 Pushing Profile-to-Profile-Outreach-Engine to GitHub..."

# Initialize
git init

# Add files (excluding .env)
git add .
git reset HEAD .env 2>/dev/null

# Commit
git commit -m "Initial commit: Profile-to-Profile Outreach Engine"

# Add remote
git remote remove origin 2>/dev/null
git remote add origin https://github.com/candicesxc/Profile-to-Profile-Outreach-Engine.git

# Set branch
git branch -M main

# Push
git push -u origin main

echo "✅ Push complete!"

