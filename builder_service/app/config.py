import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
WORK_DIR = BASE_DIR / "work"
OUTPUT_DIR = BASE_DIR / "output"
STATIC_DIR = BASE_DIR / "static"

# Ensure runtime directories exist
for directory in [UPLOADS_DIR, WORK_DIR, OUTPUT_DIR, STATIC_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Service and Specification Metadata
APP_NAME = "HouseTour Builder Service"
APP_VERSION = "1.0.0"
TOUR_FORMAT_VERSION = "1.0"
SCAN_FORMAT_VERSION = "1.0"

# Server Settings
HOST = os.getenv("HOUSETUR_HOST", "0.0.0.0")
PORT = int(os.getenv("HOUSETUR_PORT", "8000"))

# Pipeline Settings
# When False or tools are missing, uses automated high-fidelity dummy generator
USE_REAL_RECONSTRUCTION = os.getenv("USE_REAL_RECONSTRUCTION", "false").lower() == "true"
STAGE_DELAY_SECONDS = float(os.getenv("STAGE_DELAY_SECONDS", "0.5"))

# External Tool Paths (for Windows / Linux)
COLMAP_BIN = os.getenv("COLMAP_BIN", "colmap")
OPENMVS_BIN_DIR = os.getenv("OPENMVS_BIN_DIR", "")
BLENDER_BIN = os.getenv("BLENDER_BIN", "blender")
FFMPEG_BIN = os.getenv("FFMPEG_BIN", "ffmpeg")
