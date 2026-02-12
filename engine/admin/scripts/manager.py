import os
import glob
import json
from pathlib import Path
import argparse
import re
import time
import mimetypes
from pathlib import Path
from datetime import datetime
import cloudinary
import cloudinary.uploader
import requests
from dotenv import load_dotenv
from config_loader import config

# Load environment variables
load_dotenv()

# Load configuration
config.load_all()

# Cloudinary Configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# Load JSON_MAP from configuration
JSON_MAP = config.get_category_map()

# GitHub Releases Configuration (for audio/video that Cloudinary free plan rejects)
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_REPO = config.get_github_repo()  # Returns "username/repoName"
github_config = config.get_github_config()
RELEASE_TAG = github_config.get('mediaReleaseTag', 'media')
GITHUB_UPLOAD_CATEGORIES = set(github_config.get('uploadCategories', ['music']))

MEDIA_CONTENT_TYPES = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
}


def get_or_create_release():
    """Get existing 'media' release or create one for hosting audio/video assets."""
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }
    # Try to get existing release by tag
    r = requests.get(
        f"https://api.github.com/repos/{GITHUB_REPO}/releases/tags/{RELEASE_TAG}",
        headers=headers,
    )
    if r.status_code == 200:
        return r.json()

    # Create a new release
    print(f"Creating GitHub Release '{RELEASE_TAG}'...")
    r = requests.post(
        f"https://api.github.com/repos/{GITHUB_REPO}/releases",
        headers=headers,
        json={
            "tag_name": RELEASE_TAG,
            "name": "Media Assets",
            "body": "Audio and video files for the portfolio.",
            "draft": False,
            "prerelease": False,
        },
    )
    r.raise_for_status()
    return r.json()


def upload_to_github_release(file_path, filename):
    """Upload a file as an asset to the 'media' GitHub Release.
    Returns the browser_download_url for the uploaded asset."""
    release = get_or_create_release()
    upload_url = release["upload_url"].replace("{?name,label}", "")

    # Determine content type from extension
    ext = os.path.splitext(filename)[1].lower()
    content_type = MEDIA_CONTENT_TYPES.get(ext)
    if not content_type:
        content_type, _ = mimetypes.guess_type(filename)
        if not content_type:
            content_type = "application/octet-stream"

    # Prepend timestamp to avoid duplicate filename collisions
    unique_filename = f"{int(time.time())}_{filename}"

    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Content-Type": content_type,
        "Accept": "application/vnd.github.v3+json",
    }

    print(f"Uploading asset '{unique_filename}' ({content_type})...")
    with open(file_path, "rb") as f:
        r = requests.post(
            f"{upload_url}?name={unique_filename}",
            headers=headers,
            data=f,
        )
    r.raise_for_status()
    return r.json()["browser_download_url"]

def upload_single(file_path, category):
    """Upload a single file to the appropriate service and return its URL."""
    if category in GITHUB_UPLOAD_CATEGORIES and GITHUB_TOKEN:
        print(f"Uploading {file_path} to GitHub Releases...")
        original_filename = os.path.basename(file_path)
        url = upload_to_github_release(file_path, original_filename)
    else:
        resource_type = "auto"
        if category == "video":
            resource_type = "video"
        print(f"Uploading {file_path} to Cloudinary...")
        upload_result = cloudinary.uploader.upload(
            file_path,
            folder=f"portfolio/{category}",
            resource_type=resource_type
        )
        url = upload_result.get("secure_url")
    print(f"Success! URL: {url}")
    return url


