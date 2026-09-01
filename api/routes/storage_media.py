"""FastAPI router for serving storage media files (recordings, transcripts, audio assets).

Handles requests to `/voice-audio/{file_path:path}` (and configured MINIO_BUCKET) directly
from the active storage backend (MinIO, Local, S3). Supports HTTP Range requests for audio
seeking and streaming.
"""

import asyncio
import mimetypes
import os
import re
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import FileResponse, StreamingResponse
from loguru import logger

from api.constants import MINIO_BUCKET
from api.services.filesystem.local import LocalFileSystem
from api.services.filesystem.minio import MinioFileSystem
from api.services.filesystem.s3 import S3FileSystem
from api.services.storage import storage_fs

router = APIRouter(tags=["storage-media"])

MIME_TYPE_OVERRIDES = {
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".txt": "text/plain; charset=utf-8",
    ".csv": "text/csv; charset=utf-8",
    ".json": "application/json",
    ".pdf": "application/pdf",
}


def _infer_content_type(file_path: str, fallback: Optional[str] = None) -> str:
    """Infer media content-type from file extension, falling back to mimetypes or provided fallback."""
    _, ext = os.path.splitext(file_path.lower())
    if ext in MIME_TYPE_OVERRIDES:
        return MIME_TYPE_OVERRIDES[ext]
    guessed, _ = mimetypes.guess_type(file_path)
    if guessed:
        return guessed
    return fallback or "application/octet-stream"


def _parse_range_header(range_header: str, file_size: int) -> tuple[int, int]:
    """Parse a Range header like 'bytes=0-1000' or 'bytes=1000-'.

    Returns (start, end) inclusive byte offsets.
    Raises HTTPException(416) if range is invalid or unsatisfiable.
    """
    match = re.fullmatch(r"bytes=(\d*)-(\d*)", range_header.strip())
    if not match:
        raise HTTPException(
            status_code=416,
            detail="Invalid Range header format",
            headers={"Content-Range": f"bytes */{file_size}"},
        )

    start_str, end_str = match.groups()
    if not start_str and not end_str:
        raise HTTPException(
            status_code=416,
            detail="Invalid Range specification",
            headers={"Content-Range": f"bytes */{file_size}"},
        )

    if start_str and end_str:
        start = int(start_str)
        end = int(end_str)
    elif start_str:
        start = int(start_str)
        end = file_size - 1
    else:  # suffix byte range like bytes=-500
        suffix_length = int(end_str)
        start = max(0, file_size - suffix_length)
        end = file_size - 1

    if start >= file_size or end >= file_size or start > end:
        raise HTTPException(
            status_code=416,
            detail="Requested Range Not Satisfiable",
            headers={"Content-Range": f"bytes */{file_size}"},
        )

    return start, end


import io
import urllib.parse


async def _serve_minio_file(
    fs: MinioFileSystem, file_path: str, request: Request
) -> Response:
    """Serve a file from MinIO with Range support, falling back to local disk if MinIO is offline."""
    clean_path = file_path.lstrip("/")
    try:
        try:
            stat = await asyncio.to_thread(
                fs.client.stat_object, fs.bucket_name, clean_path
            )
        except Exception:
            if clean_path.startswith(f"{fs.bucket_name}/"):
                stripped = clean_path[len(fs.bucket_name) + 1:]
                stat = await asyncio.to_thread(
                    fs.client.stat_object, fs.bucket_name, stripped
                )
                clean_path = stripped
            else:
                raise
    except Exception as exc:
        if hasattr(fs, "local_fallback") and fs.local_fallback:
            try:
                return await _serve_local_file(fs.local_fallback, clean_path, request)
            except HTTPException:
                pass
        logger.warning(f"File not found in MinIO bucket '{fs.bucket_name}': {clean_path} ({exc})")
        raise HTTPException(status_code=404, detail="File not found") from exc

    file_size = stat.size
    content_type = _infer_content_type(clean_path, stat.content_type)
    range_header = request.headers.get("range")

    if range_header and range_header.startswith("bytes="):
        start, end = _parse_range_header(range_header, file_size)
        length = end - start + 1

        try:
            response_obj = await asyncio.to_thread(
                fs.client.get_object,
                fs.bucket_name,
                clean_path,
                offset=start,
                length=length,
            )
            data = await asyncio.to_thread(response_obj.read)
        except Exception as exc:
            logger.error(f"Error fetching range from MinIO for {clean_path}: {exc}")
            raise HTTPException(status_code=500, detail="Failed to read file range") from exc
        finally:
            try:
                response_obj.close()
                response_obj.release_conn()
            except Exception:
                pass

        return Response(
            content=data,
            status_code=206,
            media_type=content_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(len(data)),
                "Content-Disposition": "inline",
            },
        )

    # Full file read
    try:
        response_obj = await asyncio.to_thread(
            fs.client.get_object, fs.bucket_name, clean_path
        )
        data = await asyncio.to_thread(response_obj.read)
    except Exception as exc:
        logger.error(f"Error fetching object from MinIO for {clean_path}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to read file") from exc
    finally:
        try:
            response_obj.close()
            response_obj.release_conn()
        except Exception:
            pass

    return Response(
        content=data,
        status_code=200,
        media_type=content_type,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(len(data)),
            "Content-Disposition": "inline",
        },
    )


