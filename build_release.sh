#!/bin/bash
echo "Installing dependencies..."
npm install
echo "Building release files..."
npm run dist
echo "Build complete. Check the 'dist' folder."
read -p "Press any key to continue..."
