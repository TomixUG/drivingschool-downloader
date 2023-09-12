#!/bin/bash

# Step 1: Convert PNG images to JPG format
find data -type f -name "*.png" | while read -r png_file; do
  jpg_file="${png_file%.png}.jpg"
  convert "$png_file" "$jpg_file"
done

# Step 2: Remove the original PNG images
find data -type f -name "*.png" -exec rm {} \;

# Step 3: Update image URLs in the SQLite database
database_path="data.db"

sqlite3 "$database_path" <<EOF
UPDATE questions SET image_url = REPLACE(image_url, '.png', '.jpg') WHERE image_url LIKE '%.png';
EOF