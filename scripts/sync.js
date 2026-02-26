/**
 * Sync Script
 * Updates existing portfolio with latest templates without overwriting data
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * Sync package.json scripts without overwriting existing ones
 */
async function syncPackageJsonScripts(targetPath) {
  const packageJsonPath = path.join(targetPath, 'package.json');
  const packageJson = await fs.readJson(packageJsonPath);

  // Define the latest recommended scripts
  const recommendedScripts = {
    build: 'retro-portfolio build',
    dev: 'retro-portfolio dev',
    admin: 'retro-portfolio admin',
    start: 'npm run dev & npm run admin',
    deploy: 'retro-portfolio deploy',
    validate: 'retro-portfolio validate',
    sync: 'retro-portfolio sync',
    postinstall: 'pip3 install flask flask-cors 2>/dev/null || pip install flask flask-cors 2>/dev/null || echo "⚠️  Please install Flask manually: pip install flask flask-cors"'
  };

  // Ensure scripts section exists
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }

  let scriptsAdded = 0;

  // Add missing scripts
  for (const [scriptName, scriptCommand] of Object.entries(recommendedScripts)) {
    if (!packageJson.scripts[scriptName]) {
      packageJson.scripts[scriptName] = scriptCommand;
      console.log(chalk.green('    ✓ Added script:'), chalk.cyan(scriptName));
      scriptsAdded++;
    } else {
      console.log(chalk.gray('    ⊘ Script exists:'), chalk.gray(scriptName));
    }
  }

  // Save updated package.json if changes were made
  if (scriptsAdded > 0) {
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }

  return scriptsAdded;
}

