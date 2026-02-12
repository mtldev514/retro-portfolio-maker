/**
 * Init Script
 * Creates a new portfolio with template data structure
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');

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
      postinstall: 'pip3 install flask flask-cors 2>/dev/null || pip install flask flask-cors 2>/dev/null || echo "⚠️  Please install Flask manually: pip install flask flask-cors"'
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
  console.log(chalk.cyan('\n🔧 Environment Configuration'));
  console.log(chalk.gray('  The admin interface needs Cloudinary for image uploads.'));
  console.log(chalk.gray('  Get free credentials at: ') + chalk.blue.underline('https://cloudinary.com/console'));
  console.log(chalk.gray('  (Press Enter to skip and configure later)\n'));

  const cloudName = await prompt(chalk.yellow('  Cloudinary Cloud Name'));
  const apiKey = await prompt(chalk.yellow('  Cloudinary API Key'));
  const apiSecret = await prompt(chalk.yellow('  Cloudinary API Secret'));

  console.log(chalk.gray('\n  GitHub token is optional (for hosting large audio/video files)'));
  const githubToken = await prompt(chalk.yellow('  GitHub Token'), 'skip');

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
          echo "### 🎨 Build Complete" >> \\$GITHUB_STEP_SUMMARY
          echo "" >> \\$GITHUB_STEP_SUMMARY
          echo "**Build date:** \\$(date -u +"%Y-%m-%d %H:%M:%S UTC")" >> \\$GITHUB_STEP_SUMMARY
          echo "**Output:** dist/" >> \\$GITHUB_STEP_SUMMARY

      - name: 📤 Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

      - name: 🚀 Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4

      - name: ✅ Deployment complete
        run: |
          echo "### 🎉 Site deployed!" >> \\$GITHUB_STEP_SUMMARY
          echo "" >> \\$GITHUB_STEP_SUMMARY
          echo "**URL:** \\${{ steps.deployment.outputs.page_url }}" >> \\$GITHUB_STEP_SUMMARY
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
      },
      theme: {
        default: 'jr16'
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

  // Create README
  const readme = `# ${path.basename(targetPath)}

A retro-styled portfolio powered by [@mtldev514/retro-portfolio-maker](https://www.npmjs.com/package/@mtldev514/retro-portfolio-maker).

## 🚀 Quick Start

\`\`\`bash
# 1. Install dependencies (includes Python Flask auto-install)
npm install

# 2. Configure your environment (IMPORTANT!)
# Edit .env file and add your Cloudinary credentials
# Get them at: https://cloudinary.com/console

# 3. Launch site + admin in parallel (recommended)
npm start
# → Site + Admin Interface: http://localhost:8000/admin.html
# → Admin API: http://localhost:5001/api/

# Or launch them separately:
npm run dev      # Site only (http://localhost:8000)
npm run admin    # Admin API only (http://localhost:5001/api/)
\`\`\`

## 📁 Project Structure

- \`config/\` - Site configuration (app, languages, categories)
- \`data/\` - Your portfolio content (JSON files)
- \`lang/\` - Translations (en.json, fr.json, etc.)
- \`assets/\` - Your images and media files

## ⚙️ Environment Configuration

**IMPORTANT:** Before using the admin interface, you MUST configure your Cloudinary credentials:

1. Sign up at [cloudinary.com](https://cloudinary.com) (free tier available)
2. Get your credentials from the [Cloudinary Console](https://cloudinary.com/console)
3. Edit \`.env\` file and replace the placeholder values:
   \`\`\`
   CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
   CLOUDINARY_API_KEY=your_actual_api_key
   CLOUDINARY_API_SECRET=your_actual_api_secret
   \`\`\`

**Optional:** For large audio/video files, add a GitHub token:
\`\`\`
GITHUB_TOKEN=your_github_personal_access_token
\`\`\`

## 🎨 Admin Interface

The admin interface allows you to:
- Upload and manage images via Cloudinary
- Edit content in all languages
- Add/edit/delete portfolio items
- Manage translations

Access it at **http://localhost:8000/admin/admin.html** after:
1. Running \`npm start\` (launches both site and API)
2. Or running both \`npm run dev\` and \`npm run admin\` in separate terminals

## 🏗️ Building for Production

\`\`\`bash
# Build the static site
npm run build

# Output will be in dist/ folder
# Deploy dist/ to GitHub Pages, Netlify, Vercel, etc.
\`\`\`

## 🌐 Deployment

### GitHub Pages (Automated)

This project includes a GitHub Action for automatic deployment.

1. Push your code to GitHub
2. Enable GitHub Pages in repository settings
3. On every push to \`main\`, the site will automatically build and deploy

### Manual Deployment

\`\`\`bash
npm run build
# Then deploy the dist/ folder to your hosting provider
\`\`\`

## 🔧 Configuration

### Cloudinary (for image uploads)

1. Create a free account at [Cloudinary](https://cloudinary.com)
2. Copy \`.env.example\` to \`.env\`
3. Add your Cloudinary credentials to \`.env\`

\`\`\`bash
cp .env.example .env
nano .env  # Edit with your credentials
\`\`\`

### Customization

- **Site name**: Edit \`config/app.json\`
- **Languages**: Edit \`config/languages.json\`
- **Categories**: Edit \`config/categories.json\`
- **Content**: Use the admin interface or edit JSON files in \`data/\`

## 📚 Available Commands

- \`npm start\` - Launch site + admin together
- \`npm run dev\` - Development server (site only)
- \`npm run admin\` - Admin interface
- \`npm run build\` - Build for production
- \`npm run deploy\` - Deploy to GitHub Pages

## 🆘 Troubleshooting

### Admin won't start

Make sure Flask is installed:

\`\`\`bash
pip install flask flask-cors
\`\`\`

### Images won't upload

Check your \`.env\` file has valid Cloudinary credentials.

### Site won't build

Make sure all required files exist in \`config/\`, \`data/\`, and \`lang/\` directories.

## 📖 Documentation

- [Engine Documentation](https://github.com/mtldev514/retro-portfolio-engine)
- [NPM Package](https://www.npmjs.com/package/@mtldev514/retro-portfolio-maker)

## 📄 License

MIT

---

**Made with 💜 using @mtldev514/retro-portfolio-maker**
`;

  await fs.writeFile(path.join(targetPath, 'README.md'), readme);
  console.log(chalk.green('  ✓'), 'README.md');

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