def upload_and_save(file_path, title, category, medium=None, genre=None, description=None, created=None, pile=False):
    """Core logic to upload file(s) and update JSON database.
    When pile=True and file_path is a directory, all images inside are uploaded
    as a single gallery item (first image = cover, rest = gallery array)."""
    print(f"--- Processing: {title} ({category}) ---")

    gallery_urls = []

    if pile and os.path.isdir(file_path):
        # Pile mode: upload all images in the directory
        IMAGE_EXTS = ("*.jpg", "*.jpeg", "*.png", "*.webp", "*.gif", "*.tiff", "*.bmp")
        files = []
        for ext in IMAGE_EXTS:
            files.extend(glob.glob(os.path.join(file_path, ext)))
            files.extend(glob.glob(os.path.join(file_path, ext.upper())))
        files = sorted(set(files))  # deduplicate and sort alphabetically

        if not files:
            raise ValueError(f"No image files found in '{file_path}'")

        print(f"Pile mode: found {len(files)} images")
        urls = []
        for f in files:
            urls.append(upload_single(f, category))

        media_url = urls[0]  # first image is the cover
        gallery_urls = urls[1:]  # rest go into gallery
    else:
        # Single file upload
        media_url = upload_single(file_path, category)

    # Determine JSON file
    json_path = JSON_MAP.get(category)
    if not json_path:
        raise ValueError(f"Category '{category}' is invalid.")

    # Load existing data
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                data = json.loads(content) if content else []
        except json.JSONDecodeError:
            data = []
    else:
        data = []

    # Create new entry with multilingual fields
    def make_multilingual(value):
        """Wrap a single-language value as a multilingual object."""
        if not value:
            return None
        return config.create_multilingual_object(value)

    new_entry = {
        "id": f"{category}_{int(datetime.now().timestamp())}",
        "title": make_multilingual(title),
        "url": media_url,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "created": created if created else datetime.now().strftime("%Y-%m-%d")
    }
    if gallery_urls:
        new_entry["gallery"] = gallery_urls
    if medium:
        new_entry["medium"] = make_multilingual(medium)
    if genre:
        new_entry["genre"] = make_multilingual(genre)
    if description:
        new_entry["description"] = make_multilingual(description)

    data.append(new_entry)

    # Save back to JSON
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print(f"Updated {json_path}")

    # Update "Last Updated" globally
    update_site_timestamp()
    return new_entry

def update_site_timestamp():
    """Updates the 'Last Updated' string in all HTML files."""
    now = datetime.now().strftime("%d %b %Y")
    
    # Check both current directory and content root for index.html
    possible_files = [
        "index.html",
        config.content_root / "index.html"
    ]
    
    for file_path in possible_files:
        path = Path(file_path)
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                # Check if it has the timestamp span
                if 'Last Updated:</span>' in content:
                    new_content = re.sub(r'Last Updated:</span> \d{1,2} \w{3} \d{4}', f'Last Updated:</span> {now}', content)
                    
                    with open(path, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"Updated timestamp in {path}")
            except Exception as e:
                print(f"Failed to update timestamp in {path}: {e}")

def save_from_url(url, title, category, medium=None, genre=None, description=None, created=None):
    """Save a media entry using a direct URL (no Cloudinary upload).
    Used for audio files hosted on Internet Archive, GitHub Releases, etc."""
    print(f"--- Saving from URL: {title} ({category}) ---")

    json_path = JSON_MAP.get(category)
    if not json_path:
        raise ValueError(f"Category '{category}' is invalid.")

    # Load existing data
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                data = json.loads(content) if content else []
        except json.JSONDecodeError:
            data = []
    else:
        data = []

    def make_multilingual(value):
        if not value:
            return None
        return {"en": value, "fr": value, "mx": value, "ht": value}

    new_entry = {
        "id": f"{category}_{int(datetime.now().timestamp())}",
        "title": make_multilingual(title),
        "url": url,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "created": created if created else datetime.now().strftime("%Y-%m-%d")
    }
    if medium:
        new_entry["medium"] = make_multilingual(medium)
    if genre:
        new_entry["genre"] = make_multilingual(genre)
    if description:
        new_entry["description"] = make_multilingual(description)

    data.append(new_entry)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print(f"Updated {json_path}")

    update_site_timestamp()
    return new_entry


def extract_cloudinary_public_id(url):
    """Extract the public_id from a Cloudinary URL.
    Example: https://res.cloudinary.com/demo/image/upload/v1234567890/portfolio/painting/sample.jpg
    Returns: portfolio/painting/sample"""
    if "cloudinary.com" not in url:
        return None

    # Split by /upload/ and take the part after it
    parts = url.split("/upload/")
    if len(parts) < 2:
        return None

    # Remove version (v1234567890) and file extension
    path = parts[1]
    path = re.sub(r'^v\d+/', '', path)  # Remove version prefix
    path = re.sub(r'\.[^.]+$', '', path)  # Remove extension

    return path


def delete_from_cloudinary(url):
    """Delete a media file from Cloudinary using its URL."""
    public_id = extract_cloudinary_public_id(url)
    if not public_id:
        print(f"Skipping Cloudinary delete: URL is not a Cloudinary URL ({url})")
        return False

    try:
        print(f"Deleting from Cloudinary: {public_id}")
        result = cloudinary.uploader.destroy(public_id, resource_type="image")

        # Also try as video if image deletion failed
        if result.get("result") != "ok":
            result = cloudinary.uploader.destroy(public_id, resource_type="video")

        if result.get("result") == "ok":
            print(f"Successfully deleted from Cloudinary: {public_id}")
            return True
        else:
            print(f"Cloudinary deletion returned: {result.get('result')} for {public_id}")
            return False
    except Exception as e:
        print(f"Error deleting from Cloudinary: {e}")
        return False


