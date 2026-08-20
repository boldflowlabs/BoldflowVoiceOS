import io
import os
import tempfile
import pytest
from unittest.mock import MagicMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes.storage_media import (
    _infer_content_type,
    _parse_range_header,
    router as storage_media_router,
)
from api.services.filesystem.local import LocalFileSystem


def test_infer_content_type():
    assert _infer_content_type("recordings/1/audio.wav") == "audio/wav"
    assert _infer_content_type("recordings/1/audio.mp3") == "audio/mpeg"
    assert _infer_content_type("recordings/1/audio.webm") == "audio/webm"
    assert _infer_content_type("transcripts/1.txt") == "text/plain; charset=utf-8"
    assert _infer_content_type("campaigns/1/data.csv") == "text/csv; charset=utf-8"
    assert _infer_content_type("other/file.unknown") == "application/octet-stream"


def test_parse_range_header():
    assert _parse_range_header("bytes=0-499", 1000) == (0, 499)
    assert _parse_range_header("bytes=500-", 1000) == (500, 999)
    assert _parse_range_header("bytes=-200", 1000) == (800, 999)

    with pytest.raises(Exception):
        _parse_range_header("bytes=1000-500", 1000)

    with pytest.raises(Exception):
        _parse_range_header("bytes=1500-", 1000)


def test_serve_local_storage_file():
    with tempfile.TemporaryDirectory() as tmpdir:
        test_file_path = os.path.join(tmpdir, "recordings", "123.wav")
        os.makedirs(os.path.dirname(test_file_path), exist_ok=True)
        with open(test_file_path, "wb") as f:
            f.write(b"RIFF" + b"\x00" * 100)

        local_fs = LocalFileSystem(tmpdir)

        app = FastAPI()
        app.include_router(storage_media_router)

        with patch("api.routes.storage_media.storage_fs", local_fs):
            client = TestClient(app)

            # Test successful fetch
            response = client.get("/voice-audio/recordings/123.wav")
            assert response.status_code == 200
            assert response.headers["content-type"].startswith("audio/wav")
            assert response.content == b"RIFF" + b"\x00" * 100

            # Test 404 for missing file
            response_404 = client.get("/voice-audio/recordings/nonexistent.wav")
            assert response_404.status_code == 404
            assert response_404.json() == {"detail": "File not found"}


def test_serve_minio_storage_file_and_range():
    app = FastAPI()
    app.include_router(storage_media_router)

    # Mock MinioFileSystem
    mock_fs = MagicMock()
    mock_fs.bucket_name = "voice-audio"

    # Stat mock
    mock_stat = MagicMock()
    mock_stat.size = 1000
    mock_stat.content_type = "audio/wav"
    mock_fs.client.stat_object.return_value = mock_stat

    # Stream mock
    class MockMinioResponse:
        def __init__(self, data: bytes):
            self.data = data
        def read(self, amt=None):
            return self.data
        def stream(self, chunk_size=32768):
            yield self.data
        def close(self):
            pass
        def release_conn(self):
            pass

    mock_fs.client.get_object.return_value = MockMinioResponse(b"A" * 1000)

    from api.services.filesystem.minio import MinioFileSystem
    with patch("api.routes.storage_media.isinstance", side_effect=lambda obj, cls: cls is MinioFileSystem or isinstance(obj, cls)):
        with patch("api.routes.storage_media.storage_fs", mock_fs):
            client = TestClient(app)

            # Full object request
            resp = client.get("/voice-audio/transcripts/42.txt")
            assert resp.status_code == 200
            assert resp.headers["content-type"].startswith("text/plain")

            # Range request
            mock_fs.client.get_object.return_value = MockMinioResponse(b"A" * 100)
            resp_range = client.get("/voice-audio/recordings/42.wav", headers={"Range": "bytes=0-99"})
            assert resp_range.status_code == 206
            assert resp_range.headers["content-range"] == "bytes 0-99/1000"
            assert resp_range.headers["accept-ranges"] == "bytes"
