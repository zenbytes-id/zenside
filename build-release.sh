#!/bin/bash

# ZenSide Release Build Script
# This script builds the app with Apple code signing and notarization

set -e  # Exit on error

echo "🚀 ZenSide Release Build"
echo "========================"
echo ""

# Load .env file if it exists
if [ -f .env ]; then
  echo "📄 Loading credentials from .env file..."
  set -a  # automatically export all variables
  source .env
  set +a
  echo "✅ Credentials loaded"
  echo ""
else
  echo "⚠️  No .env file found"
  echo "Please create one from .env.example:"
  echo "  cp .env.example .env"
  echo "  # Edit .env with your credentials"
  echo ""
fi

# Check notarization credentials (optional)
if [ -z "$APPLE_ID" ] || [ -z "$APPLE_ID_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
  echo "⚠️  Notarization credentials not set"
  echo "Building WITHOUT notarization (code signing only)"
  echo ""
  echo "Note: Users will need to right-click → Open on first launch"
  echo "To enable notarization, set APPLE_ID, APPLE_ID_PASSWORD, and APPLE_TEAM_ID in .env"
  echo ""
  SKIP_NOTARIZATION=true
else
  echo "✅ Apple ID: $APPLE_ID"
  echo "✅ Team ID: $APPLE_TEAM_ID"
  SKIP_NOTARIZATION=false
fi

# Check code signing identity (required for signed builds)
if [ -z "$APPLE_IDENTITY" ]; then
  echo "⚠️  APPLE_IDENTITY not set - building unsigned"
  echo "Available signing identities:"
  security find-identity -v -p codesigning
  echo ""
  echo "Set APPLE_IDENTITY in .env to enable code signing"
  echo ""
  read -p "Continue with unsigned build? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  echo "✅ Identity: $APPLE_IDENTITY"
  echo ""

  # Check if certificate is available in keychain
  echo "🔍 Checking for signing certificate in keychain..."
  if security find-identity -v -p codesigning | grep -q "$APPLE_IDENTITY"; then
    echo "✅ Certificate found in keychain"
  else
    echo "⚠️  Warning: Certificate not found in keychain"
    echo "Available certificates:"
    security find-identity -v -p codesigning
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
fi

echo ""
echo "📦 Starting build process..."
if [ "$SKIP_NOTARIZATION" = true ]; then
  echo "⏱️  This will take 2-3 minutes (no notarization)"
else
  echo "⏱️  This will take 5-10 minutes (optimized signing + notarization)"
  echo "    • Code signing: ~2-3 minutes (optimized with entitlements file)"
  echo "    • Notarization: ~3-5 minutes (Apple's servers)"
  echo "    • DMG creation: ~30-60 seconds"
fi
echo ""

# Set NODE_ENV to production
export NODE_ENV=production

# Run the build with caffeinate to prevent sleep during long notarization
# The -i flag prevents idle sleep while allowing forced sleep
if [ "$SKIP_NOTARIZATION" = false ]; then
  echo "💡 Preventing Mac from sleeping during notarization..."
  caffeinate -i npm run make
else
  npm run make
fi

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "📁 Build artifacts location:"
echo "   $(pwd)/out/make/"
echo ""
echo "Files created:"
ls -lh out/make/*.dmg 2>/dev/null || true
find out/make -name "*.zip" -exec ls -lh {} \; 2>/dev/null || true
echo ""
echo "🎉 Ready to release!"
