#!/bin/sh
set -e

echo "Starting AI Art Generator..."

# Switch to artgen user and start the application
exec su-exec artgen:nodejs "$@"
