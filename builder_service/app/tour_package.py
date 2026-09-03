import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional

from app.config import TOUR_FORMAT_VERSION, APP_VERSION
from app.schemas import (
    TourManifest,
    TourMetadata,
    TourRoomsDocument,
    TourRoomItem,
    NavmeshDocument,
    NavPolygon,
    Vec3,
    BoundingBox,
)
from app.utils import generate_valid_glb, generate_preview_jpeg, logger


def build_default_rooms() -> TourRoomsDocument:
    """Generates standard room definitions with centroids and 3D bounding boxes."""
    return TourRoomsDocument(
        rooms=[
            TourRoomItem(
                id="living",
                name="Living Room",
                centroid=Vec3(x=2.5, y=1.6, z=3.0),
                bounds=BoundingBox(
                    min=Vec3(x=0.0, y=0.0, z=0.0),
                    max=Vec3(x=5.0, y=2.8, z=6.0),
                ),
            ),
            TourRoomItem(
                id="kitchen",
                name="Kitchen",
                centroid=Vec3(x=7.0, y=1.6, z=3.0),
                bounds=BoundingBox(
                    min=Vec3(x=5.0, y=0.0, z=0.0),
                    max=Vec3(x=9.0, y=2.8, z=6.0),
                ),
            ),
        ]
    )


def build_default_navmesh() -> NavmeshDocument:
    """Generates convex walkable floor polygons in metric right-handed coordinates."""
    return NavmeshDocument(
        version=TOUR_FORMAT_VERSION,
        units="meters",
        y_up=True,
        polygons=[
            NavPolygon(
                id="poly_living_01",
                vertices=[
                    Vec3(x=0.2, y=0.0, z=0.2),
                    Vec3(x=4.8, y=0.0, z=0.2),
                    Vec3(x=4.8, y=0.0, z=5.8),
                    Vec3(x=0.2, y=0.0, z=5.8),
                ],
            ),
            NavPolygon(
                id="poly_kitchen_01",
                vertices=[
                    Vec3(x=5.0, y=0.0, z=0.2),
                    Vec3(x=8.8, y=0.0, z=0.2),
                    Vec3(x=8.8, y=0.0, z=5.8),
                    Vec3(x=5.0, y=0.0, z=5.8),
                ],
            ),
        ],
    )


def assemble_tour_package(
    work_dir: Path,
    output_tour_path: Path,
    house_name: str = "Sample House",
    client_id: str = "client_001",
    address: str = "Unknown",
    source_scan: str = "raw_videos",
    rooms_doc: Optional[TourRoomsDocument] = None,
    navmesh_doc: Optional[NavmeshDocument] = None,
) -> Path:
    """
    Compiles all intermediate assets in work_dir into a standardized, spec-compliant
    myhouse.tour (ZIP) file at output_tour_path.
    """
    work_dir.mkdir(parents=True, exist_ok=True)
    output_tour_path.parent.mkdir(parents=True, exist_ok=True)

    # 1. Manifest JSON
    manifest = TourManifest(
        format="house_tour",
        version=TOUR_FORMAT_VERSION,
        created_by="BuilderService",
        created_at=datetime.now(timezone.utc).astimezone().isoformat(),
        source_scan=source_scan,
        builder_version=APP_VERSION,
    )
    manifest_file = work_dir / "manifest.json"
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest.model_dump(), f, indent=2)

    # 2. Metadata JSON
    metadata = TourMetadata(
        house_name=house_name,
        client_id=client_id,
        address=address,
        capture_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        build_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        notes=f"Auto-built from {source_scan}, LODs: high/mid/low",
    )
    metadata_file = work_dir / "metadata.json"
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata.model_dump(), f, indent=2)

    # 3. Rooms JSON
    rooms = rooms_doc or build_default_rooms()
    rooms_file = work_dir / "rooms.json"
    with open(rooms_file, "w", encoding="utf-8") as f:
        json.dump(rooms.model_dump(), f, indent=2)

    # 4. Navmesh JSON
    navmesh = navmesh_doc or build_default_navmesh()
    navmesh_file = work_dir / "navmesh.json"
    with open(navmesh_file, "w", encoding="utf-8") as f:
        json.dump(navmesh.model_dump(), f, indent=2)

    # 5. Models (LOD High, Mid, Low)
    model_high = work_dir / "model_high.glb"
    model_mid = work_dir / "model_mid.glb"
    model_low = work_dir / "model_low.glb"

    if not model_high.exists():
        generate_valid_glb(model_high, lod_name="high")
    if not model_mid.exists():
        generate_valid_glb(model_mid, lod_name="mid")
    if not model_low.exists():
        generate_valid_glb(model_low, lod_name="low")

    # 6. Preview JPEG
    preview_file = work_dir / "preview.jpg"
    if not preview_file.exists():
        generate_preview_jpeg(preview_file, house_name=house_name)

    # 7. Package everything into ZIP archive (.tour)
    required_files = [
        "manifest.json",
        "metadata.json",
        "rooms.json",
        "model_high.glb",
        "model_mid.glb",
        "model_low.glb",
        "navmesh.json",
        "preview.jpg",
    ]

    with zipfile.ZipFile(output_tour_path, "w", zipfile.ZIP_DEFLATED) as tour_zip:
        for fname in required_files:
            file_path = work_dir / fname
            if not file_path.exists():
                raise FileNotFoundError(f"Missing required component for .tour package: {fname}")
            tour_zip.write(file_path, arcname=fname)

    logger.info(f"Successfully assembled .tour package at {output_tour_path} ({output_tour_path.stat().st_size} bytes)")
    return output_tour_path


def validate_tour_package(tour_zip_path: Path) -> Dict[str, Any]:
    """
    Validates that a .tour ZIP package contains all 8 mandatory files
    and satisfies all JSON schema requirements.
    """
    if not tour_zip_path.exists():
        raise FileNotFoundError(f"Tour file does not exist: {tour_zip_path}")

    required_entries = {
        "manifest.json",
        "metadata.json",
        "rooms.json",
        "model_high.glb",
        "model_mid.glb",
        "model_low.glb",
        "navmesh.json",
        "preview.jpg",
    }

    with zipfile.ZipFile(tour_zip_path, "r") as zf:
        namelist = set(zf.namelist())
        missing = required_entries - namelist
        if missing:
            raise ValueError(f"Invalid .tour package. Missing required entries: {missing}")

        # Validate JSON structures
        manifest_data = json.loads(zf.read("manifest.json").decode("utf-8"))
        TourManifest.model_validate(manifest_data)

        metadata_data = json.loads(zf.read("metadata.json").decode("utf-8"))
        TourMetadata.model_validate(metadata_data)

        rooms_data = json.loads(zf.read("rooms.json").decode("utf-8"))
        TourRoomsDocument.model_validate(rooms_data)

        navmesh_data = json.loads(zf.read("navmesh.json").decode("utf-8"))
        NavmeshDocument.model_validate(navmesh_data)

        # Verify glTF binary headers
        for glb_name in ["model_high.glb", "model_mid.glb", "model_low.glb"]:
            glb_header = zf.read(glb_name)[:4]
            if glb_header != b"glTF":
                raise ValueError(f"Corrupt or invalid GLB binary header in {glb_name}")

    return {
        "is_valid": True,
        "manifest": manifest_data,
        "metadata": metadata_data,
        "rooms_count": len(rooms_data.get("rooms", [])),
    }
