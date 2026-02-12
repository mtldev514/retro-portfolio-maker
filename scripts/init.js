/**
 * Init Script
 * Creates a new portfolio with template data structure
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

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
      '@mtldev514/retro-portfolio-engine': '^1.0.0'
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

  // .env.example and .env
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
  console.log(chalk.green('  ✓'), '.env.example');

  // Create .env from .env.example if it doesn't exist
  const envPath = path.join(targetPath, '.env');
  if (!fs.existsSync(envPath)) {
    await fs.writeFile(envPath, envExample);
    console.log(chalk.green('  ✓'), '.env (created from example)');
  }

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

A retro-styled portfolio powered by [@mtldev514/retro-portfolio-engine](https://www.npmjs.com/package/@mtldev514/retro-portfolio-engine).

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
- [NPM Package](https://www.npmjs.com/package/@mtldev514/retro-portfolio-engine)

## 📄 License

MIT

---

**Made with 💜 using @mtldev514/retro-portfolio-engine**
`;

  await fs.writeFile(path.join(targetPath, 'README.md'), readme);
  console.log(chalk.green('  ✓'), 'README.md');

  // Success message
  console.log(chalk.green('\n✨ Portfolio initialized successfully!\n'));
  console.log(chalk.yellow('⚠️  IMPORTANT: Configure your environment first!'));
  console.log(chalk.gray('  1. Edit .env file and add your Cloudinary credentials'));
  console.log(chalk.gray('  2. Get them at: https://cloudinary.com/console'));
  console.log(chalk.gray('  3. Replace placeholder values with your actual credentials\n'));
  console.log(chalk.cyan('Next steps:\n'));
  console.log(`  cd ${targetDir}`);
  console.log('  npm install');
  console.log('  npm run dev\n');
  console.log(chalk.gray('Happy creating! 🎨\n'));

  return true;
}

module.exports = init;
