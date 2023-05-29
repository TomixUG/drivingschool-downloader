#!/bin/bash

echo "Copying questions database..."
mkdir -p ../assets/db
cp -r data.db ../assets/db/questions.db # copy the questions db

echo "Copying assets..."
rm -rf ../assets/images
mkdir ../assets/images
cp -r data/* ../assets/images # copy all the images, videos