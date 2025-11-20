#!/bin/bash
# Git setup and push script for Profile-to-Profile-Outreach-Engine

cd "$(dirname "$0")"

echo "🔧 Setting up git repository..."

# Initialize git if not already initialized
if [ ! -d .git ]; then
    git init
    echo "✓ Git repository initialized"
fi

# Verify .env is ignored
if git check-ignore .env > /dev/null 2>&1; then
    echo "✓ .env file is properly ignored by git"
else
    echo "⚠ Warning: .env might not be ignored. Checking .gitignore..."
    if grep -q "^\.env$" .gitignore || grep -q "^\*\.env$" .gitignore; then
        echo "✓ .gitignore contains .env patterns"
    else
        echo "✗ .gitignore might need updating"
    fi
fi

# Add all files (except those in .gitignore)
git add .

# Show what will be committed (excluding .env)
echo ""
echo "📋 Files to be committed:"
git status --short | grep -v ".env" | head -20

# Check if .env is in staging
if git diff --cached --name-only | grep -q "^\.env$"; then
    echo ""
    echo "⚠ WARNING: .env file is staged! Removing it..."
    git reset HEAD .env
fi

# Commit
echo ""
read -p "Enter commit message (or press Enter for default): " commit_msg
commit_msg=${commit_msg:-"Initial commit: Profile-to-Profile Outreach Engine"}

git commit -m "$commit_msg"
echo "✓ Changes committed"

# Set up remote (user needs to provide GitHub username)
echo ""
echo "🔗 Setting up remote repository..."
read -p "Enter your GitHub username: " github_username

if [ -n "$github_username" ]; then
    # Check if remote already exists
    if git remote get-url origin > /dev/null 2>&1; then
        echo "Remote 'origin' already exists. Updating..."
        git remote set-url origin "https://github.com/${github_username}/Profile-to-Profile-Outreach-Engine.git"
    else
        git remote add origin "https://github.com/${github_username}/Profile-to-Profile-Outreach-Engine.git"
    fi
    echo "✓ Remote configured: https://github.com/${github_username}/Profile-to-Profile-Outreach-Engine.git"
    
    # Push to GitHub
    echo ""
    echo "🚀 Pushing to GitHub..."
    read -p "Push to main branch? (y/n): " push_confirm
    if [ "$push_confirm" = "y" ] || [ "$push_confirm" = "Y" ]; then
        git branch -M main
        git push -u origin main
        echo "✓ Code pushed to GitHub!"
    else
        echo "Skipped push. Run 'git push -u origin main' when ready."
    fi
else
    echo "No username provided. To set up remote later, run:"
    echo "  git remote add origin https://github.com/YOUR_USERNAME/Profile-to-Profile-Outreach-Engine.git"
    echo "  git branch -M main"
    echo "  git push -u origin main"
fi

echo ""
echo "✅ Setup complete!"

