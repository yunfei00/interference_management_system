from __future__ import annotations

import logging
import shutil
import time
from pathlib import Path
from typing import Iterable

from django.conf import settings
from django.core.files import File
from django.core.files.uploadedfile import UploadedFile
from django.db import OperationalError, connection, transaction
from django.utils import timezone
from django.utils.text import get_valid_filename

from .models import Tool, ToolUploadSession, ToolVersion

logger = logging.getLogger(__name__)
SQLITE_LOCK_RETRY_COUNT = 6
SQLITE_LOCK_RETRY_DELAY_SECONDS = 0.15


def sync_tool_latest(tool_id: int) -> None:
    """鏍规嵁鐗堟湰璁板綍閲嶇畻 is_latest 涓?Tool.latest_version銆?"""
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
    existing = (
        ToolUploadSession.objects.filter(
            user=user,
            tool=tool,
            target=target,
            filename=safe_filename,
            file_size=max(int(file_size or 0), 0),
            chunk_size=max(int(chunk_size or 1), 1),
            total_chunks=max(int(total_chunks or 1), 1),
            consumed_at__isnull=True,
        )
        .exclude(status=ToolUploadSession.STATUS_COMPLETED)
        .order_by("-updated_at")
        .first()
    )
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


def _parse_chunk_index_from_name(filename: str) -> int | None:
    stem = Path(filename).stem
    if not stem.startswith("chunk_"):
        return None
    raw_index = stem.removeprefix("chunk_")
    if not raw_index.isdigit():
        return None
    return int(raw_index)


def collect_uploaded_chunk_indexes(upload: ToolUploadSession) -> list[int]:
    confirmed: set[int] = set()

    for item in upload.uploaded_chunks or []:
        try:
            index = int(item)
        except (TypeError, ValueError):
            continue
        if 0 <= index < upload.total_chunks and get_chunk_file_path(upload, index).exists():
            confirmed.add(index)

    chunk_dir = Path(upload.temp_dir) if upload.temp_dir else get_upload_temp_dir(upload.upload_id)
    if chunk_dir.exists():
        for chunk_path in chunk_dir.glob("chunk_*.part"):
            index = _parse_chunk_index_from_name(chunk_path.name)
            if index is None or not (0 <= index < upload.total_chunks):
                continue
            confirmed.add(index)

    return sorted(confirmed)


def collect_missing_chunk_indexes(upload: ToolUploadSession, confirmed_chunks: list[int] | None = None) -> list[int]:
    confirmed = set(
        confirmed_chunks if confirmed_chunks is not None else collect_uploaded_chunk_indexes(upload)
    )
    return [index for index in range(upload.total_chunks) if index not in confirmed]


def sync_upload_chunk_state(upload: ToolUploadSession) -> tuple[list[int], list[int]]:
    confirmed_chunks = collect_uploaded_chunk_indexes(upload)
    missing_chunks = collect_missing_chunk_indexes(upload, confirmed_chunks)

    if (
        sorted(int(item) for item in (upload.uploaded_chunks or [])) != confirmed_chunks
        or upload.uploaded_chunks_count != len(confirmed_chunks)
    ):
        upload.uploaded_chunks = confirmed_chunks
        upload.uploaded_chunks_count = len(confirmed_chunks)
        upload.save(update_fields=["uploaded_chunks", "uploaded_chunks_count", "updated_at"])

    return confirmed_chunks, missing_chunks


def _is_sqlite_lock_error(exc: OperationalError) -> bool:
    return connection.vendor == "sqlite" and "database is locked" in str(exc).lower()


