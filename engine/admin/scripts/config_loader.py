"""
Configuration Loader for Backend
Loads all configuration files and makes them available to Python scripts
"""

import json
import os
from pathlib import Path


class ConfigLoader:
    """Centralized configuration loader"""

    def __init__(self, content_root=None):
        if content_root is None:
            content_root = os.environ.get('PORTFOLIO_CONTENT_ROOT', '.')
        
        self.content_root = Path(content_root).resolve()
        self.config_dir = self.content_root / 'config'
        self.data_dir = self.content_root / 'data'
        self.lang_dir = self.content_root / 'lang'
        
        self.app_config = None
        self.languages_config = None
        self.categories_config = None
        self.media_types_config = None

    def load_all(self):
        """Load all configuration files"""
        try:
            # Ensure directories exist
            for d in [self.config_dir, self.data_dir, self.lang_dir]:
                if not d.exists():
                    try:
                        os.makedirs(d)
                    except OSError:
                        pass # Might be read-only or we just can't create it

            with open(self.config_dir / 'app.json', 'r', encoding='utf-8') as f:
                self.app_config = json.load(f)

            with open(self.config_dir / 'languages.json', 'r', encoding='utf-8') as f:
                self.languages_config = json.load(f)

            with open(self.config_dir / 'categories.json', 'r', encoding='utf-8') as f:
                self.categories_config = json.load(f)

            with open(self.config_dir / 'media-types.json', 'r', encoding='utf-8') as f:
                self.media_types_config = json.load(f)

            print(f'✅ Configuration loaded from {self.content_root}')
            return True
        except Exception as e:
            print(f'❌ Failed to load configuration from {self.content_root}: {e}')
            return False

    # ... (getters) ...

    def get_category_data_file(self, category_id):
        """Get absolute data file path for a category"""
        cat = self.get_content_type(category_id)
        filename = f'{category_id}.json'
        if cat and 'dataFile' in cat:
            # If dataFile is specified, use it (removing data/ prefix if present to avoid doubling)
            filename = cat['dataFile'].replace('data/', '')
        
        return str(self.data_dir / filename)

    def get_port(self):
        """Get API port"""
        return self.app_config.get('api', {}).get('port', 5001)

    def get_host(self):
        """Get API host"""
        return self.app_config.get('api', {}).get('host', '127.0.0.1')

    def get_language_codes(self):
        """Get list of supported language codes"""
        return [lang['code'] for lang in self.languages_config.get('supportedLanguages', [])]

    def get_default_language(self):
        """Get default language code"""
        return self.languages_config.get('defaultLanguage', 'en')

    def get_content_types(self):
        """Get all content type configurations (new name for categories)"""
        return self.categories_config.get('contentTypes', self.categories_config.get('categories', []))

    def get_categories(self):
        """Get all category configurations (legacy method, now returns content types)"""
        return self.get_content_types()

    def get_content_type(self, content_type_id):
        """Get specific content type configuration"""
        for ct in self.get_content_types():
            if ct['id'] == content_type_id:
                return ct
        return None

    def get_category(self, category_id):
        """Get specific category configuration (legacy method)"""
        return self.get_content_type(category_id)

    def get_category_data_file(self, category_id):
        """Get absolute data file path for a category"""
        cat = self.get_content_type(category_id)
        filename = f'{category_id}.json'
        if cat and 'dataFile' in cat:
            # If dataFile is specified, ensure it's relative to data_dir
            # We strip 'data/' prefix if it was hardcoded in the config
            clean_name = cat['dataFile'].replace('data/', '')
            return str(self.data_dir / clean_name)
        return str(self.data_dir / filename)

    def get_category_map(self):
        """Get mapping of category ID to absolute data file path"""
        return {cat['id']: self.get_category_data_file(cat['id']) for cat in self.get_content_types()}

    def get_gallery_categories(self):
        """Get list of categories that support galleries (based on media type)"""
        gallery_types = []
        for ct in self.get_content_types():
            media_type = self.get_media_type(ct.get('mediaType'))
            if media_type and media_type.get('supportsGallery', False):
                gallery_types.append(ct['id'])
        return gallery_types

    def get_media_types(self):
        """Get all media type configurations"""
        if self.media_types_config is None:
            return []
        return self.media_types_config.get('mediaTypes', [])

    def get_media_type(self, media_type_id):
        """Get specific media type configuration"""
        for mt in self.get_media_types():
            if mt['id'] == media_type_id:
                return mt
        return None

    def get_content_types_by_media(self, media_type_id):
        """Get all content types that use a specific media type"""
        return [ct for ct in self.get_content_types() if ct.get('mediaType') == media_type_id]

    def get_github_config(self):
        """Get GitHub configuration"""
        return self.app_config.get('github', {})

    def get_github_repo(self):
        """Get full GitHub repository path (username/repo)"""
        github = self.get_github_config()
        username = github.get('username', '')
        repo_name = github.get('repoName', '')
        if username and repo_name:
            return f"{username}/{repo_name}"
        # Fallback to old 'repo' key if it exists
        return github.get('repo', 'yourusername/retro-portfolio')

    def get_path(self, path_key):
        """Get configured path (dataDir, langDir, etc.)"""
        return self.app_config.get('paths', {}).get(path_key, path_key)

    def create_multilingual_object(self, value):
        """Create a multilingual object with all supported languages"""
        return {code: value for code in self.get_language_codes()}

    def get_setting(self, path):
        """Get app setting by dot-notation path (e.g., 'app.name')"""
        parts = path.split('.')
        value = self.app_config
        for part in parts:
            if isinstance(value, dict):
                value = value.get(part)
            else:
                return None
        return value


# Global instance
config = ConfigLoader()
