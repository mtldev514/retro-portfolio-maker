from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sys
import json
import subprocess
import requests as http_requests

# Get user data directories from environment variables
# These will be set by the npm admin script
USER_DATA_DIR = os.environ.get('DATA_DIR', '../../data')
USER_CONFIG_DIR = os.environ.get('CONFIG_DIR', '../../config')
USER_LANG_DIR = os.environ.get('LANG_DIR', '../../lang')
USER_STYLES_DIR = os.environ.get('STYLES_DIR', '../../styles')
PROJECT_DIR = os.environ.get('PROJECT_DIR', os.path.dirname(os.path.abspath(USER_DATA_DIR)))
PORT = int(os.environ.get('PORT', 5001))

# Add scripts directory to path
SCRIPT_DIR = os.path.join(os.path.dirname(__file__), 'scripts')
sys.path.append(SCRIPT_DIR)

# Import manager and config loader
import manager
from config_loader import config

# Override config paths to use user directories
config.CONFIG_DIR = USER_CONFIG_DIR
config.DATA_DIR = USER_DATA_DIR
config.LANG_DIR = USER_LANG_DIR

# Load configuration from user directories
config.load_all()

app = Flask(__name__,
            static_folder='.',
            static_url_path='')
CORS(app)

UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'temp_uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    title = request.form.get('title')
    category = request.form.get('category')
    medium = request.form.get('medium')
    genre = request.form.get('genre')
    description = request.form.get('description')
    created = request.form.get('created')

    if not title or not category:
        return jsonify({"error": "Title and Category are required"}), 400

    # Save file temporarily
    temp_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(temp_path)

    try:
        # Use manager logic to upload to Cloudinary and update JSON
        result = manager.upload_and_save(
            temp_path,
            title,
            category,
            medium=medium,
            genre=genre,
            description=description,
            created=created
        )
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        # Cleanup temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.route('/api/upload-bulk', methods=['POST'])
def upload_bulk():
    """Handle bulk file uploads"""
    results = []
    errors = []
    file_keys = [k for k in request.files if k.startswith('file_')]
    file_keys.sort(key=lambda k: int(k.split('_')[1]))

    for key in file_keys:
        idx = key.split('_')[1]
        file = request.files[key]
        title = request.form.get(f'title_{idx}', file.filename)
        category = request.form.get(f'category_{idx}')
        medium = request.form.get(f'medium_{idx}')
        genre = request.form.get(f'genre_{idx}')
        description = request.form.get(f'description_{idx}')
        created = request.form.get(f'created_{idx}')

        if not category:
            errors.append({"file": file.filename, "error": "Missing category"})
            continue

        temp_path = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(temp_path)

        try:
            result = manager.upload_and_save(
                temp_path, title, category,
                medium=medium, genre=genre,
                description=description, created=created
            )
            results.append({"file": file.filename, "success": True, "data": result})
        except Exception as e:
            errors.append({"file": file.filename, "error": str(e)})
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    return jsonify({
        "success": len(results),
        "errors": len(errors),
        "results": results,
        "errorDetails": errors
    })

