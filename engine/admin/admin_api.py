from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sys
import json

# Get user data directories from environment variables
# These will be set by the npm admin script
USER_DATA_DIR = os.environ.get('DATA_DIR', '../../data')
USER_CONFIG_DIR = os.environ.get('CONFIG_DIR', '../../config')
USER_LANG_DIR = os.environ.get('LANG_DIR', '../../lang')
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

if __name__ == '__main__':
    print(f"🔧 Admin API starting...")
    print(f"   Data dir: {os.path.abspath(USER_DATA_DIR)}")
    print(f"   Config dir: {os.path.abspath(USER_CONFIG_DIR)}")
    print(f"   Lang dir: {os.path.abspath(USER_LANG_DIR)}")
    print(f"   API Port: {PORT}")
    print(f"\n✨ Admin API ready at: http://localhost:{PORT}/api/\n")

    app.run(host='0.0.0.0', port=PORT, debug=True)
