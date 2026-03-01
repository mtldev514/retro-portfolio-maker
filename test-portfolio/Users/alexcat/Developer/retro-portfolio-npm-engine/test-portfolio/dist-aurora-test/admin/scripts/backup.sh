#!/bin/bash

# Backup Personal Data
# Creates a timestamped backup of your personal configuration and content

set -e

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  📦 Backup Personal Data"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Create backup directory with timestamp
BACKUP_DIR=".backup-personal"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"

echo "Creating backup at: $BACKUP_PATH"
echo ""

# Create backup directory structure
mkdir -p "$BACKUP_PATH"

# Track what we backed up
BACKED_UP=0

# Backup config
if [ -d "config" ]; then
    cp -r config "$BACKUP_PATH/"
    echo "  ✓ Backed up config/ ($(find config -type f | wc -l | xargs) files)"
    BACKED_UP=$((BACKED_UP + 1))
else
    echo "  ⚠️  config/ not found"
fi

# Backup data
if [ -d "data" ]; then
    cp -r data "$BACKUP_PATH/"
    echo "  ✓ Backed up data/ ($(find data -type f | wc -l | xargs) files)"
    BACKED_UP=$((BACKED_UP + 1))
else
    echo "  ⚠️  data/ not found"
fi

# Backup lang
if [ -d "lang" ]; then
    cp -r lang "$BACKUP_PATH/"
    echo "  ✓ Backed up lang/ ($(find lang -type f | wc -l | xargs) files)"
    BACKED_UP=$((BACKED_UP + 1))
else
    echo "  ⚠️  lang/ not found"
fi

# Backup .env
if [ -f ".env" ]; then
    cp .env "$BACKUP_PATH/"
    echo "  ✓ Backed up .env"
    BACKED_UP=$((BACKED_UP + 1))
else
    echo "  ⚠️  .env not found"
fi


# Create backup info file
cat > "$BACKUP_PATH/BACKUP_INFO.txt" << EOF
Backup Information
==================

Date: $(date)
Location: $BACKUP_PATH
Hostname: $(hostname)
User: $(whoami)

Contents:
$(ls -la "$BACKUP_PATH")

To restore this backup:
  ./scripts/restore.sh $TIMESTAMP

Or manually:
  cp -r $BACKUP_PATH/config ./
  cp -r $BACKUP_PATH/data ./
  cp -r $BACKUP_PATH/lang ./
  cp $BACKUP_PATH/.env ./
EOF

echo ""
echo "═══════════════════════════════════════════════════════════"

if [ $BACKED_UP -gt 0 ]; then
    echo "  ✅ Backup Complete!"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "📂 Backup location: $BACKUP_PATH"
    echo "📊 Items backed up: $BACKED_UP"
    echo ""
    echo "To restore:"
    echo "  ./scripts/restore.sh $TIMESTAMP"
    echo ""
else
    echo "  ⚠️  Nothing to backup"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "No personal data found. Have you run ./init.sh yet?"
    echo ""
fi

# Clean up old backups (keep last 5)
echo "Cleaning up old backups (keeping last 5)..."
ls -t "$BACKUP_DIR" | tail -n +6 | while read old_backup; do
    rm -rf "$BACKUP_DIR/$old_backup"
    echo "  Removed old backup: $old_backup"
done

echo ""