def _run_with_sqlite_lock_retry(func, *, upload_id: str, chunk_index: int | None = None):
    attempts = SQLITE_LOCK_RETRY_COUNT if connection.vendor == "sqlite" else 1
    for attempt in range(1, attempts + 1):
        try:
            return func()
        except OperationalError as exc:
            if not _is_sqlite_lock_error(exc) or attempt >= attempts:
                raise
            sleep_seconds = SQLITE_LOCK_RETRY_DELAY_SECONDS * attempt
            logger.warning(
                "tool upload sqlite lock retry upload_id=%s chunk_index=%s attempt=%s sleep_seconds=%.2f",
                upload_id,
                chunk_index,
                attempt,
                sleep_seconds,
            )
            time.sleep(sleep_seconds)
    raise RuntimeError("sqlite retry loop exhausted unexpectedly")


def _write_chunk_file(upload: ToolUploadSession, chunk_index: int, chunk_file: UploadedFile) -> None:
    chunk_path = get_chunk_file_path(upload, chunk_index)
    chunk_path.parent.mkdir(parents=True, exist_ok=True)
    with chunk_path.open("wb") as output:
        for part in chunk_file.chunks():
            output.write(part)


def save_upload_chunk(upload: ToolUploadSession, chunk_index: int, chunk_file: UploadedFile) -> ToolUploadSession:
    if chunk_index < 0 or chunk_index >= upload.total_chunks:
        raise ValueError("chunk index out of range")

    _write_chunk_file(upload, chunk_index, chunk_file)

    def persist_chunk_state() -> tuple[ToolUploadSession, list[int], list[int]]:
        with transaction.atomic():
            locked = ToolUploadSession.objects.select_for_update().get(pk=upload.pk)
            if chunk_index < 0 or chunk_index >= locked.total_chunks:
                raise ValueError("chunk index out of range")
            if locked.status == ToolUploadSession.STATUS_COMPLETED and locked.merged_file_path:
                confirmed_chunks, missing_chunks = sync_upload_chunk_state(locked)
                return locked, confirmed_chunks, missing_chunks
            if locked.consumed_at is not None:
                raise ValueError("upload already consumed")

            confirmed_chunks, missing_chunks = sync_upload_chunk_state(locked)
            locked.status = (
                ToolUploadSession.STATUS_UPLOADING
                if missing_chunks
                else ToolUploadSession.STATUS_WAITING
            )
            locked.error_message = ""
            locked.save(
                update_fields=[
                    "status",
                    "error_message",
                    "updated_at",
                ]
            )
            return locked, confirmed_chunks, missing_chunks

    locked, confirmed_chunks, missing_chunks = _run_with_sqlite_lock_retry(
        persist_chunk_state,
        upload_id=upload.upload_id,
        chunk_index=chunk_index,
    )
    logger.info(
        "tool upload chunk persisted upload_id=%s chunk_index=%s total_chunks=%s confirmed_chunk_count=%s missing_chunks=%s",
        locked.upload_id,
        chunk_index,
        locked.total_chunks,
        len(confirmed_chunks),
        missing_chunks[:20],
    )
    return locked


def _iter_merge_chunk_paths(upload: ToolUploadSession) -> Iterable[Path]:
    for index in range(upload.total_chunks):
        yield get_chunk_file_path(upload, index)


