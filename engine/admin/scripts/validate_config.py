#!/usr/bin/env python3
"""
Portfolio Configuration Validator
Validates all config files, data files, and translations for consistency and correctness.
"""

import sys
import os
import json
from pathlib import Path
from typing import Dict, List, Tuple, Any

# Ensure the current directory is in the path so we can import local modules
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from config_loader import ConfigLoader

# ANSI color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


class ConfigValidator:
    def __init__(self, content_root=None):
        self.content_root = Path(content_root) if content_root else Path('.')
        self.config_dir = self.content_root / 'config'
        self.data_dir = self.content_root / 'data'
        self.lang_dir = self.content_root / 'lang'

        self.errors = []
        self.warnings = []
        self.info = []

        self.config_loader = ConfigLoader(content_root)

    def add_error(self, message: str):
        """Add an error message"""
        self.errors.append(f"{Colors.FAIL}✗ ERROR:{Colors.ENDC} {message}")

    def add_warning(self, message: str):
        """Add a warning message"""
        self.warnings.append(f"{Colors.WARNING}⚠ WARNING:{Colors.ENDC} {message}")

    def add_info(self, message: str):
        """Add an info message"""
        self.info.append(f"{Colors.OKBLUE}ℹ INFO:{Colors.ENDC} {message}")

    def validate_json_file(self, file_path: Path) -> Tuple[bool, Any]:
        """Validate that a file contains valid JSON"""
        if not file_path.exists():
            self.add_error(f"File not found: {file_path}")
            return False, None

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return True, data
        except json.JSONDecodeError as e:
            self.add_error(f"Invalid JSON in {file_path.name}: {e}")
            return False, None
        except Exception as e:
            self.add_error(f"Error reading {file_path.name}: {e}")
            return False, None

    def validate_media_types(self) -> bool:
        """Validate media-types.json"""
        print(f"\n{Colors.HEADER}📋 Validating Media Types...{Colors.ENDC}")

        file_path = self.config_dir / 'media-types.json'
        valid, data = self.validate_json_file(file_path)

        if not valid:
            return False

        if 'mediaTypes' not in data:
            self.add_error("media-types.json missing 'mediaTypes' array")
            return False

        media_types = data['mediaTypes']
        required_fields = ['id', 'name', 'icon', 'viewer', 'acceptedFormats']

        for i, mt in enumerate(media_types):
            for field in required_fields:
                if field not in mt:
                    self.add_error(f"Media type #{i} missing required field: {field}")

            # Validate acceptedFormats is an array
            if 'acceptedFormats' in mt and not isinstance(mt['acceptedFormats'], list):
                self.add_error(f"Media type '{mt.get('id', i)}': acceptedFormats must be an array")

        print(f"{Colors.OKGREEN}✓ Found {len(media_types)} media types{Colors.ENDC}")
        return True

    def validate_categories(self) -> bool:
        """Validate categories.json (content types)"""
        print(f"\n{Colors.HEADER}📁 Validating Content Types...{Colors.ENDC}")

        file_path = self.config_dir / 'categories.json'
        valid, data = self.validate_json_file(file_path)

        if not valid:
            return False

        # Support both 'contentTypes' and 'categories' keys
        content_types = data.get('contentTypes', data.get('categories', []))

        if not content_types:
            self.add_error("categories.json missing content types array")
            return False

        required_fields = ['id', 'name', 'icon', 'mediaType', 'dataFile']

        for i, ct in enumerate(content_types):
            ct_id = ct.get('id', f'#{i}')

            for field in required_fields:
                if field not in ct:
                    self.add_error(f"Content type '{ct_id}' missing required field: {field}")

            # Validate fields structure
            if 'fields' in ct:
                if 'required' not in ct['fields']:
                    self.add_warning(f"Content type '{ct_id}': missing 'fields.required' array")
                if 'optional' not in ct['fields']:
                    self.add_warning(f"Content type '{ct_id}': missing 'fields.optional' array")

        print(f"{Colors.OKGREEN}✓ Found {len(content_types)} content types{Colors.ENDC}")
        return True

    def validate_languages(self) -> bool:
        """Validate languages.json"""
        print(f"\n{Colors.HEADER}🌐 Validating Languages...{Colors.ENDC}")

        file_path = self.config_dir / 'languages.json'
        valid, data = self.validate_json_file(file_path)

        if not valid:
            return False

        if 'supportedLanguages' not in data:
            self.add_error("languages.json missing 'supportedLanguages' array")
            return False

        if 'defaultLanguage' not in data:
            self.add_error("languages.json missing 'defaultLanguage' field")
            return False

        languages = data['supportedLanguages']
        required_fields = ['code', 'name']

        for lang in languages:
            for field in required_fields:
                if field not in lang:
                    self.add_error(f"Language entry missing required field: {field}")

        print(f"{Colors.OKGREEN}✓ Found {len(languages)} supported languages{Colors.ENDC}")
        return True

    def validate_app_config(self) -> bool:
        """Validate app.json"""
        print(f"\n{Colors.HEADER}⚙️  Validating App Configuration...{Colors.ENDC}")

        file_path = self.config_dir / 'app.json'
        valid, data = self.validate_json_file(file_path)

        if not valid:
            return False

        # Check recommended fields
        recommended_fields = ['name', 'author', 'api', 'github']

        for field in recommended_fields:
            if field not in data:
                self.add_warning(f"app.json missing recommended field: {field}")

        print(f"{Colors.OKGREEN}✓ App configuration valid{Colors.ENDC}")
        return True

    def validate_data_files(self) -> bool:
        """Validate all data files match category definitions"""
        print(f"\n{Colors.HEADER}📊 Validating Data Files...{Colors.ENDC}")

        # Load config first
        if not self.config_loader.load_all():
            self.add_error("Failed to load configuration")
            return False

        content_types = self.config_loader.get_content_types()

        for ct in content_types:
            ct_id = ct['id']
            data_file = self.config_loader.get_category_data_file(ct_id)

            # Check if data file exists
            if not os.path.exists(data_file):
                self.add_warning(f"Data file not found for '{ct_id}': {data_file}")
                continue

            # Validate JSON
            valid, data = self.validate_json_file(Path(data_file))
            if not valid:
                continue

            # Data can be array or object with 'items' key
            if isinstance(data, dict) and 'items' in data:
                items = data['items']
            elif isinstance(data, list):
                items = data
            else:
                self.add_error(f"Data file '{ct_id}' must be an array or object with 'items' key")
                continue

            # Validate required fields in each item
            required_fields = ct.get('fields', {}).get('required', ['title', 'url'])

            for i, item in enumerate(items):
                for field in required_fields:
                    if field not in item:
                        self.add_warning(f"{ct_id}.json item #{i}: missing required field '{field}'")

                # Check for ID field (recommended)
                if 'id' not in item:
                    self.add_info(f"{ct_id}.json item #{i}: missing 'id' field (recommended)")

            print(f"{Colors.OKGREEN}✓ {ct['icon']} {ct['name']}: {len(items)} items{Colors.ENDC}")

        return True

    def validate_translations(self) -> bool:
        """Validate translation files"""
        print(f"\n{Colors.HEADER}🔤 Validating Translations...{Colors.ENDC}")

        # Get language codes
        lang_codes = self.config_loader.get_language_codes()

        if not lang_codes:
            self.add_error("No language codes found")
            return False

        # Load all translation files
        translations = {}
        for code in lang_codes:
            lang_file = self.lang_dir / f'{code}.json'
            valid, data = self.validate_json_file(lang_file)

            if valid:
                translations[code] = data
                print(f"{Colors.OKGREEN}✓ {code}.json: {len(data)} keys{Colors.ENDC}")
            else:
                self.add_error(f"Failed to load translation file: {code}.json")

        # Check for missing keys across languages
        if len(translations) > 1:
            all_keys = set()
            for keys in translations.values():
                all_keys.update(keys.keys())

            for code, keys in translations.items():
                missing = all_keys - set(keys.keys())
                if missing:
                    self.add_warning(f"Language '{code}' missing {len(missing)} translation keys")
                    if len(missing) <= 5:
                        for key in missing:
                            self.add_info(f"  Missing in '{code}': {key}")

        return True

    def validate_cross_references(self) -> bool:
        """Validate cross-references between configs"""
        print(f"\n{Colors.HEADER}🔗 Validating Cross-References...{Colors.ENDC}")

        content_types = self.config_loader.get_content_types()
        media_types = self.config_loader.get_media_types()

        media_type_ids = {mt['id'] for mt in media_types}

        for ct in content_types:
            # Check if mediaType exists
            if ct.get('mediaType') not in media_type_ids:
                self.add_error(f"Content type '{ct['id']}' references unknown media type: {ct.get('mediaType')}")

        print(f"{Colors.OKGREEN}✓ Cross-references valid{Colors.ENDC}")
        return True

    def run_validation(self) -> bool:
        """Run all validations"""
        print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*60}{Colors.ENDC}")
        print(f"{Colors.BOLD}{Colors.HEADER}🔍 Portfolio Configuration Validator{Colors.ENDC}")
        print(f"{Colors.BOLD}{Colors.HEADER}{'='*60}{Colors.ENDC}")
        print(f"Content root: {self.content_root.absolute()}")

        # Run all validations
        validations = [
            self.validate_media_types,
            self.validate_categories,
            self.validate_languages,
            self.validate_app_config,
            self.validate_data_files,
            self.validate_translations,
            self.validate_cross_references
        ]

        for validation in validations:
            try:
                validation()
            except Exception as e:
                self.add_error(f"Validation failed: {e}")

        # Print summary
        print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*60}{Colors.ENDC}")
        print(f"{Colors.BOLD}{Colors.HEADER}📝 Validation Summary{Colors.ENDC}")
        print(f"{Colors.BOLD}{Colors.HEADER}{'='*60}{Colors.ENDC}\n")

        # Print all messages
        for msg in self.errors:
            print(msg)
        for msg in self.warnings:
            print(msg)
        for msg in self.info:
            print(msg)

        # Print totals
        print(f"\n{Colors.BOLD}Results:{Colors.ENDC}")
        print(f"{Colors.FAIL}  Errors:   {len(self.errors)}{Colors.ENDC}")
        print(f"{Colors.WARNING}  Warnings: {len(self.warnings)}{Colors.ENDC}")
        print(f"{Colors.OKBLUE}  Info:     {len(self.info)}{Colors.ENDC}")

        if len(self.errors) == 0 and len(self.warnings) == 0:
            print(f"\n{Colors.BOLD}{Colors.OKGREEN}✓ All validations passed! Your configuration is perfect! 🎉{Colors.ENDC}\n")
            return True
        elif len(self.errors) == 0:
            print(f"\n{Colors.BOLD}{Colors.OKGREEN}✓ No critical errors found (warnings can be addressed later){Colors.ENDC}\n")
            return True
        else:
            print(f"\n{Colors.BOLD}{Colors.FAIL}✗ Validation failed with {len(self.errors)} error(s){Colors.ENDC}\n")
            return False


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Validate portfolio configuration files')
    parser.add_argument('--path', help='Path to portfolio content directory', default='.')

    args = parser.parse_args()

    validator = ConfigValidator(args.path)
    success = validator.run_validation()

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
