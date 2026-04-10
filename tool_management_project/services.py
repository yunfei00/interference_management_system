from __future__ import annotations

import shutil
from pathlib import Path
from typing import Iterable

from django.conf import settings
from django.core.files import File
from django.core.files.uploadedfile import UploadedFile
from django.db import transaction
from django.utils import timezone
from django.utils.text import get_valid_filename

from .models import Tool, ToolUploadSession, ToolVersion


def sync_tool_latest(tool_id: int) -> None:
    """根据版本记录重算 is_latest 与 Tool.latest_version。"""
    qs = ToolVersion.objects.filter(tool_id=tool_id).order_by("-created_at", "-id")
    latest = qs.first()
    ToolVersion.objects.filter(tool_id=tool_id).update(is_latest=False)
    if latest is None:
        Tool.objects.filter(pk=tool_id).update(latest_version="", updated_at=timezone.now())
        return
    ToolVersion.objects.filter(pk=latest.pk).update(is_latest=True)
    Tool.objects.filter(pk=tool_id).update(
        latest_version=latest.version,
        updated_at=timezone.now(),
    )


def sanitize_upload_filename(filename: str) -> str:
    safe_name = Path(filename or "upload.bin").name.strip() or "upload.bin"
    return get_valid_filename(safe_name)[:255] or "upload.bin"


def create_upload_session(
    *,
    user,
    filename: str,
    file_size: int,
    chunk_size: int,
    total_chunks: int,
    checksum: str = "",
    target: str = ToolUploadSession.TARGET_TOOL_CREATE,
    tool: Tool | None = None,
) -> ToolUploadSession:
    safe_filename = sanitize_upload_filename(filename)
    existing = ToolUploadSession.objects.filter(
        user=user,
        tool=tool,
        target=target,
        filename=safe_filename,
        file_size=max(int(file_size or 0), 0),
        chunk_size=max(int(chunk_size or 1), 1),
        total_chunks=max(int(total_chunks or 1), 1),
        consumed_at__isnull=True,
    ).exclude(status=ToolUploadSession.STATUS_COMPLETED).order_by("-updated_at").first()
    if existing:
        return existing

    upload = ToolUploadSession.objects.create(
        upload_id=ToolUploadSession.generate_upload_id(),
        user=user,
        tool=tool,
        target=target,
        filename=safe_filename,
        file_size=max(int(file_size or 0), 0),
        chunk_size=max(int(chunk_size or 1), 1),
        total_chunks=max(int(total_chunks or 1), 1),
        checksum=(checksum or "")[:128],
    )
    temp_dir = get_upload_temp_dir(upload.upload_id)
    temp_dir.mkdir(parents=True, exist_ok=True)
    upload.temp_dir = str(temp_dir)
    upload.save(update_fields=["temp_dir", "updated_at"])
    return upload


def get_upload_temp_dir(upload_id: str) -> Path:
    return Path(settings.MEDIA_ROOT) / "tools" / "uploads" / "tmp" / upload_id


def get_upload_merged_dir(upload_id: str) -> Path:
    return Path(settings.MEDIA_ROOT) / "tools" / "uploads" / "merged" / upload_id


def get_chunk_file_path(upload: ToolUploadSession, chunk_index: int) -> Path:
    base = Path(upload.temp_dir) if upload.temp_dir else get_upload_temp_dir(upload.upload_id)
    return base / f"chunk_{chunk_index:06d}.part"


@transaction.atomic
def save_upload_chunk(upload: ToolUploadSession, chunk_index: int, chunk_file: UploadedFile) -> None:
    locked = ToolUploadSession.objects.select_for_update().get(pk=upload.pk)
    if chunk_index < 0 or chunk_index >= locked.total_chunks:
        raise ValueError("chunk index out of range")
    if locked.status in (ToolUploadSession.STATUS_COMPLETED, ToolUploadSession.STATUS_MERGING):
        return
    if locked.consumed_at is not None:
        raise ValueError("upload already consumed")

    chunk_path = get_chunk_file_path(locked, chunk_index)
    chunk_path.parent.mkdir(parents=True, exist_ok=True)
    with chunk_path.open("wb") as output:
        for part in chunk_file.chunks():
            output.write(part)

    uploaded_chunks: set[int] = set(int(item) for item in (locked.uploaded_chunks or []))
    uploaded_chunks.add(int(chunk_index))
    ordered = sorted(uploaded_chunks)
    locked.uploaded_chunks = ordered
    locked.uploaded_chunks_count = len(ordered)
    locked.status = (
        ToolUploadSession.STATUS_UPLOADING
        if len(ordered) < locked.total_chunks
        else ToolUploadSession.STATUS_WAITING
    )
    locked.error_message = ""
    locked.save(
        update_fields=[
            "uploaded_chunks",
            "uploaded_chunks_count",
            "status",
            "error_message",
            "updated_at",
        ]
    )


