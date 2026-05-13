import os
import yaml
from pathlib import Path


class GalleryService:
    def __init__(self, config_path=None):
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.config_path = config_path or os.path.join(base, "config.yaml")
        self._load_config()

    def _load_config(self):
        self.folder = os.path.expanduser("~/Pictures/kiosk-gallery/")
        self.refresh_interval = 30

        if os.path.exists(self.config_path):
            with open(self.config_path) as f:
                data = yaml.safe_load(f) or {}
            gallery = data.get("gallery", {})
            folder = gallery.get("folder")
            if folder:
                self.folder = os.path.expanduser(folder)

    def get_images(self):
        if not os.path.isdir(self.folder):
            return []

        allowed = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
        images = []
        for f in sorted(os.listdir(self.folder)):
            ext = os.path.splitext(f)[1].lower()
            if ext in allowed:
                images.append(f)
        return images

    def get_image_urls(self):
        urls = []
        for img in self.get_images():
            encoded = img.replace(" ", "%20")
            urls.append(f"/static/gallery/{encoded}")
        return urls