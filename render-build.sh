#!/bin/bash
# Render build script - installs system dependencies then Python packages

set -e

echo "Installing system dependencies..."
apt-get update
apt-get install -y \
    gdal-bin \
    libgdal-dev \
    libproj-dev \
    proj-bin \
    libgeos-dev \
    libspatialindex-dev

echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r Backend/requirements.txt

echo "Build completed successfully!"
