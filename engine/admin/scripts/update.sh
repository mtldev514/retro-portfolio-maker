#!/bin/bash

# Retro Portfolio Update Script
# Safely updates the template while preserving user data

set -e

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  🔄 Retro Portfolio - Update Script"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detect setup type
SETUP_TYPE="unknown"

if [ -d "template/.git" ]; then
    SETUP_TYPE="submodule"
elif [ -d ".git" ]; then
    # Check if this is the template repo or a user's fork
    REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
    if [[ "$REMOTE_URL" == *"retro-portfolio"* ]] && [[ "$REMOTE_URL" != *"retro-portfolio-config"* ]]; then
        SETUP_TYPE="direct"
    else
        SETUP_TYPE="fork"
    fi
fi

echo -e "${BLUE}📋 Setup type detected: $SETUP_TYPE${NC}"
echo ""

# Function to create backup
create_backup() {
    echo -e "${YELLOW}📦 Creating backup...${NC}"

    BACKUP_DIR=".backup-personal-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # Backup user data
    [ -d "config" ] && cp -r config "$BACKUP_DIR/" && echo "  ✓ Backed up config/"
    [ -d "data" ] && cp -r data "$BACKUP_DIR/" && echo "  ✓ Backed up data/"
    [ -d "lang" ] && cp -r lang "$BACKUP_DIR/" && echo "  ✓ Backed up lang/"
    [ -f ".env" ] && cp .env "$BACKUP_DIR/" && echo "  ✓ Backed up .env"
    [ -f "config-source.json" ] && cp config-source.json "$BACKUP_DIR/" && echo "  ✓ Backed up config-source.json"

    echo -e "${GREEN}  ✓ Backup created: $BACKUP_DIR${NC}"
    echo ""
}

# Function to verify data integrity
verify_data() {
    echo -e "${YELLOW}🔍 Verifying data integrity...${NC}"

    ERRORS=0

    # Check essential directories exist
    if [ ! -d "config" ] || [ ! -f "config/app.json" ]; then
        echo -e "${RED}  ✗ config/ missing or incomplete${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}  ✓ config/ intact${NC}"
    fi

    if [ ! -d "data" ]; then
        echo -e "${RED}  ✗ data/ missing${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}  ✓ data/ intact${NC}"
    fi

    if [ ! -d "lang" ]; then
        echo -e "${RED}  ✗ lang/ missing${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}  ✓ lang/ intact${NC}"
    fi

    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}  ⚠️  .env missing (you may need to recreate it)${NC}"
    else
        echo -e "${GREEN}  ✓ .env intact${NC}"
    fi

    echo ""

    if [ $ERRORS -gt 0 ]; then
        echo -e "${RED}❌ Data verification failed! Restore from backup.${NC}"
        return 1
    fi

    echo -e "${GREEN}✅ All data verified successfully!${NC}"
    echo ""
    return 0
}

# Function to update submodule setup
update_submodule() {
    echo -e "${BLUE}📥 Updating template submodule...${NC}"
    echo ""

    cd template

    # Check current version
    CURRENT_COMMIT=$(git rev-parse --short HEAD)
    echo "Current version: $CURRENT_COMMIT"

    # Pull latest
    git fetch origin
    git pull origin main

    # Check new version
    NEW_COMMIT=$(git rev-parse --short HEAD)
    echo "New version: $NEW_COMMIT"

    cd ..

    if [ "$CURRENT_COMMIT" != "$NEW_COMMIT" ]; then
        echo ""
        echo -e "${GREEN}✅ Template updated successfully!${NC}"
        echo ""
        echo -e "${YELLOW}Don't forget to commit the update:${NC}"
        echo "  git add template"
        echo "  git commit -m \"Update template to $NEW_COMMIT\""
    else
        echo ""
        echo -e "${GREEN}✅ Already on latest version!${NC}"
    fi

    echo ""
}

