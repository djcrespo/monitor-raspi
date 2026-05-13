#!/bin/bash

CHROME_FLAGS=(
    --kiosk
    --no-first-run
    --no-default-browser-check
    --disable-infobars
    --disable-session-crashed-bubble
    --disable-dev-shm-usage
    --no-sandbox
    --start-fullscreen
    --disk-cache-dir=/tmp/chromium-cache
)

exec chromium-browser "${CHROME_FLAGS[@]}" http://localhost:5000