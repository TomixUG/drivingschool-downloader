#!/bin/bash

echo "Copying assets..."
rm -rf ../static/data/
mkdir ../static/data/
cp -r data/* ../static/data # copy all the images, videos