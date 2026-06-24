# Monitor Kiosk - Raspberry Pi 4

Dashboard de clima, pronóstico, calendario y galería de fotos para pantalla completa en Raspberry Pi 4 (8GB) con RaspiOS 64-bit.

## Requisitos

- Raspberry Pi 4 con RaspiOS 64-bit
- Escritorio gráfico con Chromium instalado
- Conexión a internet (para consultas de clima, ubicación y calendario)
- Usuario con acceso sudo

## Estructura del proyecto

```
monitor-raspi/
├── app/
│   ├── server.py              # Servidor Flask (puerto 5000)
│   ├── weather.py            # Cliente Open-Meteo
│   ├── location.py           # Geolocalización por IP
│   ├── gallery.py            # Escáner de carpeta de galería
│   ├── calendar_service.py   # Parser de calendarios ICS (Apple, Google, etc.)
│   ├── templates/
│   │   └── index.html        # Dashboard HTML
│   └── static/
│       ├── style.css         # Estilos (dark theme)
│       └── app.js            # JavaScript del frontend
├── config.yaml               # Configuración
├── requirements.txt          # Dependencias Python
├── install.sh                # Script de instalación
└── README.md                 # Este archivo
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
- Python 3 con venv
- Dependencias del proyecto (`flask`, `requests`, `pyyaml`, `icalendar`, `recurring-ical-events`)
- Servicio systemd `--user` para Flask (`monitor-kiosk`)
- Archivo `~/.config/autostart/monitor-kiosk.desktop` para lanzar Chromium al iniciar sesión

> **Nota:** Este instalador asume que la Raspi ya tiene escritorio gráfico y Chromium. No instala X11 ni Openbox.

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

### 4. Modo vertical

La orientación vertical debe configurarse en RaspiOS (`Preferences` → `Screen Configuration`).
Para depurar en horizontal en tu PC, el CSS ya funciona en modo horizontal por defecto.

Para simular pantalla vertical sin tocar el CSS, usá las DevTools del navegador (F12) → Toggle device toolbar (Ctrl+Shift+M) → elegí una resolución tipo 1080×1920.

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

### 2. Configurar calendario de Apple

El dashboard puede mostrar eventos de cualquier calendario ICS, incluyendo Apple Calendar.

Para compartir un calendario de Apple:
1. Abrí la app Calendario en Mac/iPhone/iPad
2. Seleccioná el calendario → Compartir calendario → Calendario público
3. Copiá la URL generada (empieza con `webcal://`)
4. Pegala en `config.yaml`:

```yaml
calendar:
  enabled: true
  url: "https://p123-caldav.icloud.com/published/2/..."
  refresh_interval: 3600   # segundos
  max_events: 7
  days_ahead: 14
```

> También podés usar una URL `webcal://...`; el servidor la convierte automáticamente a `https://`.

### 3. Configurar ubicación manual (opcional)

Editar `config.yaml`:

```yaml
geolocation:
  latitude: 40.4168
  longitude: -3.7038
  ciudad: Madrid
```

Si no se especifica, se detecta automáticamente por IP.

### 4. Reiniciar

```bash
sudo reboot
```

## Cómo funciona

1. Al iniciar sesión en el escritorio, el servicio `monitor-kiosk` arranca el servidor Flask
2. Chromium se abre automáticamente en modo kiosk mostrando `localhost:5000` vía autostart
3. El servidor consulta:
   - **Ubicación**: ip-api.com (o `config.yaml` si está definido)
   - **Clima**: Open-Meteo API (gratis, sin API key)
   - **Calendario**: feed ICS configurado en `config.yaml`
4. El frontend actualiza:
   - Clima cada 15 minutos
   - Calendario cada 1 hora
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

# Verificar que Flask responda
curl http://localhost:5000

# Probar el endpoint de calendario
curl http://localhost:5000/api/calendar
```

## Solución de problemas

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

### El calendario no muestra eventos

1. Verificar que `calendar.enabled` sea `true` en `config.yaml`
2. Verificar la URL del calendario:
   ```bash
   curl http://localhost:5000/api/calendar
   ```
3. Asegurarte de que el calendario de Apple esté compartido como público
4. Revisar logs: `journalctl --user -u monitor-kiosk -f`

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

calendar:
  refresh_interval: 3600 # segundos
```

### Cambiar tiempo del slideshow

En `app/static/app.js`, línea 4:

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
