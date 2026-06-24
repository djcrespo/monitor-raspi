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

echo "[1/6] Habilitando linger (servicios --user en boot)..."
sudo loginctl enable-linger "$CURRENT_USER"
echo "  OK"

echo ""
echo "[2/6] Verificando entorno Python..."
if [ ! -f "$PROJECT_DIR/venv/bin/python" ]; then
    echo "  Venv no encontrado, creando..."
    cd "$PROJECT_DIR"
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    echo "  Venv creado"
else
    echo "  OK"
fi

echo ""
echo "[3/6] Creando servicio systemd..."
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/monitor-kiosk.service <<EOF
[Unit]
Description=Monitor Kiosk Flask Server
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR/app
ExecStart=$PROJECT_DIR/venv/bin/python server.py
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF
echo "  OK"

echo ""
echo "[4/6] Recargando daemon y habilitando servicio..."
systemctl --user daemon-reload
systemctl --user enable --now monitor-kiosk
echo "  OK"

echo ""
echo "[5/6] Configurando autostart de Chromium kiosk..."

if command -v chromium >/dev/null 2>&1; then
    CHROME_BIN="chromium"
elif command -v chromium-browser >/dev/null 2>&1; then
    CHROME_BIN="chromium-browser"
else
    CHROME_BIN="chromium"
fi

CHROME_FLAGS="--kiosk --no-first-run --no-default-browser-check --disable-infobars --disable-session-crashed-bubble --disable-dev-shm-usage --start-fullscreen --disk-cache-dir=/tmp/chromium-cache http://localhost:5000"

if [ -d "$HOME/.config/labwc" ]; then
    if ! grep -q "chromium.*localhost:5000" "$HOME/.config/labwc/autostart" 2>/dev/null; then
        echo "$CHROME_BIN $CHROME_FLAGS" >> "$HOME/.config/labwc/autostart"
    fi
    echo "  labwc: OK"
elif [ -d "$HOME/.config/lxsession/LXDE-pi" ]; then
    if ! grep -q "chromium.*localhost:5000" "$HOME/.config/lxsession/LXDE-pi/autostart" 2>/dev/null; then
        echo "$CHROME_BIN $CHROME_FLAGS" >> "$HOME/.config/lxsession/LXDE-pi/autostart"
    fi
    echo "  LXDE: OK"
else
    mkdir -p "$HOME/.config/autostart"
    if [ ! -f "$HOME/.config/autostart/monitor-kiosk.desktop" ]; then
        cat > "$HOME/.config/autostart/monitor-kiosk.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Monitor Kiosk
Exec=$CHROME_BIN $CHROME_FLAGS
X-GNOME-Autostart-enabled=true
EOF
    fi
    echo "  GNOME: OK"
fi

echo ""
echo "[6/6] Verificando..."
sleep 2
systemctl --user status monitor-kiosk --no-pager

echo ""
echo "=== Listo ==="
echo "Al reiniciar, el servicio y Chromium arrancarán automáticamente."
