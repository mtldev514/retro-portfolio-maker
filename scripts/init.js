/**
 * Init Script
 * Creates a new portfolio with template data structure
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');
const generateReadme = require('./lib/readme-template');

// Helper function to prompt user for input
function prompt(question, defaultValue = '') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const displayQuestion = defaultValue
      ? `${question} ${chalk.gray(`(${defaultValue})`)}: `
      : `${question}: `;

    rl.question(displayQuestion, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function init(targetDir, options = {}) {
  console.log(chalk.blue('🎨 Initializing Retro Portfolio...\n'));

  const targetPath = path.resolve(process.cwd(), targetDir);
  const templatePath = path.join(__dirname, '../templates/user-portfolio');

  // Check if directory exists
  if (fs.existsSync(targetPath) && fs.readdirSync(targetPath).length > 0) {
    if (!options.force) {
      throw new Error(
        `Directory ${targetDir} is not empty. Use --force to overwrite.`
      );
    }
  }

  // Create directory structure
  console.log(chalk.cyan('📁 Creating directory structure...'));

  const dirs = ['config', 'data', 'lang', 'assets'];
  for (const dir of dirs) {
    const dirPath = path.join(targetPath, dir);
    await fs.ensureDir(dirPath);
    console.log(chalk.green('  ✓'), dir + '/');
  }

  // Copy template files
  console.log(chalk.cyan('\n📄 Creating template files...'));

  // package.json
  const packageJson = {
    name: path.basename(targetPath),
    version: '1.0.0',
    private: true,
    scripts: {
      build: 'retro-portfolio build',
      dev: 'retro-portfolio dev',
      admin: 'retro-portfolio admin',
      start: 'npm run dev & npm run admin',
      deploy: 'retro-portfolio deploy',
    },
    dependencies: {
      '@mtldev514/retro-portfolio-maker': '^1.0.0'
    }
  };

  await fs.writeJson(path.join(targetPath, 'package.json'), packageJson, {
    spaces: 2
  });
  console.log(chalk.green('  ✓'), 'package.json');

  // .gitignore
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

  await fs.writeFile(path.join(targetPath, '.gitignore'), gitignore);
  console.log(chalk.green('  ✓'), '.gitignore');

  // Interactive environment configuration
  console.log('\n' + chalk.cyan('╔═══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.bold.white('              🔧 Environment Configuration                       ') + chalk.cyan('║'));
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════╝'));
  console.log('');

  // Cloudinary section
  console.log(chalk.cyan('┌─ ') + chalk.bold('☁️  Cloudinary Configuration') + ' ' + chalk.bgBlue.white.bold(' FREE ACCOUNT '));
  console.log(chalk.cyan('│'));
  console.log(chalk.cyan('│  ') + chalk.gray('Required for image uploads in the admin interface'));
  console.log(chalk.cyan('│  ') + chalk.gray('Sign up: ') + chalk.blue.underline('https://cloudinary.com'));
  console.log(chalk.cyan('│  ') + chalk.gray('Get credentials: ') + chalk.blue.underline('https://cloudinary.com/console'));
  console.log(chalk.cyan('│'));
  console.log(chalk.cyan('│  ') + chalk.dim('💡 Tip: Press Enter to skip and configure later in .env file'));
  console.log(chalk.cyan('└─'));
  console.log('');

  const cloudName = await prompt(chalk.cyan('  ☁️  ') + chalk.white('Cloud Name'));
  const apiKey = await prompt(chalk.cyan('  🔑 ') + chalk.white('API Key'));
  const apiSecret = await prompt(chalk.cyan('  🔐 ') + chalk.white('API Secret'));

  console.log('');
  console.log(chalk.cyan('┌─ ') + chalk.bold('🐙 GitHub Configuration') + ' ' + chalk.bgGray.white.bold(' OPTIONAL '));
  console.log(chalk.cyan('│'));
  console.log(chalk.cyan('│  ') + chalk.gray('Only needed for hosting large audio/video files'));
  console.log(chalk.cyan('│  ') + chalk.gray('Create token: ') + chalk.blue.underline('https://github.com/settings/tokens'));
  console.log(chalk.cyan('│'));
  console.log(chalk.cyan('│  ') + chalk.dim('💡 Tip: Enter "skip" or press Enter to skip'));
  console.log(chalk.cyan('└─'));
  console.log('');

  const githubToken = await prompt(chalk.cyan('  🐙 ') + chalk.white('GitHub Token'), 'skip');

  // Create .env.example template
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

  await fs.writeFile(path.join(targetPath, '.env.example'), envExample);
  console.log(chalk.green('\n  ✓'), '.env.example');

  // Create .env with user's values or placeholders
  const hasCloudinaryConfig = cloudName && apiKey && apiSecret;
  let envContent;

  if (hasCloudinaryConfig) {
    envContent = `# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=${cloudName}
CLOUDINARY_API_KEY=${apiKey}
CLOUDINARY_API_SECRET=${apiSecret}

# GitHub Configuration (Optional)
${githubToken && githubToken !== 'skip' ? `GITHUB_TOKEN=${githubToken}` : '# GITHUB_TOKEN=your_github_token_here'}
`;
    console.log(chalk.green('  ✓'), '.env ' + chalk.gray('(configured with your credentials)'));
    console.log(chalk.green('  ✨'), 'Admin interface is ready to use!');
  } else {
    envContent = envExample;
    console.log(chalk.yellow('  ⚠'), '.env ' + chalk.gray('(created with placeholders)'));
    console.log(chalk.yellow('  ⚠'), 'Remember to edit .env before using the admin interface!');
  }

  await fs.writeFile(path.join(targetPath, '.env'), envContent);

  // Create GitHub Actions workflow for deployment
  console.log(chalk.cyan('\n⚙️  Creating GitHub Actions workflow...'));
  const workflowDir = path.join(targetPath, '.github', 'workflows');
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

  await fs.writeFile(path.join(workflowDir, 'deploy.yml'), deployWorkflow);
  console.log(chalk.green('  ✓'), '.github/workflows/deploy.yml');

  // Create config files
  const configFiles = {
    'config/app.json': {
      site: {
        name: 'My Retro Portfolio',
        description: 'A nostalgic web presence',
        author: 'Your Name'
      }
    },
    'config/languages.json': {
      defaultLanguage: 'en',
      supportedLanguages: [
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' }
      ]
    },
    'config/categories.json': {
      contentTypes: [
        {
          id: 'painting',
          name: { en: 'Painting', fr: 'Peinture' },
          icon: '🎨',
          mediaType: 'image',
          dataFile: 'data/painting.json'
        },
        {
          id: 'projects',
          name: { en: 'Projects', fr: 'Projets' },
          icon: '💻',
          mediaType: 'code',
          dataFile: 'data/projects.json'
        }
      ]
    },
    'config/media-types.json': {
      mediaTypes: [
        {
          id: 'image',
          name: 'Image',
          supportsGallery: true,
          acceptedFormats: ['jpg', 'png', 'gif', 'webp']
        },
        {
          id: 'code',
          name: 'Code Project',
          supportsGallery: false
        }
      ]
    }
  };

  for (const [filePath, content] of Object.entries(configFiles)) {
    const fullPath = path.join(targetPath, filePath);
    await fs.writeJson(fullPath, content, { spaces: 2 });
    console.log(chalk.green('  ✓'), filePath);
  }

  // Create empty data files
  const dataFiles = ['painting', 'projects'];
  for (const file of dataFiles) {
    const filePath = path.join(targetPath, 'data', `${file}.json`);
    await fs.writeJson(filePath, { items: [] }, { spaces: 2 });
    console.log(chalk.green('  ✓'), `data/${file}.json`);
  }

  // Create language files
  const langFiles = {
    'lang/en.json': {
      header_title: 'My Portfolio',
      nav_painting: 'Painting',
      nav_projects: 'Projects',
      footer_copy: '© 2026 My Portfolio'
    },
    'lang/fr.json': {
      header_title: 'Mon Portfolio',
      nav_painting: 'Peinture',
      nav_projects: 'Projets',
      footer_copy: '© 2026 Mon Portfolio'
    }
  };

  for (const [filePath, content] of Object.entries(langFiles)) {
    const fullPath = path.join(targetPath, filePath);
    await fs.writeJson(fullPath, content, { spaces: 2 });
    console.log(chalk.green('  ✓'), filePath);
  }

  // Copy styles/ directory (theme CSS files + registry)
  const templateStylesDir = path.join(templatePath, 'styles');
  if (fs.existsSync(templateStylesDir)) {
    await fs.copy(templateStylesDir, path.join(targetPath, 'styles'));
    console.log(chalk.green('  ✓'), 'styles/', chalk.gray('(theme CSS files — edit or duplicate to customize)'));
  }

  // Create README
  await fs.writeFile(path.join(targetPath, 'README.md'), generateReadme(path.basename(targetPath)));
  console.log(chalk.green('  ✓'), 'README.md');

  // Copy CONFIGURATION.md from templates
  const configMdSource = path.join(templatePath, 'CONFIGURATION.md');
  if (fs.existsSync(configMdSource)) {
    await fs.copy(configMdSource, path.join(targetPath, 'CONFIGURATION.md'));
    console.log(chalk.green('  ✓'), 'CONFIGURATION.md', chalk.gray('(full config reference)'));
  }

  // Success message
  console.log(chalk.green('\n✨ Portfolio initialized successfully!\n'));

  if (hasCloudinaryConfig) {
    console.log(chalk.green('🎉 Your environment is configured and ready!'));
    console.log(chalk.gray('   Admin interface will work immediately after install\n'));
  } else {
    console.log(chalk.yellow('⚠️  IMPORTANT: Configure your environment before using admin!'));
    console.log(chalk.gray('  1. Edit .env file and add your Cloudinary credentials'));
    console.log(chalk.gray('  2. Get them at: https://cloudinary.com/console'));
    console.log(chalk.gray('  3. Replace placeholder values with your actual credentials\n'));
  }

  console.log(chalk.cyan('Next steps:\n'));
  console.log(`  cd ${targetDir}`);
  console.log('  npm install');
  console.log('  npm run dev\n');
  console.log(chalk.gray('Happy creating! 🎨\n'));

  return true;
}

module.exports = init;
