#!/usr/bin/env python3
import os
import re
import glob

def fix_imports(file_path):
    """Fix versioned imports in a single file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix @radix-ui imports with version numbers
        content = re.sub(r'(@radix-ui/react-[^@"\']+)@[0-9][^"\']*', r'\1', content)
        
        # Fix other versioned imports
        content = re.sub(r'(from\s+["\'])([^"\']+)@[0-9][^"\']*(["\'])', r'\1\2\3', content)
        content = re.sub(r'(import\s+[^"\']*["\'])([^"\']+)@[0-9][^"\']*(["\'])', r'\1\2\3', content)
        
        # Fix specific packages
        content = re.sub(r'"class-variance-authority@[^"]*"', '"class-variance-authority"', content)
        content = re.sub(r'"lucide-react@[^"]*"', '"lucide-react"', content)
        content = re.sub(r'"sonner@[^"]*"', '"sonner"', content)
        content = re.sub(r'"next-themes@[^"]*"', '"next-themes"', content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Fixed: {file_path}")
        return True
        
    except Exception as e:
        print(f"Error fixing {file_path}: {e}")
        return False

def main():
    # Find all TypeScript/JavaScript files
    patterns = ['src/**/*.tsx', 'src/**/*.ts', 'src/**/*.jsx', 'src/**/*.js']
    
    files_fixed = 0
    total_files = 0
    
    for pattern in patterns:
        for file_path in glob.glob(pattern, recursive=True):
            total_files += 1
            if fix_imports(file_path):
                files_fixed += 1
    
    print(f"\nFixed {files_fixed} out of {total_files} files.")
    
    # Also fix PostCSS config
    try:
        postcss_path = 'postcss.config.js'
        if os.path.exists(postcss_path):
            with open(postcss_path, 'r') as f:
                content = f.read()
            
            # Convert to ES module format
            content = content.replace('module.exports = {', 'export default {')
            
            with open(postcss_path, 'w') as f:
                f.write(content)
            
            print(f"Fixed PostCSS config: {postcss_path}")
    except Exception as e:
        print(f"Error fixing PostCSS config: {e}")

if __name__ == "__main__":
    main()