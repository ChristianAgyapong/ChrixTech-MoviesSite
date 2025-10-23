#!/bin/bash

# Build the project
echo "Building the project..."

# Change to django_movie_app directory
cd django_movie_app

# Install dependencies
pip3 install -r requirements.txt

# Collect static files
python3 manage.py collectstatic --noinput --clear

echo "Build completed successfully!"
