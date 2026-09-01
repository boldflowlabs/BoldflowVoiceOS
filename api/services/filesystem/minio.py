import asyncio
import inspect
import io
import json
from typing import Any, BinaryIO, Dict, Optional

from loguru import logger
from minio import Minio
from minio.error import S3Error

import os
from api.constants import APP_ROOT_DIR
from .base import BaseFileSystem
from .local import LocalFileSystem


class MinioFileSystem(BaseFileSystem):
    """MinIO implementation of the filesystem interface for OSS users.

    Two endpoints, two different purposes:
    - endpoint (host:port) + secure (bool): used by the MinIO SDK for
      container-to-container calls. The SDK requires these split.
    - public_endpoint (full URL, e.g. "https://example.com"): used verbatim
      when building URLs that browsers will fetch. Required.
    """

    def __init__(
        self,
        endpoint: str = "localhost:9000",
        access_key: str = "minioadmin",
        secret_key: str = "minioadmin",
        bucket_name: str = "voice-audio",
        secure: bool = False,
        public_endpoint: Optional[str] = None,
    ):
        if not public_endpoint:
            raise ValueError(
                "MinioFileSystem requires public_endpoint (set MINIO_PUBLIC_ENDPOINT). "
                "Expected a full URL with scheme, e.g. 'http://localhost:9000' or 'https://example.com'."
            )
        if not (
            public_endpoint.startswith("http://")
            or public_endpoint.startswith("https://")
        ):
            raise ValueError(
                f"MINIO_PUBLIC_ENDPOINT must include a scheme (http:// or https://), got: {public_endpoint!r}"
            )

        self.bucket_name = bucket_name
        self.endpoint = endpoint
        self.public_endpoint = public_endpoint.rstrip("/")
        self.secure = secure
        self.access_key = access_key
        self.secret_key = secret_key

        # Local fallback filesystem so audio is NEVER lost even if MinIO container is offline
        default_storage_dir = str(APP_ROOT_DIR.parent / "storage" / bucket_name)
        storage_dir = os.getenv("STORAGE_LOCAL_DIR") or default_storage_dir
        self.local_fallback = LocalFileSystem(storage_dir)

        # Client for internal operations (uploads, etc.)
        self.client = Minio(
            endpoint, access_key=access_key, secret_key=secret_key, secure=secure
        )

        # Ensure bucket exists and configure anonymous access (using internal client)
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)

            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": "*"},
                        "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
                        "Resource": [f"arn:aws:s3:::{self.bucket_name}/*"],
                    },
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": "*"},
                        "Action": ["s3:ListBucket"],
                        "Resource": [f"arn:aws:s3:::{self.bucket_name}"],
                    },
                ],
            }

            self.client.set_bucket_policy(self.bucket_name, json.dumps(policy))
        except Exception as e:
            logger.debug(f"Bucket setup note: {e}")
            pass

    async def acreate_file(self, file_path: str, content: Any) -> bool:
        clean_path = file_path.lstrip("/")
        fallback = getattr(self, "local_fallback", None)
        saved_locally = False
        try:
            if hasattr(content, "read"):
                res = content.read()
                data = await res if inspect.isawaitable(res) else res
            elif isinstance(content, (bytes, bytearray)):
                data = bytes(content)
            else:
                data = bytes(content)

            if fallback:
                saved_locally = await fallback.acreate_file(clean_path, io.BytesIO(data))

            def _put():
                self.client.put_object(
                    self.bucket_name,
                    clean_path,
                    data=io.BytesIO(data),
                    length=len(data),
                )

            await asyncio.to_thread(_put)
            return True
        except Exception as exc:
            logger.warning(f"MinIO put_object failed ({exc}), local fallback status: {saved_locally}")
            return saved_locally

    async def aupload_file(self, local_path: str, destination_path: str) -> bool:
        clean_path = destination_path.lstrip("/")
        fallback = getattr(self, "local_fallback", None)
        saved_locally = False
        try:
            if fallback:
                saved_locally = await fallback.aupload_file(local_path, clean_path)

            def _fput():
                self.client.fput_object(self.bucket_name, clean_path, local_path)

            await asyncio.to_thread(_fput)
            return True
        except Exception as exc:
            logger.warning(f"MinIO fput_object failed for {clean_path} ({exc}), local fallback status: {saved_locally}")
            return saved_locally

    async def aget_signed_url(
        self,
        file_path: str,
        expiration: int = 3600,
        force_inline: bool = False,
        use_internal_endpoint: bool = False,
    ) -> Optional[str]:
        clean_path = file_path.lstrip("/")
        try:
            if use_internal_endpoint:
                protocol = "https" if self.secure else "http"
                base = f"{protocol}://{self.endpoint}".rstrip("/")
            else:
                base = self.public_endpoint.rstrip("/")

            if base.endswith(f"/{self.bucket_name}"):
                return f"{base}/{clean_path}"

            if clean_path.startswith(f"{self.bucket_name}/"):
                return f"{base}/{clean_path}"

            return f"{base}/{self.bucket_name}/{clean_path}"
        except Exception as e:
            logger.error(f"Error generating MinIO URL: {e}")
            return None

    async def aget_file_metadata(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Get MinIO object metadata."""
        clean_path = file_path.lstrip("/")
        try:

            def _stat(k: str):
                return self.client.stat_object(self.bucket_name, k)

            try:
                stat = await asyncio.to_thread(_stat, clean_path)
            except Exception:
                if clean_path.startswith(f"{self.bucket_name}/"):
                    stripped = clean_path[len(self.bucket_name) + 1:]
                    stat = await asyncio.to_thread(_stat, stripped)
                else:
                    raise

            return {
                "size": stat.size,
                "created_at": stat.last_modified,
                "modified_at": stat.last_modified,
                "etag": stat.etag.strip('"') if stat.etag else None,
                "content_type": stat.content_type,
                "storage_class": None,  # MinIO doesn't have storage classes like S3
            }
        except Exception:
            fallback = getattr(self, "local_fallback", None)
            if fallback:
                return await fallback.aget_file_metadata(clean_path)
            return None

    async def aget_presigned_put_url(
        self,
        file_path: str,
        expiration: int = 900,
        content_type: str = "text/csv",
        max_size: int = 10_485_760,
    ) -> Optional[str]:
        """Generate an unsigned URL for direct file upload.

        For local MinIO development with anonymous upload enabled, we return
        a simple unsigned URL instead of a presigned URL. This avoids signature
        mismatch issues when the internal endpoint (minio:9000) differs from
        the public endpoint (localhost:9000).

        The bucket policy allows anonymous s3:PutObject, so no signature is needed.
        """
        try:
            clean = file_path.lstrip("/")
            url = f"{self.public_endpoint}/{self.bucket_name}/{clean}"
            logger.debug(f"Generated unsigned upload URL: {url}")
            return url
        except Exception as e:
            logger.error(f"Error generating MinIO upload URL: {e}")
            return None

    async def adownload_file(self, source_path: str, local_path: str) -> bool:
        """Download a file from MinIO to local path."""
        clean_path = source_path.lstrip("/")
        try:

            def _fget(k: str):
                self.client.fget_object(self.bucket_name, k, local_path)

            try:
                await asyncio.to_thread(_fget, clean_path)
                return True
            except Exception:
                if clean_path.startswith(f"{self.bucket_name}/"):
                    stripped = clean_path[len(self.bucket_name) + 1:]
                    await asyncio.to_thread(_fget, stripped)
                    return True
                raise
        except Exception as exc:
            logger.warning(f"MinIO fget_object failed for {clean_path} ({exc}), checking local fallback")
            fallback = getattr(self, "local_fallback", None)
            if fallback:
                return await fallback.adownload_file(clean_path, local_path)
            return False

    async def acopy_file(self, source_path: str, destination_path: str) -> bool:
        """Copy a file within MinIO (server-side copy)."""
        try:
            from minio.commonconfig import CopySource

            def _copy():
                self.client.copy_object(
                    self.bucket_name,
                    destination_path,
                    CopySource(self.bucket_name, source_path),
                )

            await asyncio.to_thread(_copy)
            return True
        except S3Error:
            return False
