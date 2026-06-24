import os
import sys
import time
import shutil
from flask import Flask, jsonify, render_template

sys.path.insert(0, os.path.dirname(__file__))

from weather import WeatherService
from location import LocationService
from gallery import GalleryService
from calendar_service import CalendarService

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GALLERY_SRC = os.path.join(BASE_DIR, "static", "gallery")
GALLERY_DST = os.path.expanduser("~/Pictures/kiosk-gallery")

location_service = LocationService()
gallery_service = GalleryService()
calendar_service = CalendarService()

weather_service = None
location_data = None


def init_services():
    global weather_service, location_data

    location_data = location_service.get_location()
    print(f"[monitor-kiosk] Ubicación: {location_data['ciudad']} ({location_data['latitude']}, {location_data['longitude']})")

    weather_service = WeatherService(
        latitude=location_data["latitude"],
        longitude=location_data["longitude"],
    )

    os.makedirs(GALLERY_SRC, exist_ok=True)
    if os.path.isdir(GALLERY_DST) and not os.path.exists(GALLERY_SRC):
        shutil.copytree(GALLERY_DST, GALLERY_SRC)
    elif os.path.isdir(GALLERY_DST) and os.path.exists(GALLERY_SRC):
        pass


@app.route("/")
def index():
    return render_template("index.html", ciudad=location_data.get("ciudad", ""))

@app.route("/api/weather")
def weather():
    data = weather_service.get_weather()
    if data is None:
        return jsonify({"error": "Sin datos de clima"}), 503
    data["ciudad"] = location_data.get("ciudad", "")
    return jsonify(data)

@app.route("/api/gallery")
def gallery():
    return jsonify({"imagenes": gallery_service.get_image_urls()})

@app.route("/api/calendar")
def calendar():
    return jsonify(calendar_service.get_events())

@app.route("/api/status")
def status():
    uptime = time.time()
    return jsonify({
        "ciudad": location_data.get("ciudad", ""),
        "lat": location_data.get("latitude", 0),
        "lon": location_data.get("longitude", 0),
    })

def sync_gallery():
    if os.path.isdir(GALLERY_DST) and os.path.isdir(GALLERY_SRC):
        for f in os.listdir(GALLERY_DST):
            src = os.path.join(GALLERY_DST, f)
            dst = os.path.join(GALLERY_SRC, f)
            if os.path.isfile(src) and not os.path.exists(dst):
                shutil.copy2(src, dst)

if __name__ == "__main__":
    init_services()
    sync_gallery()
    print("[monitor-kiosk] Servidor iniciando en http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)