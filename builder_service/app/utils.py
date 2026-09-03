import json
import logging
import struct
from pathlib import Path
from typing import Tuple
from PIL import Image, ImageDraw, ImageFont

# -----------------------------------------------------------------------------
# Logging Setup
# -----------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger("housetour.builder")


# -----------------------------------------------------------------------------
# 1. Pure-Python Structurally Valid glTF 2.0 Binary (.glb) Generator
# -----------------------------------------------------------------------------
def create_mesh_geometry(lod_level: str = "high") -> Tuple[bytes, bytes, int, int]:
    """
    Generates binary vertices (positions: 3x float32) and indices (uint16)
    representing a multi-room house architectural layout.
    """
    # Base room layout vertices: [x, y, z] in meters (Y up)
    # Living room + kitchen + bedroom floor and simple room partitions
    base_vertices = [
        # Floor (Living Room)
        0.0, 0.0, 0.0,
        5.0, 0.0, 0.0,
        5.0, 0.0, 6.0,
        0.0, 0.0, 6.0,
        # Ceiling (Living Room)
        0.0, 2.8, 0.0,
        5.0, 2.8, 0.0,
        5.0, 2.8, 6.0,
        0.0, 2.8, 6.0,
        # Kitchen Floor
        5.0, 0.0, 0.0,
        9.0, 0.0, 0.0,
        9.0, 0.0, 6.0,
        5.0, 0.0, 6.0,
        # Kitchen Ceiling
        5.0, 2.8, 0.0,
        9.0, 2.8, 0.0,
        9.0, 2.8, 6.0,
        5.0, 2.8, 6.0,
    ]

    base_indices = [
        # Living room floor
        0, 1, 2,  0, 2, 3,
        # Living room ceiling
        4, 6, 5,  4, 7, 6,
        # Living room back wall
        0, 4, 1,  1, 4, 5,
        # Living room left wall
        0, 3, 4,  3, 7, 4,
        # Kitchen floor
        8, 9, 10, 8, 10, 11,
        # Kitchen ceiling
        12, 14, 13, 12, 15, 14,
        # Kitchen right wall
        9, 13, 10, 10, 13, 14,
    ]

    # Adjust geometry resolution based on LOD level
    if lod_level == "low":
        # Simplified geometry: Just living room floor & ceiling
        verts = base_vertices[:24]
        inds = base_indices[:12]
    elif lod_level == "mid":
        verts = base_vertices
        inds = base_indices
    else:  # "high"
        # Full geometry plus decorative architectural subdivisions
        verts = list(base_vertices)
        inds = list(base_indices)
        # Add center pillar / island counter
        offset = len(verts) // 3
        island = [
            2.0, 0.0, 2.5,
            3.5, 0.0, 2.5,
            3.5, 0.9, 3.5,
            2.0, 0.9, 3.5,
        ]
        verts.extend(island)
        inds.extend([offset, offset+1, offset+2, offset, offset+2, offset+3])

    # Pack positions as IEEE 754 float32
    pos_bytes = struct.pack(f"<{len(verts)}f", *verts)
    # Pack indices as unsigned 16-bit integers
    ind_bytes = struct.pack(f"<{len(inds)}H", *inds)

    num_vertices = len(verts) // 3
    num_indices = len(inds)

    return pos_bytes, ind_bytes, num_vertices, num_indices


