#!/bin/bash
# Push to GitHub script

cd "$(dirname "$0")"

echo "🚀 Pushing to GitHub..."

# Step 1: Initialize git if needed
if [ ! -d .git ]; then
    echo "Initializing git repository..."
    git init
fi

# Step 2: Add all files (excluding .env)
echo "Adding files..."
git add .

# Step 3: Remove .env if accidentally staged
if git diff --cached --name-only | grep -q "^\.env$"; then
    echo "⚠ Removing .env from staging (it should not be committed)"
    git reset HEAD .env
fi

# Step 4: Commit if there are changes
if [ -n "$(git status --porcelain)" ]; then
    echo "Committing changes..."
    git commit -m "Initial commit: Profile-to-Profile Outreach Engine"
else
    echo "No changes to commit"
fi

# Step 5: Add remote
echo "Setting up remote..."
git remote remove origin 2>/dev/null
git remote add origin https://github.com/candicesxc/Profile-to-Profile-Outreach-Engine.git
echo "✓ Remote added: https://github.com/candicesxc/Profile-to-Profile-Outreach-Engine.git"

# Step 6: Set branch to main
echo "Setting branch to main..."
git branch -M main

# Step 7: Push to GitHub
echo "Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Done! Check your repository at: https://github.com/candicesxc/Profile-to-Profile-Outreach-Engine"

