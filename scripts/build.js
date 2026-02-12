/**
 * Build Script
 * Merges engine files with user data to generate static site
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

async function build(options = {}) {
  console.log(chalk.blue('🏗️  Building your portfolio...\n'));

  const cwd = process.cwd();
  const outputDir = path.join(cwd, options.output || 'dist');

  // Validate user has required directories
  const requiredDirs = ['config', 'data', 'lang'];
  for (const dir of requiredDirs) {
    if (!fs.existsSync(path.join(cwd, dir))) {
      throw new Error(`Missing required directory: ${dir}/`);
    }
  }

  console.log(chalk.cyan('📋 Validating data files...'));

  // Validate config files exist
  const requiredConfigs = ['app.json', 'languages.json', 'categories.json'];
  for (const config of requiredConfigs) {
    const configPath = path.join(cwd, 'config', config);
    if (!fs.existsSync(configPath)) {
      throw new Error(`Missing config file: config/${config}`);
    }
  }

  console.log(chalk.green('  ✓ All data files present\n'));

  // Clean output directory
  console.log(chalk.cyan('🧹 Cleaning output directory...'));
  await fs.emptyDir(outputDir);
  console.log(chalk.green('  ✓ Output directory cleaned\n'));

  // Copy engine files
  console.log(chalk.cyan('📦 Copying engine files...'));

  const enginePath = path.join(__dirname, '../engine');

  if (!fs.existsSync(enginePath)) {
    throw new Error('Engine files not found. Package may be corrupted.');
  }

  await fs.copy(enginePath, outputDir);

  // Count files copied
  const engineFiles = await fs.readdir(enginePath);
  console.log(chalk.green(`  ✓ Copied ${engineFiles.length} engine files\n`));

  // Copy user data
  console.log(chalk.cyan('📄 Copying your data...'));

  const dataDirs = ['config', 'data', 'lang'];
  for (const dir of dataDirs) {
    const srcPath = path.join(cwd, dir);
    const destPath = path.join(outputDir, dir);

    await fs.copy(srcPath, destPath);

    const fileCount = (await fs.readdir(srcPath)).length;
    console.log(chalk.green('  ✓'), `${dir}/ (${fileCount} files)`);
  }

  // Copy assets if exists
  const assetsPath = path.join(cwd, 'assets');
  if (fs.existsSync(assetsPath)) {
    await fs.copy(assetsPath, path.join(outputDir, 'assets'));
    const assetCount = (await fs.readdir(assetsPath)).length;
    console.log(chalk.green('  ✓'), `assets/ (${assetCount} files)`);
  }

  // Create build info
  const buildInfo = {
    buildDate: new Date().toISOString(),
    engine: {
      name: '@mtldev514/retro-portfolio-engine',
      version: require('../package.json').version
    },
    site: {
      name: path.basename(cwd)
    }
  };

  await fs.writeJson(path.join(outputDir, 'build-info.json'), buildInfo, {
    spaces: 2
  });

  console.log(chalk.green('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.green('✨ Build completed successfully!\n'));
  console.log(chalk.cyan('Output:'), outputDir);
  console.log(chalk.cyan('Size:'), await getDirSize(outputDir));
  console.log(chalk.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('  • Test locally: npm run dev'));
  console.log(chalk.gray('  • Deploy: npm run deploy\n'));

  return outputDir;
}

/**
 * Get directory size in human-readable format
 */
async function getDirSize(dirPath) {
  let size = 0;

  async function calcSize(dir) {
    const items = await fs.readdir(dir);

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = await fs.stat(itemPath);

      if (stats.isDirectory()) {
        await calcSize(itemPath);
      } else {
        size += stats.size;
      }
    }
  }

  await calcSize(dirPath);

  // Convert to human-readable
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

module.exports = build;