def generate_valid_glb(output_path: Path, lod_name: str = "high") -> Path:
    """
    Constructs and writes a 100% spec-compliant glTF 2.0 Binary (.glb) file.
    No external 3D engine required.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    pos_bytes, ind_bytes, num_verts, num_inds = create_mesh_geometry(lod_name)

    # Pad buffers to 4-byte boundaries
    pos_pad = (4 - (len(pos_bytes) % 4)) % 4
    pos_bytes_padded = pos_bytes + b"\x00" * pos_pad

    ind_pad = (4 - (len(ind_bytes) % 4)) % 4
    ind_bytes_padded = ind_bytes + b"\x00" * ind_pad

    bin_data = ind_bytes_padded + pos_bytes_padded
    bin_pad = (4 - (len(bin_data) % 4)) % 4
    bin_data_padded = bin_data + b"\x00" * bin_pad

    ind_byte_offset = 0
    ind_byte_length = len(ind_bytes)
    pos_byte_offset = len(ind_bytes_padded)
    pos_byte_length = len(pos_bytes)

    # Calculate bounding box for accessor
    all_floats = struct.unpack(f"<{len(pos_bytes)//4}f", pos_bytes)
    xs = all_floats[0::3]
    ys = all_floats[1::3]
    zs = all_floats[2::3]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    min_z, max_z = min(zs), max(zs)

    gltf_json = {
        "asset": {
            "version": "2.0",
            "generator": f"HouseTour-Builder-v1.0.0 (LOD: {lod_name})",
        },
        "scenes": [{"nodes": [0]}],
        "scene": 0,
        "nodes": [{"mesh": 0, "name": f"HouseMesh_{lod_name.capitalize()}"}],
        "meshes": [
            {
                "name": f"HouseStructure_{lod_name}",
                "primitives": [
                    {
                        "attributes": {"POSITION": 1},
                        "indices": 0,
                        "mode": 4,  # TRIANGLES
                        "material": 0,
                    }
                ],
            }
        ],
        "materials": [
            {
                "name": "InteriorMat",
                "pbrMetallicRoughness": {
                    "baseColorFactor": [0.85, 0.88, 0.92, 1.0],
                    "metallicFactor": 0.1,
                    "roughnessFactor": 0.6,
                },
                "doubleSided": True,
            }
        ],
        "accessors": [
            {
                "bufferView": 0,
                "byteOffset": ind_byte_offset,
                "componentType": 5123,  # UNSIGNED_SHORT
                "count": num_inds,
                "type": "SCALAR",
                "max": [num_verts - 1],
                "min": [0],
            },
            {
                "bufferView": 1,
                "byteOffset": 0,
                "componentType": 5126,  # FLOAT
                "count": num_verts,
                "type": "VEC3",
                "max": [round(max_x, 4), round(max_y, 4), round(max_z, 4)],
                "min": [round(min_x, 4), round(min_y, 4), round(min_z, 4)],
            },
        ],
        "bufferViews": [
            {
                "buffer": 0,
                "byteOffset": 0,
                "byteLength": ind_byte_length,
                "target": 34963,  # ELEMENT_ARRAY_BUFFER
            },
            {
                "buffer": 0,
                "byteOffset": pos_byte_offset,
                "byteLength": pos_byte_length,
                "target": 34962,  # ARRAY_BUFFER
            },
        ],
        "buffers": [{"byteLength": len(bin_data_padded)}],
    }

    json_str = json.dumps(gltf_json, separators=(",", ":"))
    json_bytes = json_str.encode("utf-8")
    json_pad = (4 - (len(json_bytes) % 4)) % 4
    json_bytes_padded = json_bytes + b" " * json_pad

    # GLB Header: magic (4B), version (4B), length (4B)
    glb_header_len = 12
    json_chunk_header_len = 8
    bin_chunk_header_len = 8
    total_glb_len = (
        glb_header_len
        + json_chunk_header_len
        + len(json_bytes_padded)
        + bin_chunk_header_len
        + len(bin_data_padded)
    )

    with open(output_path, "wb") as f:
        # Header
        f.write(struct.pack("<4sII", b"glTF", 2, total_glb_len))
        # JSON Chunk
        f.write(struct.pack("<II", len(json_bytes_padded), 0x4E4F534A))  # "JSON"
        f.write(json_bytes_padded)
        # BIN Chunk
        f.write(struct.pack("<II", len(bin_data_padded), 0x004E4942))  # "BIN\0"
        f.write(bin_data_padded)

    logger.info(f"Generated valid GLB ({lod_name}) at {output_path} ({total_glb_len} bytes)")
    return output_path


# -----------------------------------------------------------------------------
# 2. Preview Thumbnail Generator
# -----------------------------------------------------------------------------
def generate_preview_jpeg(output_path: Path, house_name: str = "HouseTour 3D Space") -> Path:
    """
    Creates a modern 1280x720 high-res architectural gradient preview image.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    width, height = 1280, 720
    img = Image.new("RGB", (width, height), color=(15, 23, 42))  # Deep slate onyx

    draw = ImageDraw.Draw(img)

    # Draw stylish architectural grid lines
    for x in range(0, width, 60):
        draw.line([(x, 0), (x, height)], fill=(30, 41, 59), width=1)
    for y in range(0, height, 60):
        draw.line([(0, y), (width, y)], fill=(30, 41, 59), width=1)

    # Gradient highlight rect
    draw.rectangle([80, 80, width - 80, height - 80], outline=(6, 182, 212), width=3)
    draw.rectangle([90, 90, width - 90, height - 90], fill=(24, 34, 53))

    # Text overlay
    draw.text((140, 200), "HOUSETUR 3D SPATIAL TOUR", fill=(6, 182, 212))
    draw.text((140, 260), house_name.upper(), fill=(248, 250, 252))
    draw.text((140, 360), "AUTOMATED RECONSTRUCTION ENGINE v1.0", fill=(148, 163, 184))
    draw.text((140, 420), "• 6-DOF Free Movement   • Multi-LOD glTF 2.0   • Convex NavMesh", fill=(16, 185, 129))

    img.save(output_path, "JPEG", quality=90)
    logger.info(f"Generated preview JPEG at {output_path}")
    return output_path
