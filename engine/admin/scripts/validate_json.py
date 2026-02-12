import json
import os
import sys
import glob

def validate_json_files(directories):
    """
    Recursively finds and validates all .json files in the given directories.
    Returns True if all files are valid, False otherwise.
    """
    has_errors = False
    total_files = 0
    valid_files = 0

    print("🔍 Starting JSON validation...")

    for directory in directories:
        if not os.path.isdir(directory):
            print(f"⚠️ Directory not found: {directory}")
            continue

        # Use glob to find all json files recursively
        files = glob.glob(os.path.join(directory, "**/*.json"), recursive=True)
        
        for file_path in files:
            total_files += 1
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    json.load(f)
                valid_files += 1
                # print(f"✅ Valid: {file_path}") # Optional: Uncomment for verbose output
            except json.JSONDecodeError as e:
                print(f"❌ Syntax Error in {file_path}:")
                print(f"   Line {e.lineno}, Column {e.colno}: {e.msg}")
                has_errors = True
            except Exception as e:
                print(f"❌ Error reading {file_path}: {e}")
                has_errors = True

    print("\n📊 Validation Summary")
    print(f"   Total Files: {total_files}")
    print(f"   Valid Files: {valid_files}")
    print(f"   Invalid Files: {total_files - valid_files}")

    return not has_errors

if __name__ == "__main__":
    # Directories to validate
    dirs_to_check = ["data", "config", "lang"]
    
    # Adjust paths if running from root or scripts dir
    if os.path.basename(os.getcwd()) == "scripts":
        os.chdir("..")

    success = validate_json_files(dirs_to_check)

    if success:
        print("\n✨ All JSON files are valid!")
        sys.exit(0)
    else:
        print("\n💥 Validation failed. Please fix the errors above.")
        sys.exit(1)
