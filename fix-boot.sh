#!/bin/bash
set -e

echo "=== Fix: Servicio no arranca al reiniciar ==="
echo ""

CURRENT_USER="$(whoami)"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ "$EUID" -eq 0 ]; then
    echo "[ERROR] No ejecutes como root."
    exit 1
fi

echo "[1/4] Habilitando linger (servicios --user en boot)..."
sudo loginctl enable-linger "$CURRENT_USER"
echo "  OK"

echo ""
echo "[2/4] Creando servicio systemd..."
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/monitor-kiosk.service <<EOF
[Unit]
Description=Monitor Kiosk Flask Server
After=network.target

[Service]
Type=simple
WorkingDirectory=%h/projects/monitor-raspi/app
ExecStart=%h/projects/monitor-raspi/venv/bin/python server.py
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF
echo "  OK"

echo ""
echo "[3/4] Recargando daemon y habilitando servicio..."
systemctl --user daemon-reload
systemctl --user enable --now monitor-kiosk
echo "  OK"

echo ""
echo "[4/4] Verificando..."
sleep 2
systemctl --user status monitor-kiosk --no-pager

echo ""
echo "=== Listo ==="
echo "Al reiniciar, el servicio arrancará automáticamente."
