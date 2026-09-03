import json
import zipfile
from pathlib import Path
from typing import Dict, Any, List, Optional

from app.schemas import (
    ScanManifest,
    ScanMetadata,
    DevicesDocument,
    ScanRoomsDocument,
    PosesDocument,
)
from app.utils import logger


class ScanPackageInfo:
    def __init__(
        self,
        is_scan_package: bool,
        house_name: str,
        client_id: str,
        address: str,
        video_files: List[Path],
        rooms_doc: Optional[ScanRoomsDocument] = None,
        metadata_doc: Optional[ScanMetadata] = None,
        devices_doc: Optional[DevicesDocument] = None,
    ):
        self.is_scan_package = is_scan_package
        self.house_name = house_name
        self.client_id = client_id
        self.address = address
        self.video_files = video_files
        self.rooms_doc = rooms_doc
        self.metadata_doc = metadata_doc
        self.devices_doc = devices_doc


def unpack_and_inspect_scan(
    scan_file_path: Path,
    target_extract_dir: Path,
) -> ScanPackageInfo:
    """
    Extracts an incoming myhouse.scan package into target_extract_dir, validates
    manifest & metadata, and returns parsed ScanPackageInfo.
    """
    target_extract_dir.mkdir(parents=True, exist_ok=True)

    if not zipfile.is_zipfile(scan_file_path):
        raise ValueError(f"Uploaded file {scan_file_path.name} is not a valid ZIP/SCAN archive.")

    with zipfile.ZipFile(scan_file_path, "r") as zf:
        zf.extractall(target_extract_dir)

    # 1. Parse manifest
    manifest_file = target_extract_dir / "manifest.json"
    if manifest_file.exists():
        with open(manifest_file, "r", encoding="utf-8") as f:
            manifest_dict = json.load(f)
            ScanManifest.model_validate(manifest_dict)

    # 2. Parse metadata
    metadata_file = target_extract_dir / "metadata.json"
    metadata_doc = None
    house_name = "Scanned House"
    client_id = "client_001"
    address = "Unknown Address"
    if metadata_file.exists():
        with open(metadata_file, "r", encoding="utf-8") as f:
            metadata_dict = json.load(f)
            metadata_doc = ScanMetadata.model_validate(metadata_dict)
            house_name = metadata_doc.house_name
            client_id = metadata_doc.client_id
            address = metadata_doc.address

    # 3. Parse rooms
    rooms_file = target_extract_dir / "rooms.json"
    rooms_doc = None
    if rooms_file.exists():
        with open(rooms_file, "r", encoding="utf-8") as f:
            rooms_dict = json.load(f)
            rooms_doc = ScanRoomsDocument.model_validate(rooms_dict)

    # 4. Parse devices
    devices_file = target_extract_dir / "devices.json"
    devices_doc = None
    if devices_file.exists():
        with open(devices_file, "r", encoding="utf-8") as f:
            devices_dict = json.load(f)
            devices_doc = DevicesDocument.model_validate(devices_dict)

    # 5. Collect video files
    video_files: List[Path] = []
    videos_dir = target_extract_dir / "videos"
    if videos_dir.exists():
        for ext in ["*.mp4", "*.mov", "*.avi", "*.mkv"]:
            video_files.extend(videos_dir.glob(ext))
    else:
        # Check root of extract dir
        for ext in ["*.mp4", "*.mov", "*.avi", "*.mkv"]:
            video_files.extend(target_extract_dir.glob(ext))

    logger.info(
        f"Parsed .scan package for '{house_name}': {len(video_files)} video(s), "
        f"{len(rooms_doc.rooms) if rooms_doc else 0} room(s)"
    )

    return ScanPackageInfo(
        is_scan_package=True,
        house_name=house_name,
        client_id=client_id,
        address=address,
        video_files=video_files,
        rooms_doc=rooms_doc,
        metadata_doc=metadata_doc,
        devices_doc=devices_doc,
    )