async def _serve_local_file(
    fs: LocalFileSystem, file_path: str, request: Request
) -> Response:
    """Serve a file from local filesystem."""
    clean_path = file_path.lstrip("/")
    full_path = fs._get_full_path(clean_path)
    if not os.path.exists(full_path):
        logger.warning(f"File not found on local disk: {full_path}")
        raise HTTPException(status_code=404, detail="File not found")

    content_type = _infer_content_type(clean_path)
    return FileResponse(
        full_path,
        media_type=content_type,
        content_disposition_type="inline",
    )


async def _serve_s3_file(
    fs: S3FileSystem, file_path: str, request: Request
) -> Response:
    """Serve or redirect an S3 object."""
    clean_path = file_path.lstrip("/")
    signed_url = await fs.aget_signed_url(file_path=clean_path, expiration=3600, force_inline=True)
    if not signed_url:
        raise HTTPException(status_code=404, detail="File not found")
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=signed_url, status_code=302)


async def serve_media_file(file_path: str, request: Request) -> Response:
    """Route file request to active storage backend."""
    decoded_path = urllib.parse.unquote(file_path)
    # Prevent directory traversal
    normalized = os.path.normpath(decoded_path).replace("\\", "/").lstrip("/")
    if normalized.startswith("../") or "/../" in normalized:
        raise HTTPException(status_code=400, detail="Invalid file path")

    if isinstance(storage_fs, MinioFileSystem):
        return await _serve_minio_file(storage_fs, normalized, request)
    elif isinstance(storage_fs, LocalFileSystem):
        return await _serve_local_file(storage_fs, normalized, request)
    elif isinstance(storage_fs, S3FileSystem):
        return await _serve_s3_file(storage_fs, normalized, request)
    else:
        # Fallback to Minio if duck-typed client exists
        if hasattr(storage_fs, "client") and hasattr(storage_fs, "bucket_name"):
            return await _serve_minio_file(storage_fs, normalized, request)
        raise HTTPException(status_code=500, detail="Storage backend unsupported")


async def save_media_file(file_path: str, request: Request) -> Response:
    """Save an uploaded file directly into the active storage backend."""
    decoded_path = urllib.parse.unquote(file_path)
    # Prevent directory traversal
    normalized = os.path.normpath(decoded_path).replace("\\", "/").lstrip("/")
    if normalized.startswith("../") or "/../" in normalized:
        raise HTTPException(status_code=400, detail="Invalid file path")

    try:
        body = await request.body()
        success = await storage_fs.acreate_file(normalized, io.BytesIO(body))
        if not success:
            logger.error(f"Failed to write uploaded media file to storage: {normalized}")
            raise HTTPException(status_code=500, detail="Failed to save file to storage")
        return Response(status_code=200)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error handling upload for {normalized}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to save file to storage") from exc


@router.get("/voice-audio/{file_path:path}", summary="Serve voice audio or transcript from storage")
async def get_voice_audio(file_path: str, request: Request):
    """Serve audio recordings, assets, and transcripts stored in voice-audio storage."""
    return await serve_media_file(file_path, request)


@router.put("/voice-audio/{file_path:path}", summary="Upload voice audio, document, or asset to storage")
async def put_voice_audio(file_path: str, request: Request):
    """Store uploaded audio recordings, assets, knowledge base documents, or campaign CSVs."""
    return await save_media_file(file_path, request)


if MINIO_BUCKET and MINIO_BUCKET != "voice-audio":
    @router.get(f"/{MINIO_BUCKET}/{{file_path:path}}", summary="Serve storage media from custom bucket")
    async def get_custom_bucket_media(file_path: str, request: Request):
        return await serve_media_file(file_path, request)

    @router.put(f"/{MINIO_BUCKET}/{{file_path:path}}", summary="Upload storage media to custom bucket")
    async def put_custom_bucket_media(file_path: str, request: Request):
        return await save_media_file(file_path, request)
