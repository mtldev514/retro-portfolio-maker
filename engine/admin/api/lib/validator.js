/**
 * Portfolio Configuration Validator
 * Port of Python validate_config.py — validates all config files,
 * data files, and translations for consistency and correctness.
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { ConfigLoader } = require('./config-loader');

class ConfigValidator {
  constructor(contentRoot) {
    this.contentRoot = path.resolve(contentRoot || '.');
    this.configDir = path.join(this.contentRoot, 'config');
    this.dataDir = path.join(this.contentRoot, 'data');
    this.langDir = path.join(this.contentRoot, 'lang');

    this.errors = [];
    this.warnings = [];
    this.info = [];

    this.configLoader = new ConfigLoader(contentRoot);
  }

  addError(message) {
    this.errors.push(chalk.red(`\u2717 ERROR: ${message}`));
  }

  addWarning(message) {
    this.warnings.push(chalk.yellow(`\u26A0 WARNING: ${message}`));
  }

  addInfo(message) {
    this.info.push(chalk.blue(`\u2139 INFO: ${message}`));
  }

  validateJsonFile(filePath) {
    if (!fs.existsSync(filePath)) {
      this.addError(`File not found: ${filePath}`);
      return { valid: false, data: null };
    }
    try {
      const data = fs.readJsonSync(filePath);
      return { valid: true, data };
    } catch (e) {
      this.addError(`Invalid JSON in ${path.basename(filePath)}: ${e.message}`);
      return { valid: false, data: null };
    }
  }

  validateMediaTypes() {
    console.log(chalk.magenta('\n\uD83D\uDCCB Validating Media Types...'));

    const { valid, data } = this.validateJsonFile(path.join(this.configDir, 'media-types.json'));
    if (!valid) return false;

    if (!data.mediaTypes) {
      this.addError("media-types.json missing 'mediaTypes' array");
      return false;
    }

    const requiredFields = ['id', 'name', 'icon', 'viewer', 'acceptedFormats', 'dataFile'];
    for (let i = 0; i < data.mediaTypes.length; i++) {
      const mt = data.mediaTypes[i];
      for (const field of requiredFields) {
        if (!(field in mt)) {
          this.addError(`Media type #${i} missing required field: ${field}`);
        }
      }
      if (mt.acceptedFormats && !Array.isArray(mt.acceptedFormats)) {
        this.addError(`Media type '${mt.id || i}': acceptedFormats must be an array`);
      }
    }

    console.log(chalk.green(`\u2713 Found ${data.mediaTypes.length} media types`));
    return true;
  }

  validateCategories() {
    console.log(chalk.magenta('\n\uD83D\uDCC1 Validating Content Types...'));

    const { valid, data } = this.validateJsonFile(path.join(this.configDir, 'categories.json'));
    if (!valid) return false;

    const contentTypes = data.contentTypes || data.categories || [];
    if (contentTypes.length === 0) {
      this.addError('categories.json missing content types array');
      return false;
    }

    const requiredFields = ['id', 'name', 'icon', 'mediaType'];
    for (const ct of contentTypes) {
      const ctId = ct.id || '(unknown)';
      for (const field of requiredFields) {
        if (!(field in ct)) {
          this.addError(`Content type '${ctId}' missing required field: ${field}`);
        }
      }
      if (ct.fields) {
        if (!ct.fields.required) this.addWarning(`Content type '${ctId}': missing 'fields.required' array`);
        if (!ct.fields.optional) this.addWarning(`Content type '${ctId}': missing 'fields.optional' array`);
      }
    }

    console.log(chalk.green(`\u2713 Found ${contentTypes.length} content types`));
    return true;
  }

  validateLanguages() {
    console.log(chalk.magenta('\n\uD83C\uDF10 Validating Languages...'));

    const { valid, data } = this.validateJsonFile(path.join(this.configDir, 'languages.json'));
    if (!valid) return false;

    if (!data.supportedLanguages) {
      this.addError("languages.json missing 'supportedLanguages' array");
      return false;
    }
    if (!data.defaultLanguage) {
      this.addError("languages.json missing 'defaultLanguage' field");
      return false;
    }

    for (const lang of data.supportedLanguages) {
      if (!lang.code) this.addError('Language entry missing required field: code');
      if (!lang.name) this.addError('Language entry missing required field: name');
    }

    console.log(chalk.green(`\u2713 Found ${data.supportedLanguages.length} supported languages`));
    return true;
  }

  validateAppConfig() {
    console.log(chalk.magenta('\n\u2699\uFE0F  Validating App Configuration...'));

    const { valid, data } = this.validateJsonFile(path.join(this.configDir, 'app.json'));
    if (!valid) return false;

    const recommended = ['name', 'author', 'api', 'github'];
    for (const field of recommended) {
      if (!(field in data)) {
        this.addWarning(`app.json missing recommended field: ${field}`);
      }
    }

    console.log(chalk.green('\u2713 App configuration valid'));
    return true;
  }

  validateDataFiles() {
    console.log(chalk.magenta('\n\uD83D\uDCCA Validating Data Files (Normalized Format)...'));

    if (!this.configLoader.loadAll()) {
      this.addError('Failed to load configuration');
      return false;
    }

    const mediaTypes = this.configLoader.getMediaTypes();
    const contentTypes = this.configLoader.getContentTypes();

    // ─── Validate media-type data files ────────────────
    const allItemsById = new Map(); // uuid → { item, mediaType }

    for (const mt of mediaTypes) {
      const dataFile = mt.dataFile
        ? path.join(this.contentRoot, mt.dataFile)
        : path.join(this.dataDir, `${mt.id}.json`);

      if (!fs.existsSync(dataFile)) {
        this.addWarning(`Media-type data file not found: ${mt.dataFile || `data/${mt.id}.json`}`);
        continue;
      }

      const { valid, data } = this.validateJsonFile(dataFile);
      if (!valid) continue;

      if (!Array.isArray(data)) {
        this.addError(`${mt.id}.json must be an array`);
        continue;
      }

      for (const item of data) {
        if (!item.id) {
          this.addError(`Item in ${mt.id}.json missing 'id' field`);
          continue;
        }
        if (allItemsById.has(item.id)) {
          this.addError(`Duplicate UUID '${item.id}' in ${mt.id}.json`);
        } else {
          allItemsById.set(item.id, { item, mediaType: mt.id });
        }
      }

      console.log(chalk.green(`\u2713 ${mt.icon} ${mt.name}: ${data.length} items`));
    }

    // ─── Validate category reference files ─────────────
    const referencedIds = new Set();

    for (const ct of contentTypes) {
      const refFile = path.join(this.dataDir, `${ct.id}.json`);

      if (!fs.existsSync(refFile)) {
        this.addWarning(`Category ref file not found: data/${ct.id}.json`);
        continue;
      }

      const { valid, data } = this.validateJsonFile(refFile);
      if (!valid) continue;

      if (!Array.isArray(data)) {
        this.addError(`data/${ct.id}.json must be a UUID array`);
        continue;
      }

      // Check entries are strings (UUIDs)
      const nonStrings = data.filter(r => typeof r !== 'string');
      if (nonStrings.length > 0) {
        this.addError(`data/${ct.id}.json contains non-string entries — may need migration`);
        continue;
      }

      for (const uuid of data) {
        referencedIds.add(uuid);
        if (!allItemsById.has(uuid)) {
          this.addError(`Category '${ct.id}' references UUID '${uuid}' not found in any media-type file`);
        } else {
          const entry = allItemsById.get(uuid);
          if (entry.mediaType !== ct.mediaType) {
            this.addError(`Category '${ct.id}' (${ct.mediaType}) references UUID '${uuid}' from ${entry.mediaType}`);
          }
        }
      }

      const catName = typeof ct.name === 'object' ? (ct.name.en || ct.id) : (ct.name || ct.id);
      console.log(chalk.green(`\u2713 ${ct.icon} ${catName}: ${data.length} refs → ${ct.mediaType}`));
    }

    // Check for orphaned items
    for (const [uuid, entry] of allItemsById) {
      if (!referencedIds.has(uuid)) {
        this.addWarning(`Orphaned item '${uuid}' in ${entry.mediaType}.json not referenced by any category`);
      }
    }

    return true;
  }

  validateTranslations() {
    console.log(chalk.magenta('\n\uD83D\uDD24 Validating Translations...'));

    const langCodes = this.configLoader.getLanguageCodes();
    if (!langCodes.length) {
      this.addError('No language codes found');
      return false;
    }

    const translations = {};
    for (const code of langCodes) {
      const langFile = path.join(this.langDir, `${code}.json`);
      const { valid, data } = this.validateJsonFile(langFile);
      if (valid) {
        translations[code] = data;
        console.log(chalk.green(`\u2713 ${code}.json: ${Object.keys(data).length} keys`));
      } else {
        this.addError(`Failed to load translation file: ${code}.json`);
      }
    }

    // Check for missing keys across languages
    if (Object.keys(translations).length > 1) {
      const allKeys = new Set();
      for (const keys of Object.values(translations)) {
        for (const k of Object.keys(keys)) allKeys.add(k);
      }

      for (const [code, keys] of Object.entries(translations)) {
        const existing = new Set(Object.keys(keys));
        const missing = [...allKeys].filter(k => !existing.has(k));
        if (missing.length > 0) {
          this.addWarning(`Language '${code}' missing ${missing.length} translation keys`);
          if (missing.length <= 5) {
            for (const key of missing) {
              this.addInfo(`  Missing in '${code}': ${key}`);
            }
          }
        }
      }
    }

    return true;
  }

  validateCrossReferences() {
    console.log(chalk.magenta('\n\uD83D\uDD17 Validating Cross-References...'));

    const contentTypes = this.configLoader.getContentTypes();
    const mediaTypes = this.configLoader.getMediaTypes();
    const mediaTypeIds = new Set(mediaTypes.map(mt => mt.id));

    for (const ct of contentTypes) {
      if (ct.mediaType && !mediaTypeIds.has(ct.mediaType)) {
        this.addError(`Content type '${ct.id}' references unknown media type: ${ct.mediaType}`);
      }
    }

    console.log(chalk.green('\u2713 Cross-references valid'));
    return true;
  }

  /**
   * Run all validations and print summary
   * @returns {boolean} true if no errors
   */
  runValidation() {
    console.log(chalk.bold.magenta('\n' + '='.repeat(60)));
    console.log(chalk.bold.magenta('\uD83D\uDD0D Portfolio Configuration Validator'));
    console.log(chalk.bold.magenta('='.repeat(60)));
    console.log(`Content root: ${this.contentRoot}`);

    const validations = [
      () => this.validateMediaTypes(),
      () => this.validateCategories(),
      () => this.validateLanguages(),
      () => this.validateAppConfig(),
      () => this.validateDataFiles(),
      () => this.validateTranslations(),
      () => this.validateCrossReferences(),
    ];

    for (const validation of validations) {
      try { validation(); } catch (e) {
        this.addError(`Validation failed: ${e.message}`);
      }
    }

    // Print summary
    console.log(chalk.bold.magenta('\n' + '='.repeat(60)));
    console.log(chalk.bold.magenta('\uD83D\uDCDD Validation Summary'));
    console.log(chalk.bold.magenta('='.repeat(60) + '\n'));

    for (const msg of this.errors) console.log(msg);
    for (const msg of this.warnings) console.log(msg);
    for (const msg of this.info) console.log(msg);

    console.log(chalk.bold('\nResults:'));
    console.log(chalk.red(`  Errors:   ${this.errors.length}`));
    console.log(chalk.yellow(`  Warnings: ${this.warnings.length}`));
    console.log(chalk.blue(`  Info:     ${this.info.length}`));

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.bold.green('\n\u2713 All validations passed! Your configuration is perfect! \uD83C\uDF89\n'));
      return true;
    } else if (this.errors.length === 0) {
      console.log(chalk.bold.green('\n\u2713 No critical errors found (warnings can be addressed later)\n'));
      return true;
    } else {
      console.log(chalk.bold.red(`\n\u2717 Validation failed with ${this.errors.length} error(s)\n`));
      return false;
    }
  }
}

/**
 * Run validation from CLI (replaces validate_config.py main())
 * @param {string} contentPath - path to portfolio content directory
 * @returns {boolean} true if validation passed
 */
function runValidation(contentPath) {
  const validator = new ConfigValidator(contentPath);
  return validator.runValidation();
}

module.exports = { ConfigValidator, runValidation };
