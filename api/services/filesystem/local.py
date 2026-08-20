import asyncio
import os
from datetime import datetime
from typing import BinaryIO, Optional

import aiofiles

from .base import BaseFileSystem


class LocalFileSystem(BaseFileSystem):
    """Local filesystem implementation."""

    def __init__(self, base_path: str):
        """Initialize local filesystem.

        Args:
            base_path: Base directory path for file operations
        """
        self.base_path = base_path
        os.makedirs(base_path, exist_ok=True)

    def _get_full_path(self, file_path: str) -> str:
        """Get the full path by joining with base path."""
        return os.path.join(self.base_path, file_path)

    async def acreate_file(self, file_path: str, content: BinaryIO) -> bool:
        try:
            full_path = self._get_full_path(file_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)

            async with aiofiles.open(full_path, "wb") as f:
                await f.write(await content.read())
            return True
        except Exception:
            return False

    async def create_temp_file(self, file_path: str) -> bool:
        try:
            full_path = self._get_full_path(file_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)

            return True
        except Exception:
            return False

    async def aupload_file(self, local_path: str, destination_path: str) -> bool:
        try:
            full_dest_path = self._get_full_path(destination_path)
            os.makedirs(os.path.dirname(full_dest_path), exist_ok=True)

            async with (
                aiofiles.open(local_path, "rb") as src,
                aiofiles.open(full_dest_path, "wb") as dst,
            ):
                await dst.write(await src.read())
            return True
        except Exception:
            return False

    async def aget_signed_url(
        self,
        file_path: str,
        expiration: int = 3600,
        force_inline: bool = False,
        use_internal_endpoint: bool = False,
    ) -> Optional[str]:
        # Return URL pointing to /voice-audio endpoint
        try:
            full_path = self._get_full_path(file_path)
            if not os.path.exists(full_path):
                return None
            return f"/voice-audio/{file_path}"
        except Exception:
            return None

    async def aget_file_metadata(self, file_path: str) -> Optional[dict]:
        try:
            full_path = self._get_full_path(file_path)
            if not os.path.exists(full_path):
                return None
            stat = os.stat(full_path)
            return {
                "size": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_ctime),
                "modified_at": datetime.fromtimestamp(stat.st_mtime),
                "etag": None,
                "content_type": None,
                "storage_class": None,
            }
        except Exception:
            return None

    async def aget_presigned_put_url(
        self,
        file_path: str,
        expiration: int = 900,
        content_type: str = "text/csv",
        max_size: int = 10_485_760,
    ) -> Optional[str]:
        return f"/voice-audio/{file_path}"

    async def adownload_file(self, source_path: str, local_path: str) -> bool:
        try:
            full_source = self._get_full_path(source_path)
            if not os.path.exists(full_source):
                return False
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            async with (
                aiofiles.open(full_source, "rb") as src,
                aiofiles.open(local_path, "wb") as dst,
            ):
                await dst.write(await src.read())
            return True
        except Exception:
            return False

    async def acopy_file(self, source_path: str, destination_path: str) -> bool:
        try:
            full_source = self._get_full_path(source_path)
            full_dest = self._get_full_path(destination_path)
            if not os.path.exists(full_source):
                return False
            os.makedirs(os.path.dirname(full_dest), exist_ok=True)
            async with (
                aiofiles.open(full_source, "rb") as src,
                aiofiles.open(full_dest, "wb") as dst,
            ):
                await dst.write(await src.read())
            return True
        except Exception:
            return False
