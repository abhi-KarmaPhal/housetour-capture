import io
import json
import zipfile
import pytest
from pathlib import Path

from app.tour_package import assemble_tour_package, validate_tour_package
from app.utils import generate_valid_glb, generate_preview_jpeg


def test_generate_valid_glb(tmp_path: Path):
    """Verifies that generated glTF 2.0 binary has valid headers and chunk magic."""
    glb_path = tmp_path / "model_high.glb"
    generate_valid_glb(glb_path, lod_name="high")

    assert glb_path.exists()
    assert glb_path.stat().st_size > 0

    with open(glb_path, "rb") as f:
        magic = f.read(4)
        assert magic == b"glTF", "Magic header must be 'glTF'"
        version = int.from_bytes(f.read(4), "little")
        assert version == 2, "glTF version must be 2"


def test_generate_preview_jpeg(tmp_path: Path):
    """Verifies that generated preview JPEG is valid image."""
    jpg_path = tmp_path / "preview.jpg"
    generate_preview_jpeg(jpg_path, house_name="Test Property")

    assert jpg_path.exists()
    assert jpg_path.stat().st_size > 1000


def test_tour_package_assembly_and_validation(tmp_path: Path):
    """Verifies that assemble_tour_package produces a spec-compliant .tour ZIP."""
    work_dir = tmp_path / "work"
    tour_output = tmp_path / "output" / "myhouse.tour"

    assemble_tour_package(
        work_dir=work_dir,
        output_tour_path=tour_output,
        house_name="Sunset Villa",
        client_id="client_999",
        address="Goa, India",
    )

    assert tour_output.exists()
    assert zipfile.is_zipfile(tour_output)

    # Validate with validator
    result = validate_tour_package(tour_output)
    assert result["is_valid"] is True
    assert result["metadata"]["house_name"] == "Sunset Villa"
    assert result["metadata"]["client_id"] == "client_999"
    assert result["rooms_count"] >= 2

    # Check file entries
    with zipfile.ZipFile(tour_output, "r") as zf:
        namelist = set(zf.namelist())
        expected = {
            "manifest.json",
            "metadata.json",
            "rooms.json",
            "model_high.glb",
            "model_mid.glb",
            "model_low.glb",
            "navmesh.json",
            "preview.jpg",
        }
        assert expected.issubset(namelist)
