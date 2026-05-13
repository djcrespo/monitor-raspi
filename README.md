# Monitor Kiosk - Raspberry Pi 4

Dashboard de clima + galería de fotos para pantalla completa en Raspberry Pi 4 (8GB).

## Requisitos

- Raspberry Pi 4 con Debian 13 (Trixie)
- Conexión a internet (para consultas de clima y ubicación)
- Usuario con acceso sudo

## Estructura del proyecto

```
monitor-raspi/
├── app/
│   ├── server.py          # Servidor Flask (puerto 5000)
│   ├── weather.py        # Cliente Open-Meteo
│   ├── location.py       # Geolocalización por IP
│   ├── gallery.py        # Escáner de carpeta de galería
│   ├── templates/
│   │   └── index.html    # Dashboard HTML
│   └── static/
│       ├── style.css     # Estilos (dark theme)
│       └── app.js        # JavaScript del frontend
├── config.yaml           # Configuración
├── requirements.txt      # Dependencias Python
├── install.sh            # Script de instalación
├── kiosk.sh              # Lanzador de Chromium kiosk
└── README.md             # Este archivo
```

## Instalación rápida

```bash
# Clonar o copiar el proyecto a la Raspi
cd ~/projects/monitor-raspi

# Dar permisos de ejecución al script
chmod +x install.sh

# Ejecutar (NO como root)
./install.sh
```

El script instala:
- X11 + Openbox
- Chromium Browser
- Python 3 con venv
- Configura auto-login en tty1
- Crea el servicio systemd para Flask

## Desarrollo local

Para editar y depurar el dashboard desde tu PC sin necesidad de la Raspi:

### 1. Crear entorno virtual e instalar dependencias

```bash
cd monitor-raspi
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Crear carpeta de imágenes de prueba

```bash
mkdir -p ~/Pictures/kiosk-gallery
# Copiá algunas imágenes .jpg o .png para probar la galería
```

### 3. Iniciar el servidor

```bash
cd app
python3 server.py
```

El servidor arranca en `http://localhost:5000`.

### 4. Modo horizontal vs vertical

El CSS por defecto incluye una rotación de 90° para pantalla vertical
(como se usa en la Raspi). Para depurar en horizontal en tu PC,
**comentá** estas líneas en `app/static/style.css`:

```css
/* Comentar para depuración horizontal */
/*
body {
    width: 100vh;
    height: 100vw;
    transform: translateX(100vw) rotate(90deg);
    transform-origin: top left;
    position: fixed;
    top: 0;
    left: 0;
}
*/

/* Descomentar para depuración horizontal */
body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #0d1117;
    color: #e6edf3;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}
```

Para simular pantalla vertical sin tocar el CSS, usá las DevTools del
navegador (F12) → Toggle device toolbar (Ctrl+Shift+M) → elegí una
resolución tipo 1080×1920.

### 5. Recarga automática (opcional)

Instalá watchdog para recargar el servidor al guardar cambios:

```bash
pip install watchdog
```

Y ejecutá Flask con modo debug:

```bash
flask --app server run --debug --host 0.0.0.0 --port 5000
```

### 6. Configurar ubicación para pruebas

Editá `config.yaml` con coordenadas de prueba:

```yaml
geolocation:
  latitude: 21.0166
  longitude: -89.7257
  ciudad: Yucatán
```

Si dejás los valores en `null`, la ubicación se detecta automáticamente por IP.

## Después de instalar

### 1. Agregar imágenes a la galería

```bash
mkdir -p ~/Pictures/kiosk-gallery
# Copiar imágenes ahí
```

Formatos soportados: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`

### 2. Configurar ubicación manual (opcional)

Editar `config.yaml`:

```yaml
geolocation:
  latitude: 40.4168
  longitude: -3.7038
  ciudad: Madrid
```

Si no se especifica, se detecta automáticamente por IP.

### 3. Reiniciar

```bash
sudo reboot
```

## Cómo funciona

1. Al boot, el sistema hace auto-login en tty1 y lanza X11
2. Openbox inicia y ejecuta `autostart`
3. El servicio `monitor-kiosk` arranca el servidor Flask
4. Chromium se abre en modo kiosk mostrando `localhost:5000`
5. El servidor consulta:
   - **Ubicación**: ip-api.com (o `config.yaml` si está definido)
   - **Clima**: Open-Meteo API (gratis, sin API key)
6. El frontend actualiza:
   - Clima cada 15 minutos
   - Imágenes cada 30 segundos
   - Reloj en tiempo real

## Comandos útiles

```bash
# Ver estado del servicio
systemctl --user status monitor-kiosk

# Ver logs del servidor
journalctl --user -u monitor-kiosk -f

# Reiniciar el servicio
systemctl --user restart monitor-kiosk

# Ver logs del servidor Flask en vivo
tail -f ~/.config/systemd/user/monitor-kiosk.service.d/var-log-monitor-kiosk.log
```

## Solución de problemas

### La pantalla queda en negro después del boot

1. Conectar por SSH
2. Verificar que X11 arranque: `cat ~/.config/openbox/autostart`
3. Revisar logs: `journalctl -xe`

### Chromium no muestra la página

```bash
# Verificar que Flask esté corriendo
curl http://localhost:5000

# Si no responde, iniciar manualmente
cd ~/projects/monitor-raspi/app
../venv/bin/python server.py
```

### La ubicación es incorrecta

Edita `config.yaml` con lat/lon correctos. Puedes obtenerlas en:
https://www.latlong.net/

### La galería no muestra imágenes

1. Verificar que la carpeta existe: `ls ~/Pictures/kiosk-gallery/`
2. Verificar permisos: `chmod 755 ~/Pictures/kiosk-gallery/`
3. Reiniciar el servicio: `systemctl --user restart monitor-kiosk`

### El kiosk se cierra solo

Revisar si Chromium crashea por falta de memoria:

```bash
dmesg | grep -i chromium
journalctl --user -u monitor-kiosk | tail -50
```

Reducir la cantidad de imágenes o su resolución puede ayudar.

## Personalización

### Cambiar intervalo de actualizaciones

En `config.yaml`:

```yaml
weather:
  refresh_interval: 900  # segundos

gallery:
  refresh_interval: 60   # segundos
```

### Cambiar tiempo del slideshow

En `app/static/app.js`, línea 3:

```javascript
const SLIDESHOW_INTERVAL = 8 * 1000;  // milisegundos
```

### Agregar más información al dashboard

Editar `app/static/index.html` y `app/static/style.css`.

## APIs utilizadas

- **Open-Meteo**: https://open-meteo.com/ (gratis, sin registro)
- **ip-api.com**: http://ip-api.com/json (gratis, 45 req/min)

## Licencia

MIT