async function sync(options = {}) {
  console.log(chalk.blue('🔄 Syncing portfolio with latest templates...\n'));

  const targetPath = process.cwd();
  const templatePath = path.join(__dirname, '../templates/user-portfolio');

  // Verify this is a portfolio directory
  const packageJsonPath = path.join(targetPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('No package.json found. Are you in a portfolio directory?');
  }

  const packageJson = await fs.readJson(packageJsonPath);
  if (!packageJson.dependencies || !packageJson.dependencies['@mtldev514/retro-portfolio-maker']) {
    throw new Error('This doesn\'t appear to be a retro-portfolio project.');
  }

  console.log(chalk.cyan('📋 Checking for missing files...\n'));

  let filesAdded = 0;
  let filesSkipped = 0;

  // Ensure required directories exist
  const dirs = ['config', 'data', 'lang', 'assets'];
  for (const dir of dirs) {
    const dirPath = path.join(targetPath, dir);
    if (!fs.existsSync(dirPath)) {
      await fs.ensureDir(dirPath);
      console.log(chalk.green('  ✓ Created missing directory:'), dir + '/');
      filesAdded++;
    }
  }

  // Sync .gitignore (safe to overwrite)
  const gitignorePath = path.join(targetPath, '.gitignore');
  if (!fs.existsSync(gitignorePath) || options.force) {
    const gitignore = `# Dependencies
node_modules/

# Build output
dist/

# Environment
.env
.env.local

# Editor
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Temp
temp_uploads/
.cache/
`;
    await fs.writeFile(gitignorePath, gitignore);
    console.log(chalk.green('  ✓ Updated:'), '.gitignore');
    filesAdded++;
  } else {
    console.log(chalk.gray('  ⊘ Skipped:'), '.gitignore', chalk.gray('(already exists)'));
    filesSkipped++;
  }

  // Sync .env.example (safe to overwrite)
  const envExamplePath = path.join(targetPath, '.env.example');
  const envExample = `# Cloudinary Configuration (Required for Admin uploads)
# Get your credentials at: https://cloudinary.com/console
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here

# GitHub Configuration (Optional - for large audio/video files)
# Create a personal access token at: https://github.com/settings/tokens
# Required scopes: repo (for private repos) or public_repo (for public repos)
GITHUB_TOKEN=your_github_token_here
`;
  await fs.writeFile(envExamplePath, envExample);
  console.log(chalk.green('  ✓ Updated:'), '.env.example');
  filesAdded++;

  // Create .env if it doesn't exist (don't overwrite if it does)
  const envPath = path.join(targetPath, '.env');
  if (!fs.existsSync(envPath)) {
    await fs.writeFile(envPath, envExample);
    console.log(chalk.green('  ✓ Created:'), '.env', chalk.yellow('(configure before using admin)'));
    filesAdded++;
  } else {
    console.log(chalk.gray('  ⊘ Skipped:'), '.env', chalk.gray('(preserving your credentials)'));
    filesSkipped++;
  }

  // Sync GitHub Actions workflow
  const workflowDir = path.join(targetPath, '.github', 'workflows');
  const deployWorkflowPath = path.join(workflowDir, 'deploy.yml');

  if (!fs.existsSync(deployWorkflowPath) || options.force) {
    await fs.ensureDir(workflowDir);
    const deployWorkflow = `name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: 📦 Checkout
        uses: actions/checkout@v4

      - name: 🔧 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: 📥 Install dependencies
        run: npm ci

      - name: 🏗️ Build site
        run: npm run build

      - name: 📊 Build summary
        run: |
          echo "### 🎨 Build Complete" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Build date:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")" >> $GITHUB_STEP_SUMMARY
          echo "**Output:** dist/" >> $GITHUB_STEP_SUMMARY

      - name: 📤 Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

      - name: 🚀 Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4

      - name: ✅ Deployment complete
        run: |
          echo "### 🎉 Site deployed!" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**URL:** $` + '{{ steps.deployment.outputs.page_url }}' + `" >> $GITHUB_STEP_SUMMARY
`;
    await fs.writeFile(deployWorkflowPath, deployWorkflow);
    console.log(chalk.green('  ✓ Updated:'), '.github/workflows/deploy.yml');
    filesAdded++;
  } else {
    console.log(chalk.gray('  ⊘ Skipped:'), '.github/workflows/deploy.yml', chalk.gray('(use --force to update)'));
    filesSkipped++;
  }

  // Check for missing config files (don't overwrite existing ones)
  console.log(chalk.cyan('\n📄 Checking configuration files...\n'));

  const configChecks = [
    'config/app.json',
    'config/languages.json',
    'config/categories.json',
    'config/media-types.json'
  ];

  for (const configFile of configChecks) {
    const configPath = path.join(targetPath, configFile);
    const templateConfigPath = path.join(templatePath, configFile);

    if (!fs.existsSync(configPath)) {
      if (fs.existsSync(templateConfigPath)) {
        await fs.copy(templateConfigPath, configPath);
        console.log(chalk.green('  ✓ Created missing:'), configFile);
        filesAdded++;
      } else {
        console.log(chalk.yellow('  ⚠ Template not found:'), configFile);
      }
    } else {
      console.log(chalk.gray('  ⊘ Skipped:'), configFile, chalk.gray('(preserving your config)'));
      filesSkipped++;
    }
  }

  // Check for missing language files
  console.log(chalk.cyan('\n🌐 Checking language files...\n'));

  const langChecks = ['lang/en.json', 'lang/fr.json'];

  for (const langFile of langChecks) {
    const langPath = path.join(targetPath, langFile);
    const templateLangPath = path.join(templatePath, langFile);

    if (!fs.existsSync(langPath)) {
      if (fs.existsSync(templateLangPath)) {
        await fs.copy(templateLangPath, langPath);
        console.log(chalk.green('  ✓ Created missing:'), langFile);
        filesAdded++;
      }
    } else {
      console.log(chalk.gray('  ⊘ Skipped:'), langFile, chalk.gray('(preserving your translations)'));
      filesSkipped++;
    }
  }

  // Sync styles/ directory (theme CSS files)
  console.log(chalk.cyan('\n🎨 Checking theme styles...\n'));

  const stylesDir = path.join(targetPath, 'styles');
  const templateStylesDir = path.join(templatePath, 'styles');

  if (!fs.existsSync(stylesDir)) {
    // No styles/ directory — copy entire template
    if (fs.existsSync(templateStylesDir)) {
      await fs.copy(templateStylesDir, stylesDir);
      const styleFiles = await fs.readdir(stylesDir);
      console.log(chalk.green('  ✓ Created:'), `styles/ (${styleFiles.length} files)`);
      filesAdded += styleFiles.length;
    }
  } else {
    // styles/ exists — ensure styles.json registry is present
    const stylesJsonPath = path.join(stylesDir, 'styles.json');
    if (!fs.existsSync(stylesJsonPath)) {
      const templateStylesJson = path.join(templateStylesDir, 'styles.json');
      if (fs.existsSync(templateStylesJson)) {
        await fs.copy(templateStylesJson, stylesJsonPath);
        console.log(chalk.green('  ✓ Created missing:'), 'styles/styles.json');
        filesAdded++;
      }
    } else {
      console.log(chalk.gray('  ⊘ Skipped:'), 'styles/', chalk.gray('(preserving your themes)'));
      filesSkipped++;
    }
  }

  // Migration: warn if old config/themes.json still exists
  const oldThemesJson = path.join(targetPath, 'config', 'themes.json');
  if (fs.existsSync(oldThemesJson)) {
    console.log(chalk.yellow('  ⚠ Found old config/themes.json — themes now live in styles/ directory'));
    console.log(chalk.yellow('    You can safely delete config/themes.json'));
  }

  // Sync package.json scripts
  console.log(chalk.cyan('\n📦 Checking package.json scripts...\n'));

  const updatedScripts = await syncPackageJsonScripts(targetPath);
  if (updatedScripts > 0) {
    console.log(chalk.green(`  ✓ Added ${updatedScripts} new script(s) to package.json`));
    filesAdded += updatedScripts;
  } else {
    console.log(chalk.gray('  ⊘ All scripts up to date'));
  }

  // Summary
  console.log(chalk.green('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.green('✨ Sync completed!\n'));
  console.log(chalk.cyan('Summary:'));
  console.log(chalk.green('  ✓'), `${filesAdded} file(s) added/updated`);
  console.log(chalk.gray('  ⊘'), `${filesSkipped} file(s) skipped (already exist)`);
  console.log(chalk.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  if (filesAdded > 0) {
    console.log(chalk.cyan('Your portfolio is now up to date! 🎉\n'));
  } else {
    console.log(chalk.gray('Your portfolio is already up to date.\n'));
  }

  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('  • Review new/updated files'));
  console.log(chalk.gray('  • Run: npm run build'));
  console.log(chalk.gray('  • Run: npm run dev\n'));

  return true;
}

module.exports = sync;