def _iter_merge_chunk_paths(upload: ToolUploadSession) -> Iterable[Path]:
    for index in range(upload.total_chunks):
        yield get_chunk_file_path(upload, index)


@transaction.atomic
def merge_upload_chunks(upload: ToolUploadSession) -> ToolUploadSession:
    locked = ToolUploadSession.objects.select_for_update().get(pk=upload.pk)
    uploaded = set(int(idx) for idx in (locked.uploaded_chunks or []))
    missing = [idx for idx in range(locked.total_chunks) if idx not in uploaded]
    if missing:
        # 兼容并发写入导致的 uploaded_chunks 元数据暂时不一致：以磁盘分片文件兜底重建。
        rebuilt = [
            idx for idx in range(locked.total_chunks) if get_chunk_file_path(locked, idx).exists()
        ]
        if len(rebuilt) > len(uploaded):
            uploaded = set(rebuilt)
            missing = [idx for idx in range(locked.total_chunks) if idx not in uploaded]
            locked.uploaded_chunks = sorted(uploaded)
            locked.uploaded_chunks_count = len(uploaded)
            locked.save(update_fields=["uploaded_chunks", "uploaded_chunks_count", "updated_at"])
    if missing:
        locked.status = ToolUploadSession.STATUS_FAILED
        locked.error_message = f"missing chunks: {missing[:10]}"
        locked.save(update_fields=["status", "error_message", "updated_at"])
        raise ValueError("missing chunks")

    locked.status = ToolUploadSession.STATUS_MERGING
    locked.error_message = ""
    locked.save(update_fields=["status", "error_message", "updated_at"])

    merged_dir = get_upload_merged_dir(locked.upload_id)
    merged_dir.mkdir(parents=True, exist_ok=True)
    merged_path = merged_dir / sanitize_upload_filename(locked.filename)

    with merged_path.open("wb") as merged_output:
        for chunk_path in _iter_merge_chunk_paths(locked):
            if not chunk_path.exists():
                raise ValueError(f"chunk missing during merge: {chunk_path.name}")
            with chunk_path.open("rb") as source:
                shutil.copyfileobj(source, merged_output, length=1024 * 1024)

    locked.status = ToolUploadSession.STATUS_COMPLETED
    locked.merged_file_path = str(merged_path)
    locked.completed_at = timezone.now()
    locked.error_message = ""
    locked.save(
        update_fields=[
            "status",
            "merged_file_path",
            "completed_at",
            "error_message",
            "updated_at",
        ]
    )
    return locked


def build_upload_progress(upload: ToolUploadSession) -> dict:
    uploaded_bytes = min(upload.uploaded_chunks_count * upload.chunk_size, upload.file_size)
    progress = 0
    if upload.file_size > 0:
        progress = min(round(uploaded_bytes / upload.file_size * 100, 2), 100.0)
    return {
        "upload_id": upload.upload_id,
        "status": upload.status,
        "uploaded_chunks": sorted(int(item) for item in (upload.uploaded_chunks or [])),
        "uploaded_chunks_count": upload.uploaded_chunks_count,
        "total_chunks": upload.total_chunks,
        "uploaded_bytes": uploaded_bytes,
        "file_size": upload.file_size,
        "progress": progress,
        "filename": upload.filename,
        "merged_file_path": upload.merged_file_path,
        "error_message": upload.error_message,
    }


def bind_upload_to_tool_version(*, upload: ToolUploadSession, version: ToolVersion) -> ToolVersion:
    if upload.status != ToolUploadSession.STATUS_COMPLETED or not upload.merged_file_path:
        raise ValueError("upload not completed")
    if upload.consumed_at is not None:
        raise ValueError("upload already consumed")

    merged_path = Path(upload.merged_file_path)
    if not merged_path.exists():
        raise ValueError("merged file not found")

    filename = sanitize_upload_filename(upload.filename)
    with merged_path.open("rb") as stream:
        version.file.save(filename, File(stream), save=False)

    version.file_name = filename
    version.file_size = upload.file_size or merged_path.stat().st_size
    if not version.checksum:
        version.checksum = upload.checksum
    version.save()

    upload.consumed_at = timezone.now()
    upload.save(update_fields=["consumed_at", "updated_at"])
    return version
