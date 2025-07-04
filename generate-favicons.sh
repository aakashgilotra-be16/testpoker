#!/bin/bash

# Change to the project directory
cd "$(dirname "$0")"

# Generate the necessary directories
mkdir -p public

# Open the favicon generator in the default browser
echo "Opening favicon generator in your default browser..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open public/favicon-generator.html
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open public/favicon-generator.html
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    # Windows
    start public/favicon-generator.html
else
    echo "Unsupported OS. Please open public/favicon-generator.html manually."
fi

echo "Instructions:"
echo "1. Use the favicon generator page that just opened to create PNG favicons"
echo "2. Download the PNG files for each size (16x16, 32x32, etc.)"
echo "3. Move the downloaded PNG files to the 'public' directory"
echo "4. The index.html has already been updated to reference these files"