@transaction.atomic
def merge_upload_chunks(upload: ToolUploadSession) -> ToolUploadSession:
    locked = ToolUploadSession.objects.select_for_update().get(pk=upload.pk)
    confirmed_chunks, missing_chunks = sync_upload_chunk_state(locked)

    if locked.status == ToolUploadSession.STATUS_COMPLETED and locked.merged_file_path:
        merged_path = Path(locked.merged_file_path)
        if merged_path.exists():
            logger.info(
                "tool upload merge reused upload_id=%s total_chunks=%s confirmed_chunk_count=%s missing_chunks=%s complete_called=%s",
                locked.upload_id,
                locked.total_chunks,
                len(confirmed_chunks),
                missing_chunks[:20],
                True,
            )
            return locked

    if missing_chunks:
        locked.status = ToolUploadSession.STATUS_FAILED
        locked.error_message = f"missing chunks: {missing_chunks[:10]}"
        locked.save(update_fields=["status", "error_message", "updated_at"])
        logger.warning(
            "tool upload merge blocked upload_id=%s total_chunks=%s confirmed_chunk_count=%s missing_chunks=%s complete_called=%s",
            locked.upload_id,
            locked.total_chunks,
            len(confirmed_chunks),
            missing_chunks[:20],
            True,
        )
        raise ValueError("missing chunks")

    locked.status = ToolUploadSession.STATUS_MERGING
    locked.error_message = ""
    locked.save(update_fields=["status", "error_message", "updated_at"])

    merged_dir = get_upload_merged_dir(locked.upload_id)
    merged_dir.mkdir(parents=True, exist_ok=True)
    merged_path = merged_dir / sanitize_upload_filename(locked.filename)

    try:
        with merged_path.open("wb") as merged_output:
            for chunk_path in _iter_merge_chunk_paths(locked):
                if not chunk_path.exists():
                    missing_name = chunk_path.name
                    raise ValueError(f"chunk missing during merge: {missing_name}")
                with chunk_path.open("rb") as source:
                    shutil.copyfileobj(source, merged_output, length=1024 * 1024)
    except ValueError:
        locked.status = ToolUploadSession.STATUS_FAILED
        refreshed_confirmed, refreshed_missing = sync_upload_chunk_state(locked)
        locked.error_message = f"missing chunks: {refreshed_missing[:10]}"
        locked.save(update_fields=["status", "error_message", "updated_at"])
        logger.warning(
            "tool upload merge interrupted upload_id=%s total_chunks=%s confirmed_chunk_count=%s missing_chunks=%s complete_called=%s",
            locked.upload_id,
            locked.total_chunks,
            len(refreshed_confirmed),
            refreshed_missing[:20],
            True,
        )
        raise

    locked.status = ToolUploadSession.STATUS_COMPLETED
    locked.merged_file_path = str(merged_path)
    locked.completed_at = locked.completed_at or timezone.now()
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
    logger.info(
        "tool upload merge completed upload_id=%s total_chunks=%s confirmed_chunk_count=%s missing_chunks=%s complete_called=%s",
        locked.upload_id,
        locked.total_chunks,
        len(confirmed_chunks),
        [],
        True,
    )
    return locked


def build_upload_progress(upload: ToolUploadSession) -> dict:
    confirmed_chunks = collect_uploaded_chunk_indexes(upload)
    uploaded_chunks_count = len(confirmed_chunks)
    missing_chunks = collect_missing_chunk_indexes(upload, confirmed_chunks)
    uploaded_bytes = min(uploaded_chunks_count * upload.chunk_size, upload.file_size)
    progress = 0.0
    if upload.file_size > 0:
        progress = min(round(uploaded_bytes / upload.file_size * 100, 2), 100.0)
    return {
        "upload_id": upload.upload_id,
        "status": upload.status,
        "uploaded_chunks": confirmed_chunks,
        "uploaded_chunks_count": uploaded_chunks_count,
        "total_chunks": upload.total_chunks,
        "uploaded_bytes": uploaded_bytes,
        "file_size": upload.file_size,
        "progress": progress,
        "filename": upload.filename,
        "merged_file_path": upload.merged_file_path,
        "error_message": upload.error_message,
        "missing_chunks": missing_chunks,
    }


def _version_matches_upload(version: ToolVersion, upload: ToolUploadSession, merged_path: Path | None = None) -> bool:
    expected_name = sanitize_upload_filename(upload.filename)
    expected_size = upload.file_size
    expected_checksum = (upload.checksum or "").strip()

    if version.file_name != expected_name:
        return False

    if expected_size and version.file_size not in (0, expected_size):
        return False

    if expected_checksum and version.checksum and version.checksum != expected_checksum:
        return False

    if merged_path is not None and merged_path.exists() and version.file_size in (0, expected_size):
        actual_size = merged_path.stat().st_size
        if expected_size and actual_size != expected_size:
            return False

    return True


