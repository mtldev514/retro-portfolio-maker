#!/bin/bash

# Restore Personal Data
# Restores a timestamped backup of your personal configuration and content

set -e

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  📥 Restore Personal Data"
echo "═══════════════════════════════════════════════════════════"
echo ""

BACKUP_DIR=".backup-personal"

# List available backups
list_backups() {
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
        echo "❌ No backups found in $BACKUP_DIR"
        exit 1
    fi

    echo "Available backups:"
    echo ""
    ls -lt "$BACKUP_DIR" | grep "^d" | awk '{print "  " $9}' | nl
    echo ""
}

# Get backup to restore
if [ -z "$1" ]; then
    list_backups
    read -p "Enter backup timestamp (or 'latest' for most recent): " TIMESTAMP
else
    TIMESTAMP="$1"
fi

# Handle 'latest' option
if [ "$TIMESTAMP" == "latest" ]; then
    TIMESTAMP=$(ls -t "$BACKUP_DIR" | head -n 1)
    echo "Using latest backup: $TIMESTAMP"
fi

BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"

# Verify backup exists
if [ ! -d "$BACKUP_PATH" ]; then
    echo "❌ Backup not found: $BACKUP_PATH"
    echo ""
    list_backups
    exit 1
fi

# Show backup info
if [ -f "$BACKUP_PATH/BACKUP_INFO.txt" ]; then
    echo "Backup Information:"
    echo "─────────────────────────────────────────────────────────"
    cat "$BACKUP_PATH/BACKUP_INFO.txt"
    echo "─────────────────────────────────────────────────────────"
    echo ""
fi

# Confirm restoration
echo "⚠️  This will restore files from: $BACKUP_PATH"
echo ""
read -p "Continue with restoration? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Restoring files..."
echo ""

# Restore config
if [ -d "$BACKUP_PATH/config" ]; then
    cp -r "$BACKUP_PATH/config" ./
    echo "  ✓ Restored config/ ($(find config -type f | wc -l | xargs) files)"
else
    echo "  ⚠️  config/ not in backup"
fi

# Restore data
if [ -d "$BACKUP_PATH/data" ]; then
    cp -r "$BACKUP_PATH/data" ./
    echo "  ✓ Restored data/ ($(find data -type f | wc -l | xargs) files)"
else
    echo "  ⚠️  data/ not in backup"
fi

# Restore lang
if [ -d "$BACKUP_PATH/lang" ]; then
    cp -r "$BACKUP_PATH/lang" ./
    echo "  ✓ Restored lang/ ($(find lang -type f | wc -l | xargs) files)"
else
    echo "  ⚠️  lang/ not in backup"
fi

# Restore .env
if [ -f "$BACKUP_PATH/.env" ]; then
    cp "$BACKUP_PATH/.env" ./
    echo "  ✓ Restored .env"
else
    echo "  ⚠️  .env not in backup"
fi


echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ Restoration Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Your personal data has been restored from:"
echo "  $BACKUP_PATH"
echo ""
echo "You can now:"
echo "  1. Verify your data: ls -la config/ data/ lang/"
echo "  2. Test locally: python3 -m http.server 8000"
echo "  3. Open in browser: open http://localhost:8000"
echo ""