@app.route('/api/content', methods=['GET'])
def get_all_content():
    """Get all content from all categories"""
    try:
        all_content = {}
        # List all JSON files in data directory
        if os.path.exists(USER_DATA_DIR):
            for filename in os.listdir(USER_DATA_DIR):
                if filename.endswith('.json'):
                    category = filename[:-5]  # Remove .json extension
                    data_file = os.path.join(USER_DATA_DIR, filename)
                    with open(data_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        # Support both {"items": [...]} and [...] formats
                        if isinstance(data, dict) and 'items' in data:
                            all_content[category] = data['items']
                        elif isinstance(data, list):
                            all_content[category] = data
                        else:
                            all_content[category] = []
        return jsonify(all_content)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/content/<category>', methods=['GET'])
def get_content(category):
    """Get all content for a category"""
    try:
        data_file = os.path.join(USER_DATA_DIR, f'{category}.json')
        if not os.path.exists(data_file):
            return jsonify({"items": []})

        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/content/<category>', methods=['POST'])
def save_content(category):
    """Save content for a category"""
    try:
        data = request.json
        data_file = os.path.join(USER_DATA_DIR, f'{category}.json')

        with open(data_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/translations/<lang>', methods=['GET'])
def get_translations(lang):
    """Get translations for a language"""
    try:
        lang_file = os.path.join(USER_LANG_DIR, f'{lang}.json')
        if not os.path.exists(lang_file):
            return jsonify({})

        with open(lang_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/translations/<lang>', methods=['POST'])
def save_translations(lang):
    """Save translations for a language"""
    try:
        data = request.json
        lang_file = os.path.join(USER_LANG_DIR, f'{lang}.json')

        with open(lang_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/config/<config_name>', methods=['GET'])
def get_config(config_name):
    """Get configuration"""
    try:
        config_file = os.path.join(USER_CONFIG_DIR, f'{config_name}.json')
        if not os.path.exists(config_file):
            return jsonify({})

        with open(config_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/config/<config_name>', methods=['POST'])
def save_config(config_name):
    """Save configuration"""
    try:
        data = request.json
        config_file = os.path.join(USER_CONFIG_DIR, f'{config_name}.json')

        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        # Reload config after save
        config.load_all()

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/content/delete', methods=['POST'])
def delete_content():
    """Delete content item from both cloud storage and JSON"""
    try:
        data = request.json
        category = data.get('category')
        item_id = data.get('id')

        if not category or not item_id:
            return jsonify({"error": "Category and ID are required"}), 400

        # Use manager's delete function
        result = manager.delete_item(category, item_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/content/update', methods=['POST'])
def update_content():
    """Update content item fields"""
    try:
        data = request.json
        category = data.get('category')
        item_id = data.get('id')
        updates = data.get('updates', {})

        if not category or not item_id:
            return jsonify({"error": "Category and ID are required"}), 400

        data_file = os.path.join(USER_DATA_DIR, f'{category}.json')
        if not os.path.exists(data_file):
            return jsonify({"error": f"Data file not found for category '{category}'"}), 404

        # Load existing data
        with open(data_file, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            items = json.loads(content) if content else []

        # Find and update the item
        item_found = False
        for item in items:
            item_title = item.get("title")
            if isinstance(item_title, dict):
                item_title = item_title.get("en", "")

            if item.get("id") == item_id or item_title == item_id:
                # Update fields
                for key, value in updates.items():
                    item[key] = value
                item_found = True
                break

        if not item_found:
            return jsonify({"error": f"Item '{item_id}' not found"}), 404

        # Save updated data
        with open(data_file, 'w', encoding='utf-8') as f:
            json.dump(items, f, indent=2, ensure_ascii=False)

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/content/move-to-pile', methods=['POST'])
def move_to_pile():
    """Move an item's images into another item's gallery (pile feature)"""
    try:
        data = request.json
        category = data.get('category')
        source_id = data.get('sourceId')
        target_id = data.get('targetId')

        if not all([category, source_id, target_id]):
            return jsonify({"error": "Category, sourceId, and targetId are required"}), 400

        data_file = os.path.join(USER_DATA_DIR, f'{category}.json')
        if not os.path.exists(data_file):
            return jsonify({"error": f"Data file not found for category '{category}'"}), 404

        # Load existing data
        with open(data_file, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            items = json.loads(content) if content else []

        source_item = None
        target_item = None
        remaining_items = []

        # Find source and target items
        for item in items:
            item_title = item.get("title")
            if isinstance(item_title, dict):
                item_title = item_title.get("en", "")

            item_identifier = item.get("id") or item_title

            if item_identifier == source_id:
                source_item = item
            elif item_identifier == target_id:
                target_item = item
                remaining_items.append(item)
            else:
                remaining_items.append(item)

        if not source_item or not target_item:
            return jsonify({"error": "Source or target item not found"}), 404

        # Move images from source to target's gallery
        if 'gallery' not in target_item:
            target_item['gallery'] = []

        # Add source's main URL (if it has one)
        if 'url' in source_item:
            target_item['gallery'].append(source_item['url'])

        # Add source's gallery images
        if 'gallery' in source_item:
            target_item['gallery'].extend(source_item['gallery'])

        # Save updated data (without source item)
        with open(data_file, 'w', encoding='utf-8') as f:
            json.dump(remaining_items, f, indent=2, ensure_ascii=False)

        return jsonify({
            "success": True,
            "targetGalleryCount": len(target_item['gallery'])
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/styles', methods=['GET'])
def get_styles():
    """Get styles.json (theme registry)"""
    try:
        styles_file = os.path.join(USER_STYLES_DIR, 'styles.json')
        if not os.path.exists(styles_file):
            return jsonify({})

        with open(styles_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/styles', methods=['POST'])
def save_styles():
    """Save styles.json (theme registry)"""
    try:
        data = request.json
        styles_file = os.path.join(USER_STYLES_DIR, 'styles.json')
        os.makedirs(USER_STYLES_DIR, exist_ok=True)

        with open(styles_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/styles/themes', methods=['GET'])
def list_style_files():
    """List all CSS theme files in the styles directory"""
    try:
        if not os.path.exists(USER_STYLES_DIR):
            return jsonify({"files": []})

        css_files = [f for f in os.listdir(USER_STYLES_DIR) if f.endswith('.css')]
        css_files.sort()
        return jsonify({"files": css_files})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/github/sync', methods=['POST'])
def sync_github():
    """Fetch repositories from GitHub and save to projects.json"""
    try:
        github_config = config.get_github_config()
        username = github_config.get('username')

        if not username:
            return jsonify({"success": False, "error": "No GitHub username configured in app.json"}), 400

        github_token = os.environ.get('GITHUB_TOKEN')
        headers = {"Accept": "application/vnd.github.v3+json"}
        if github_token:
            headers["Authorization"] = f"token {github_token}"

        # Fetch repos — authenticated endpoint includes private repos
        if github_token:
            api_url = "https://api.github.com/user/repos?per_page=100&type=owner"
        else:
            api_url = f"https://api.github.com/users/{username}/repos?per_page=100"

        resp = http_requests.get(api_url, headers=headers)
        resp.raise_for_status()
        repos = resp.json()

        # Filter out forks and archived repos
        repos = [r for r in repos if not r.get('fork') and not r.get('archived')]

        # Map to portfolio items
        lang_codes = config.get_language_codes()
        items = []
        for repo in repos:
            name = repo.get('name', '')
            desc = repo.get('description') or name

            title = {code: name for code in lang_codes}
            description = {code: desc for code in lang_codes}

            item = {
                "id": f"github_{name}",
                "title": title,
                "url": repo.get('html_url', ''),
                "description": description,
                "date": (repo.get('pushed_at') or repo.get('created_at', ''))[:10],
                "created": (repo.get('created_at') or '')[:10],
                "topics": repo.get('topics', []),
                "language": repo.get('language'),
                "stars": repo.get('stargazers_count', 0),
                "isPrivate": repo.get('private', False)
            }
            items.append(item)

        # Save to projects.json
        projects_file = os.path.join(USER_DATA_DIR, 'projects.json')
        with open(projects_file, 'w', encoding='utf-8') as f:
            json.dump(items, f, indent=2, ensure_ascii=False)

        return jsonify({"success": True, "count": len(items)})
    except http_requests.exceptions.RequestException as e:
        return jsonify({"success": False, "error": f"GitHub API error: {str(e)}"}), 502
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/git/commit-push', methods=['POST'])
def git_commit_push():
    """Commit and push changes to GitHub"""
    try:
        data = request.json or {}
        message = data.get('message', 'Update from admin panel')

        # Check if PROJECT_DIR is a git repo
        git_dir = os.path.join(PROJECT_DIR, '.git')
        if not os.path.exists(git_dir):
            return jsonify({"success": False, "error": "Project directory is not a git repository"}), 400

        # Stage data, config, lang, and styles directories
        subprocess.run(
            ['git', 'add', 'data/', 'config/', 'lang/', 'styles/'],
            cwd=PROJECT_DIR, check=True, capture_output=True, text=True
        )

        # Check if there are staged changes
        status = subprocess.run(
            ['git', 'diff', '--cached', '--quiet'],
            cwd=PROJECT_DIR, capture_output=True
        )
        if status.returncode == 0:
            return jsonify({"success": True, "message": "No changes to commit"})

        # Commit
        subprocess.run(
            ['git', 'commit', '-m', message],
            cwd=PROJECT_DIR, check=True, capture_output=True, text=True
        )

        # Push
        push_result = subprocess.run(
            ['git', 'push'],
            cwd=PROJECT_DIR, check=True, capture_output=True, text=True
        )

        return jsonify({"success": True, "message": "Changes committed and pushed"})
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.strip() if e.stderr else str(e)
        return jsonify({"success": False, "error": f"Git error: {error_msg}"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/content/item', methods=['GET'])
def get_single_item():
    """Get a single content item by category and ID"""
    category = request.args.get('category')
    item_id = request.args.get('id')

    if not category or not item_id:
        return jsonify({"error": "Category and ID are required"}), 400

    data_file = os.path.join(USER_DATA_DIR, f'{category}.json')
    if not os.path.exists(data_file):
        return jsonify({"error": f"Invalid category or file not found: {category}"}), 404

    with open(data_file, 'r', encoding='utf-8') as f:
        data_list = json.load(f)

    for item in data_list:
        item_title = item.get("title")
        if isinstance(item_title, dict):
            item_title = item_title.get("en", "")
        if item.get('id') == item_id or item_title == item_id:
            return jsonify({"success": True, "item": item, "category": category})

    return jsonify({"error": "Item not found"}), 404

@app.route('/api/content/extract-from-pile', methods=['POST'])
def extract_from_pile():
    """Extract a single image from a pile's gallery and create a new standalone item."""
    import time

    data = request.json
    category = data.get('category')
    source_id = data.get('sourceId')
    image_url = data.get('imageUrl')
    image_index = data.get('imageIndex')
    custom_title = data.get('customTitle')
    custom_description = data.get('customDescription', '')

    if not category or not source_id or image_url is None or image_index is None:
        return jsonify({"error": "category, sourceId, imageUrl, and imageIndex are required"}), 400

    data_file = os.path.join(USER_DATA_DIR, f'{category}.json')
    if not os.path.exists(data_file):
        return jsonify({"error": f"Invalid category: {category}"}), 404

    with open(data_file, 'r', encoding='utf-8') as f:
        data_list = json.load(f)

    source_item = None
    for item in data_list:
        item_title = item.get("title")
        if isinstance(item_title, dict):
            item_title = item_title.get("en", "")
        if item.get('id') == source_id or item_title == source_id:
            source_item = item
            break

    if not source_item:
        return jsonify({"error": "Source item not found"}), 404

    if 'gallery' not in source_item or image_index >= len(source_item['gallery']):
        return jsonify({"error": "Invalid image index"}), 400

    # Remove the image from the gallery
    extracted_url = source_item['gallery'].pop(image_index)

    # Remove metadata for this image if it exists
    if 'galleryMetadata' in source_item and extracted_url in source_item['galleryMetadata']:
        del source_item['galleryMetadata'][extracted_url]

    # Create a new item with the extracted image
    new_id = f"{category}_extracted_{int(time.time())}"

    if custom_title:
        new_title = custom_title
    else:
        source_title = source_item.get('title', {})
        if isinstance(source_title, dict):
            source_title_en = source_title.get('en', 'Untitled')
        else:
            source_title_en = source_title or 'Untitled'
        new_title = f"Photo {image_index + 1} from {source_title_en}"

    # Use config's language-aware multilingual object creation
    new_item = {
        "id": new_id,
        "title": config.create_multilingual_object(new_title),
        "url": extracted_url,
        "date": source_item.get('date', time.strftime('%Y-%m-%d')),
        "created": time.strftime('%Y-%m-%d'),
        "description": config.create_multilingual_object(custom_description)
    }

    data_list.append(new_item)

    with open(data_file, 'w', encoding='utf-8') as f:
        json.dump(data_list, f, indent=2, ensure_ascii=False)

    return jsonify({
        "success": True,
        "newTitle": new_title,
        "newId": new_id
    })

@app.route('/api/content/add-to-pile', methods=['POST'])
def add_to_pile():
    """Move a single image from one pile's gallery to another pile's gallery."""
    data = request.json
    category = data.get('category')
    source_id = data.get('sourceId')
    target_id = data.get('targetId')
    image_url = data.get('imageUrl')
    image_index = data.get('imageIndex')

    if not category or not source_id or not target_id or image_url is None or image_index is None:
        return jsonify({"error": "category, sourceId, targetId, imageUrl, and imageIndex are required"}), 400

    data_file = os.path.join(USER_DATA_DIR, f'{category}.json')
    if not os.path.exists(data_file):
        return jsonify({"error": f"Invalid category: {category}"}), 404

    with open(data_file, 'r', encoding='utf-8') as f:
        data_list = json.load(f)

    source_item = None
    target_item = None
    for item in data_list:
        item_title = item.get("title")
        if isinstance(item_title, dict):
            item_title = item_title.get("en", "")
        item_identifier = item.get("id") or item_title
        if item_identifier == source_id:
            source_item = item
        if item_identifier == target_id:
            target_item = item

    if not source_item:
        return jsonify({"error": "Source item not found"}), 404
    if not target_item:
        return jsonify({"error": "Target item not found"}), 404

    if 'gallery' not in source_item or image_index >= len(source_item['gallery']):
        return jsonify({"error": "Invalid image index"}), 400

    # Remove the image from source gallery
    extracted_url = source_item['gallery'].pop(image_index)

    # Add to target gallery
    if 'gallery' not in target_item:
        target_item['gallery'] = []
    target_item['gallery'].append(extracted_url)

    with open(data_file, 'w', encoding='utf-8') as f:
        json.dump(data_list, f, indent=2, ensure_ascii=False)

    return jsonify({
        "success": True,
        "targetGalleryCount": len(target_item.get('gallery', []))
    })

if __name__ == '__main__':
    print(f"🔧 Admin API starting...")
    print(f"   Data dir: {os.path.abspath(USER_DATA_DIR)}")
    print(f"   Config dir: {os.path.abspath(USER_CONFIG_DIR)}")
    print(f"   Lang dir: {os.path.abspath(USER_LANG_DIR)}")
    print(f"   Styles dir: {os.path.abspath(USER_STYLES_DIR)}")
    print(f"   API Port: {PORT}")
    print(f"\n✨ Admin API ready at: http://localhost:{PORT}/api/\n")

    app.run(host='0.0.0.0', port=PORT, debug=True)
