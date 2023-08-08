#!/bin/bash

# Check if the start folder is provided as the first argument
if [ -z "$1" ]; then
  echo "Usage: $0 /path/to/your/folder"
  exit 1
fi

# Set the start folder
start_folder="$1"

# Find all video files (mp4 format) in the search directory and its subdirectories
video_files=$(find "$start_folder" -type f -iname "*.mp4")

echo "Found $(echo "$video_files" | wc -l) video files for compression."

# Compress each video file and use temporary files for output
for file in $video_files; do
  temp_file="${file%.mp4}_temp.mp4"
  echo "Compressing: $file"
  HandBrakeCLI -i "$file" -o "$temp_file" --preset="Email 25 MB 5 Minutes 480p30"

  # Check if the output file is smaller than the original
  original_size=$(stat -c %s "$file")
  compressed_size=$(stat -c %s "$temp_file")

  if [ $compressed_size -lt $original_size ]; then
    rm "$file"
    mv "$temp_file" "$file"
  else
    rm "$temp_file"
  fi
done

echo "Compression process completed."