@transaction.atomic
def bind_upload_to_tool_version(*, upload: ToolUploadSession, version: ToolVersion) -> ToolVersion:
    locked = (
        ToolUploadSession.objects.select_for_update()
        .select_related("bound_version", "tool")
        .get(pk=upload.pk)
    )

    if locked.bound_version_id:
        if locked.bound_version_id != version.id:
            raise ValueError("upload already bound to another version")
        logger.info(
            "tool upload bind reused upload_id=%s version_id=%s tool_id=%s",
            locked.upload_id,
            version.id,
            version.tool_id,
        )
        return locked.bound_version or version

    if locked.target == ToolUploadSession.TARGET_TOOL_VERSION and locked.tool_id:
        if locked.tool_id != version.tool_id:
            raise ValueError("upload belongs to another tool")

    if locked.status != ToolUploadSession.STATUS_COMPLETED or not locked.merged_file_path:
        raise ValueError("upload not completed")

    merged_path = Path(locked.merged_file_path)
    if not merged_path.exists():
        raise ValueError("merged file not found")

    if locked.consumed_at is not None:
        if _version_matches_upload(version, locked, merged_path):
            locked.bound_version = version
            locked.save(update_fields=["bound_version", "updated_at"])
            logger.info(
                "tool upload bind recovered upload_id=%s version_id=%s tool_id=%s",
                locked.upload_id,
                version.id,
                version.tool_id,
            )
            return version
        raise ValueError("upload already consumed")

    filename = sanitize_upload_filename(locked.filename)
    with merged_path.open("rb") as stream:
        version.file.save(filename, File(stream), save=False)

    version.file_name = filename
    version.file_size = locked.file_size or merged_path.stat().st_size
    if not version.checksum:
        version.checksum = locked.checksum
    version.save()

    locked.bound_version = version
    locked.consumed_at = locked.consumed_at or timezone.now()
    locked.save(update_fields=["bound_version", "consumed_at", "updated_at"])
    logger.info(
        "tool upload bound upload_id=%s version_id=%s tool_id=%s",
        locked.upload_id,
        version.id,
        version.tool_id,
    )
    return version


@transaction.atomic
def create_tool_version_from_upload(
    *,
    tool: Tool,
    user,
    upload_id: str,
    version: str,
    release_notes: str = "",
    changelog: str = "",
) -> tuple[ToolVersion, bool]:
    try:
        upload = (
            ToolUploadSession.objects.select_for_update()
            .select_related("bound_version", "tool")
            .get(upload_id=upload_id, user=user)
        )
    except ToolUploadSession.DoesNotExist as exc:
        raise ValueError("upload session is invalid") from exc

    if upload.target != ToolUploadSession.TARGET_TOOL_VERSION:
        raise ValueError("upload target mismatch")
    if upload.tool_id and upload.tool_id != tool.id:
        raise ValueError("upload belongs to another tool")

    if upload.bound_version_id:
        bound_version = upload.bound_version
        if bound_version and bound_version.tool_id == tool.id and bound_version.version == version:
            sync_tool_latest(tool.id)
            return bound_version, False
        raise ValueError("upload already bound to another version")

    existing = ToolVersion.objects.filter(tool=tool, version=version).first()
    if existing is not None:
        merged_path = Path(upload.merged_file_path) if upload.merged_file_path else None
        if upload.consumed_at is not None and _version_matches_upload(existing, upload, merged_path):
            upload.bound_version = existing
            upload.save(update_fields=["bound_version", "updated_at"])
            sync_tool_latest(tool.id)
            return existing, False
        raise ValueError("Version already exists.")

    row = ToolVersion.objects.create(
        tool=tool,
        version=version,
        release_notes=release_notes,
        changelog=changelog,
        created_by=user,
    )
    bind_upload_to_tool_version(upload=upload, version=row)
    sync_tool_latest(tool.id)
    return row, True
