#!/bin/bash
set -e

echo "=== Monitor Kiosk - Instalador ==="
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
CURRENT_USER="$(whoami)"

if [ "$EUID" -eq 0 ]; then
    echo "[ERROR] No ejecutes este script como root."
    echo "Ejecuta como el usuario que usará el kiosk (ej: pi)."
    exit 1
fi

echo "[1/5] Instalando paquetes del sistema..."
sudo apt update
sudo apt install -y python3-venv python3-pip unclutter

echo ""
echo "[2/5] Creando entorno virtual Python..."
cd "$PROJECT_DIR"

if ! python3 -m venv venv 2>/dev/null; then
    echo "[WARN] Falló python3 -m venv. Instalando python3-venv..."
    sudo apt install -y python3-venv
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "[3/5] Creando estructura de carpetas..."
mkdir -p ~/Pictures/kiosk-gallery
mkdir -p ~/.config/systemd/user
mkdir -p ~/.config/autostart

echo ""
echo "[4/5] Creando servicio systemd para el servidor Flask..."
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

systemctl --user daemon-reload
systemctl --user enable monitor-kiosk

echo ""
echo "[5/5] Configurando auto-arranque de Chromium kiosk..."

# Detectar el nombre del binario de Chromium disponible
if command -v chromium >/dev/null 2>&1; then
    CHROME_BIN="chromium"
elif command -v chromium-browser >/dev/null 2>&1; then
    CHROME_BIN="chromium-browser"
else
    echo "[WARN] No se encontró chromium ni chromium-browser. El .desktop quedará configurado con 'chromium'."
    CHROME_BIN="chromium"
fi

CHROME_PREFS_DIR="$HOME/.config/chromium/Default"
mkdir -p "$CHROME_PREFS_DIR"
cat > "$CHROME_PREFS_DIR/Preferences" <<'EOF'
{
  "browser": {
    "check_default_browser": false
  },
  "session": {
    "restore_on_startup": 0
  },
  "exited_cleanly": true
}
EOF

cat > ~/.config/autostart/monitor-kiosk.desktop <<EOF
[Desktop Entry]
Type=Application
Name=Monitor Kiosk
Comment=Navegador en modo kiosk para el dashboard
Exec=$CHROME_BIN --kiosk --no-first-run --no-default-browser-check --disable-infobars --disable-session-crashed-bubble --disable-dev-shm-usage --start-fullscreen --disk-cache-dir=/tmp/chromium-cache http://localhost:5000
X-GNOME-Autostart-enabled=true
EOF

echo ""
echo "=== Instalación completa ==="
echo ""
echo "Resumen:"
echo "  - Entorno Python: venv en $PROJECT_DIR/venv"
echo "  - Servicio: monitor-kiosk.service habilitado"
echo "  - Galería: ~/Pictures/kiosk-gallery/"
echo "  - Auto-arranque: ~/.config/autostart/monitor-kiosk.desktop"
echo "  - Usuario: $CURRENT_USER"
echo ""
echo "Pasos siguientes:"
echo "  1. Copiar imágenes a ~/Pictures/kiosk-gallery/"
echo "  2. Configurar URL del calendario de Apple en config.yaml"
echo "  3. Reiniciar: sudo reboot"
echo ""
echo "Para ver el estado del servicio:"
echo "  systemctl --user status monitor-kiosk"
