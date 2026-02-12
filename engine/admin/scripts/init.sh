#!/bin/bash

# Portfolio Initialization Script
# Copies .example files to create your working configuration

set -e

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  🎨 Retro Portfolio - Initialization"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if already initialized
if [ -d "config" ] && [ -f "config/app.json" ]; then
    echo "⚠️  Portfolio appears to be already initialized."
    echo ""
    read -p "Reinitialize and overwrite existing files? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

echo "📁 Creating directory structure..."

# Create directories
mkdir -p config
mkdir -p data
mkdir -p lang

echo "📋 Copying configuration examples..."

# Copy config files
if [ -d "config.example" ]; then
    for file in config.example/*.example; do
        if [ -f "$file" ]; then
            basename=$(basename "$file" .example)
            cp "$file" "config/$basename"
            echo "  ✓ config/$basename"
        fi
    done
else
    echo "  ⚠️  config.example/ not found, skipping"
fi

echo ""
echo "📋 Copying data examples..."

# Copy data files
if [ -d "data.example" ]; then
    for file in data.example/*.example; do
        if [ -f "$file" ]; then
            basename=$(basename "$file" .example)
            cp "$file" "data/$basename"
            echo "  ✓ data/$basename"
        fi
    done
else
    echo "  ⚠️  data.example/ not found, skipping"
fi

echo ""
echo "🌐 Copying language files..."

# Copy lang files
if [ -d "lang.example" ]; then
    for file in lang.example/*.example; do
        if [ -f "$file" ]; then
            basename=$(basename "$file" .example)
            cp "$file" "lang/$basename"
            echo "  ✓ lang/$basename"
        fi
    done
else
    echo "  ⚠️  lang.example/ not found, skipping"
fi

echo ""
echo "🔐 Setting up environment..."

# Copy .env if doesn't exist
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "  ✓ .env created from .env.example"
        echo "  ⚠️  IMPORTANT: Edit .env with your Cloudinary credentials!"
    else
        echo "  ⚠️  .env.example not found"
    fi
else
    echo "  ✓ .env already exists"
fi

# Copy config-source.json if doesn't exist
if [ ! -f "config-source.json" ]; then
    if [ -f "config-source.json.example" ]; then
        cp config-source.json.example config-source.json
        echo "  ✓ config-source.json created"
    fi
else
    echo "  ✓ config-source.json already exists"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ Initialization Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo ""
echo "1. Edit your credentials:"
echo "   nano .env"
echo "   (Add your CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET)"
echo ""
echo "2. Customize your portfolio:"
echo "   - config/app.json      (app settings)"
echo "   - config/categories.json (content types)"
echo "   - config/languages.json  (supported languages)"
echo ""
echo "3. Add your content:"
echo "   - data/painting.json"
echo "   - data/photography.json"
echo "   - etc..."
echo ""
echo "4. Customize translations:"
echo "   - lang/en.json"
echo "   - lang/fr.json"
echo "   - etc..."
echo ""
echo "5. Start the backend:"
echo "   python3 admin_api.py"
echo ""
echo "6. Open in browser:"
echo "   open index.html"
echo "   or"
echo "   python3 -m http.server 8000"
echo ""
echo "📚 See README.md for full documentation"
echo ""
