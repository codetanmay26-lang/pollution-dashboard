FROM python:3.11-slim-bullseye

# Install system dependencies for geospatial packages
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    libproj-dev \
    proj-bin \
    libgeos-dev \
    libspatialindex-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python packages
COPY Backend/requirements.txt Backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r Backend/requirements.txt

# Copy application code
COPY Backend/ Backend/
COPY . .

# Expose port (Render sets $PORT automatically)
EXPOSE 8000

# Start command
CMD uvicorn Backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
