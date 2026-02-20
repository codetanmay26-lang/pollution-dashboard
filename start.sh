#!/bin/bash

# Install dependencies
npm install
pip install -r Backend/requirements.txt

# Build React frontend
npm run build

# Start backend server
python -m uvicorn Backend.main:app --host 0.0.0.0 --port $PORT
