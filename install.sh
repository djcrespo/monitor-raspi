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

echo "[1/7] Instalando paquetes del sistema..."
sudo apt update
sudo apt install -y xorg openbox chromium python3-venv python3-pip unclutter

echo ""
echo "[2/7] Creando entorno virtual Python..."
cd "$PROJECT_DIR"

if ! python3 -m venv venv 2>/dev/null; then
    echo "[WARN] Falló python3 -m venv. Instalando python3-venv..."
    sudo apt install -y python3.12-venv python3.12-dev
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "[3/7] Creando estructura de carpetas..."
mkdir -p ~/Pictures/kiosk-gallery
mkdir -p ~/.config/openbox
mkdir -p ~/.config/systemd/user

chmod +x "$PROJECT_DIR/rotate-display.sh"

echo ""
echo "[4/8] Configurando auto-login en tty1..."
GETTY_OVERRIDE_DIR="/etc/systemd/system/getty@tty1.service.d"
sudo mkdir -p "$GETTY_OVERRIDE_DIR"
sudo tee "$GETTY_OVERRIDE_DIR/override.conf" > /dev/null <<EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin $CURRENT_USER --noclear %I 38400 linux
EOF

echo ""
echo "[5/8] Configurando X11 y Openbox..."
cat > ~/.xinitrc <<'EOF'
exec openbox-session
EOF

cat > ~/.config/openbox/autostart <<'EOF'
xset -dpms
xset s noblank
xset s off

DESTDIR="$HOME/projects/monitor-raspi"
(sleep 2 && "$DESTDIR"/rotate-display.sh left) &
(sleep 2 && systemctl --user restart monitor-kiosk) &
(sleep 3 && "$DESTDIR"/kiosk.sh) &
EOF

cat > ~/.bash_profile <<'EOF'
if [ -z "$WAYLAND_DISPLAY" ] && [ "$XDG_VTNR" -eq 1 ]; then
    exec startx
fi
EOF

echo ""
echo "[6/8] Creando servicio systemd para el servidor Flask..."
cat > ~/.config/systemd/user/monitor-kiosk.service <<'EOF'
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
echo "[7/8] Configurando Chromium preferences..."
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

echo ""
echo "=== Instalación completa ==="
echo ""
echo "Resumen:"
echo "  - Paquetes: X11, Openbox, Chromium instalados"
echo "  - Entorno Python: venv en $PROJECT_DIR/venv"
echo "  - Servicio: monitor-kiosk.service habilitado"
echo "  - Galería: ~/Pictures/kiosk-gallery/"
echo "  - Auto-arranque: Configurado para usuario $CURRENT_USER"
echo ""
echo "Para que el auto-login funcione, verifica que el archivo"
echo "/etc/systemd/system/getty@tty1.service.d/override.conf"
echo "tenga el nombre de usuario correcto."
echo ""
echo "Reinicia para probar: sudo reboot"
echo ""
echo "Si necesitas cambiar la ubicación manualmente, edita config.yaml"
echo "con tus coordenadas (lat, lon) y ciudad."