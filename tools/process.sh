#!/bin/bash

if [ $1 = "dev" ]; then
  node server
elif [ $1 = "prod" ]; then
  next build && npx tailwindcss -o ./public/globals.css --minify && NODE_ENV=production node server.js
elif [ $1 = "prod-legacy" ]; then
  next build && NODE_ENV=production node server.js
else
  node --no-warnings processes/$1/process.js
fi