def delete_from_github_release(url):
    """Delete a media file from GitHub Release using its URL."""
    if "github.com" not in url and "githubusercontent.com" not in url:
        return False

    # Extract filename from URL
    filename = url.split("/")[-1]

    try:
        release = get_or_create_release()
        assets = release.get("assets", [])

        # Find the asset with matching name
        for asset in assets:
            if asset["name"] == filename:
                headers = {
                    "Authorization": f"token {GITHUB_TOKEN}",
                    "Accept": "application/vnd.github.v3+json",
                }

                print(f"Deleting from GitHub Release: {filename}")
                r = requests.delete(
                    f"https://api.github.com/repos/{GITHUB_REPO}/releases/assets/{asset['id']}",
                    headers=headers
                )

                if r.status_code == 204:
                    print(f"Successfully deleted from GitHub Release: {filename}")
                    return True
                else:
                    print(f"GitHub deletion failed with status {r.status_code}")
                    return False

        print(f"Asset not found in GitHub Release: {filename}")
        return False
    except Exception as e:
        print(f"Error deleting from GitHub Release: {e}")
        return False


def delete_item(category, item_id):
    """Delete an item from both cloud storage and JSON database.

    Args:
        category: The category (painting, music, etc.)
        item_id: The item ID or title to delete

    Returns:
        dict: Result with success status and message
    """
    print(f"--- Deleting: {item_id} from {category} ---")

    json_path = JSON_MAP.get(category)
    if not json_path:
        return {"success": False, "error": f"Category '{category}' is invalid"}

    if not os.path.exists(json_path):
        return {"success": False, "error": f"Data file not found for category '{category}'"}

    # Load existing data
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            content = f.read().strip()
            data = json.loads(content) if content else []
    except json.JSONDecodeError:
        return {"success": False, "error": "Invalid JSON in data file"}

    # Find the item to delete
    item_to_delete = None
    new_data = []

    for item in data:
        # Match by ID or by title (for backward compatibility)
        item_title = item.get("title")
        if isinstance(item_title, dict):
            item_title = item_title.get("en", "")

        if item.get("id") == item_id or item_title == item_id:
            item_to_delete = item
        else:
            new_data.append(item)

    if not item_to_delete:
        return {"success": False, "error": f"Item '{item_id}' not found in {category}"}

    # Delete from cloud storage
    deleted_urls = []
    failed_urls = []

    # Delete main URL
    main_url = item_to_delete.get("url")
    if main_url:
        if delete_from_cloudinary(main_url):
            deleted_urls.append(main_url)
        elif delete_from_github_release(main_url):
            deleted_urls.append(main_url)
        else:
            failed_urls.append(main_url)

    # Delete gallery images if present
    gallery = item_to_delete.get("gallery", [])
    for gallery_url in gallery:
        if delete_from_cloudinary(gallery_url):
            deleted_urls.append(gallery_url)
        else:
            failed_urls.append(gallery_url)

    # Save updated data back to JSON
    try:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(new_data, f, indent=4, ensure_ascii=False)
        print(f"Removed item from {json_path}")
    except Exception as e:
        return {"success": False, "error": f"Failed to update JSON: {str(e)}"}

    # Update site timestamp
    update_site_timestamp()

    result = {
        "success": True,
        "message": f"Deleted '{item_id}' from {category}",
        "deleted_urls": len(deleted_urls),
        "failed_urls": len(failed_urls)
    }

    if failed_urls:
        result["warning"] = f"Some cloud files could not be deleted: {failed_urls}"

    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Alex's Portfolio Content Manager")
    parser.add_argument("--file", required=True, help="Path to the media file or directory (with --pile)")
    parser.add_argument("--title", required=True, help="Title of the work")
    parser.add_argument("--cat", required=True, choices=list(JSON_MAP.keys()), help="Category")
    parser.add_argument("--medium", help="Medium (for art/sculpting)")
    parser.add_argument("--genre", help="Genre (for music/video)")
    parser.add_argument("--description", help="Description of the work")
    parser.add_argument("--pile", action="store_true", help="Pile mode: upload all images in a directory as one gallery item")

    args = parser.parse_args()
    try:
        upload_and_save(args.file, args.title, args.cat, args.medium, args.genre, args.description, pile=args.pile)
    except Exception as e:
        print(f"Error: {e}")
