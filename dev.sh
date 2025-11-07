#!/bin/bash

echo "🔄 Restarting ZenSide development server..."

# Kill any running instances on common ports
echo "Stopping existing instances..."
lsof -ti :3000 | xargs kill -9 2>/dev/null

# Kill any Electron processes for this app
pkill -f "zenside" 2>/dev/null

# Wait a moment for processes to fully terminate
sleep 1

echo "✅ Stopped existing instances"
echo ""
echo "🚀 Starting development server..."
echo ""

# Start the dev server
npm start
