"""Regression guard for MinioFileSystem.acreate_file.

The MinIO SDK's ``put_object`` requires a file-like object with ``read()`` —
passing raw bytes raises ``'bytes' object has no attribute 'read'``. Voice
previews were the first real caller of ``acreate_file`` and hit this in prod,
so lock the contract: the content source is read via ``await`` and whatever
reaches ``put_object`` must be readable, not raw bytes.
"""

from unittest.mock import MagicMock

import pytest

from api.services.filesystem.minio import MinioFileSystem


class _AsyncBytes:
    def __init__(self, data: bytes) -> None:
        self._data = data

    async def read(self) -> bytes:
        return self._data


@pytest.mark.asyncio
async def test_acreate_file_streams_bytes_to_put_object():
    fs = MinioFileSystem.__new__(MinioFileSystem)  # skip __init__ (no server)
    fs.bucket_name = "voice-audio"
    fs.client = MagicMock()

    payload = b"RIFF....WAVE" * 4
    ok = await fs.acreate_file("voice-previews/x/y/Kore/hi.wav", _AsyncBytes(payload))

    assert ok is True
    fs.client.put_object.assert_called_once()
    kwargs = fs.client.put_object.call_args.kwargs
    data_arg = kwargs["data"] if "data" in kwargs else fs.client.put_object.call_args.args[2]
    assert hasattr(data_arg, "read")
    assert not isinstance(data_arg, (bytes, bytearray))
    assert data_arg.read() == payload
    assert kwargs["length"] == len(payload)


@pytest.mark.asyncio
async def test_acreate_file_accepts_sync_io_bytes():
    import io
    fs = MinioFileSystem.__new__(MinioFileSystem)
    fs.bucket_name = "voice-audio"
    fs.client = MagicMock()

    payload = b"test sync stream"
    ok = await fs.acreate_file("docs/test.txt", io.BytesIO(payload))
    assert ok is True
    fs.client.put_object.assert_called_once()


@pytest.mark.asyncio
async def test_acreate_file_accepts_raw_bytes():
    fs = MinioFileSystem.__new__(MinioFileSystem)
    fs.bucket_name = "voice-audio"
    fs.client = MagicMock()

    payload = b"test raw bytes"
    ok = await fs.acreate_file("docs/raw.txt", payload)
    assert ok is True
    fs.client.put_object.assert_called_once()


@pytest.mark.asyncio
async def test_minio_fallback_when_minio_fails(tmp_path):
    import io
    from api.services.filesystem.local import LocalFileSystem

    fs = MinioFileSystem.__new__(MinioFileSystem)
    fs.bucket_name = "voice-audio"
    fs.client = MagicMock()
    fs.client.put_object.side_effect = Exception("MinIO offline")
    fs.client.fget_object.side_effect = Exception("MinIO offline")
    fs.local_fallback = LocalFileSystem(str(tmp_path))

    payload = b"fallback data"
    # Test acreate_file succeeds locally when MinIO fails
    ok = await fs.acreate_file("fallback/test.txt", io.BytesIO(payload))
    assert ok is True

    # Test adownload_file reads from local fallback when MinIO fails
    dest = tmp_path / "downloaded.txt"
    dl_ok = await fs.adownload_file("fallback/test.txt", str(dest))
    assert dl_ok is True
    assert dest.read_bytes() == payload