# Function to update direct/fork setup
update_direct() {
    echo -e "${BLUE}📥 Updating repository...${NC}"
    echo ""

    # Check current version
    CURRENT_COMMIT=$(git rev-parse --short HEAD)
    echo "Current version: $CURRENT_COMMIT"

    # Check for uncommitted changes in tracked files
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo -e "${YELLOW}⚠️  You have uncommitted changes in tracked files.${NC}"
        echo ""
        read -p "Stash changes before updating? (recommended) (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            git stash push -m "Auto-stash before update $(date)"
            STASHED=true
        fi
    fi

    # Pull latest changes
    if [ "$SETUP_TYPE" == "fork" ]; then
        # Check if upstream exists
        if ! git remote get-url upstream > /dev/null 2>&1; then
            echo -e "${YELLOW}Adding upstream remote...${NC}"
            git remote add upstream https://github.com/yourusername/retro-portfolio.git
        fi

        git fetch upstream
        git merge upstream/main
    else
        git pull origin main
    fi

    # Pop stash if we stashed
    if [ "$STASHED" = true ]; then
        echo ""
        echo -e "${YELLOW}Restoring your changes...${NC}"
        git stash pop || echo -e "${YELLOW}⚠️  Could not auto-restore stash. Run 'git stash pop' manually.${NC}"
    fi

    # Check new version
    NEW_COMMIT=$(git rev-parse --short HEAD)
    echo "New version: $NEW_COMMIT"

    echo ""
    if [ "$CURRENT_COMMIT" != "$NEW_COMMIT" ]; then
        echo -e "${GREEN}✅ Repository updated successfully!${NC}"
    else
        echo -e "${GREEN}✅ Already on latest version!${NC}"
    fi

    echo ""
}

# Function to show what changed
show_changes() {
    echo -e "${BLUE}📝 Recent changes:${NC}"
    echo ""

    if [ -f "CHANGELOG.md" ]; then
        # Show last 20 lines of changelog
        tail -n 20 CHANGELOG.md
    else
        # Show recent commits
        git log --oneline --decorate -5
    fi

    echo ""
}

# Function to check for new example files
check_new_examples() {
    echo -e "${BLUE}🆕 Checking for new features...${NC}"
    echo ""

    NEW_FEATURES=false

    # Check for new config examples
    if [ -d "config.example" ]; then
        for example_file in config.example/*.example; do
            if [ -f "$example_file" ]; then
                base_name=$(basename "$example_file" .example)
                user_file="config/$base_name"

                # If user file exists, check for new fields
                if [ -f "$user_file" ]; then
                    # Simple check: compare file sizes (crude but fast)
                    EXAMPLE_SIZE=$(wc -c < "$example_file")
                    USER_SIZE=$(wc -c < "$user_file")

                    if [ "$EXAMPLE_SIZE" -gt "$USER_SIZE" ]; then
                        echo -e "${YELLOW}  ℹ️  New options may be available in: $base_name${NC}"
                        echo "     Compare: diff config/$base_name config.example/$base_name.example"
                        NEW_FEATURES=true
                    fi
                fi
            fi
        done
    fi

    if [ "$NEW_FEATURES" = false ]; then
        echo -e "${GREEN}  ✓ No new configuration options detected${NC}"
    fi

    echo ""
}

# Main update flow
main() {
    # Create backup first
    create_backup

    # Store current directory
    ORIGINAL_DIR=$(pwd)

    # Update based on setup type
    case $SETUP_TYPE in
        submodule)
            update_submodule
            ;;
        direct|fork)
            update_direct
            ;;
        *)
            echo -e "${RED}❌ Could not detect setup type${NC}"
            echo "Please update manually. See UPDATE.md for instructions."
            exit 1
            ;;
    esac

    # Return to original directory
    cd "$ORIGINAL_DIR"

    # Verify data integrity
    if ! verify_data; then
        echo -e "${RED}❌ Update completed but data verification failed!${NC}"
        echo -e "${YELLOW}Restore from backup:${NC}"
        echo "  cp -r $BACKUP_DIR/* ."
        exit 1
    fi

    # Show what changed
    show_changes

    # Check for new examples
    check_new_examples

    # Final instructions
    echo "═══════════════════════════════════════════════════════════"
    echo -e "${GREEN}  ✅ Update Complete!${NC}"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Review changes:"
    echo "   cat CHANGELOG.md"
    echo ""
    echo "2. Test locally:"
    echo "   python3 -m http.server 8000"
    echo "   open http://localhost:8000"
    echo ""
    echo "3. Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)"
    echo ""
    echo "4. Deploy updated site:"
    echo "   git push"
    echo ""

    if [ "$SETUP_TYPE" == "submodule" ]; then
        echo "5. Commit the template update:"
        echo "   git add template"
        echo "   git commit -m \"Update template\""
        echo "   git push"
        echo ""
    fi

    echo -e "${YELLOW}💡 Backup saved to: $BACKUP_DIR${NC}"
    echo ""
}

# Run main
main
