#!/bin/bash
set -e

ROTATION="${1:-normal}"

OUTPUT=""

for line in $(xrandr --listmonitors | awk 'NR>1 {print $NF}'); do
    if echo "$line" | grep -qi "HDMI\|DP\|DPI"; then
        OUTPUT="$line"
        break
    fi
done

if [ -z "$OUTPUT" ]; then
    OUTPUT=$(xrandr --listmonitors | awk 'NR>1 {print $NF}' | head -1)
fi

if [ -n "$OUTPUT" ]; then
    xrandr --output "$OUTPUT" --rotate "$ROTATION"
fi