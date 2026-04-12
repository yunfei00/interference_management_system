from __future__ import annotations

import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile

from .models import Tool, ToolUploadSession, ToolVersion

User = get_user_model()
MIN_CHUNK_SIZE = 256 * 1024


class ToolUploadApiTests(TestCase):
    def setUp(self):
        super().setUp()
        self.media_root = tempfile.mkdtemp(prefix="tool-upload-tests-")
        self.override = override_settings(MEDIA_ROOT=self.media_root)
        self.override.enable()

        self.user = User.objects.create_user(
            username="tool-admin",
            password="pass1234",
            is_staff=True,
            is_superuser=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def tearDown(self):
        self.override.disable()
        shutil.rmtree(self.media_root, ignore_errors=True)
        super().tearDown()

    def unwrap(self, response):
        payload = response.json()
        self.assertIn("success", payload)
        return payload

    def init_upload(self, *, target: str, filename: str, content: bytes, chunk_size: int, tool_id: int | None = None):
        total_chunks = max(1, (len(content) + chunk_size - 1) // chunk_size)
        body = {
            "filename": filename,
            "file_size": len(content),
            "chunk_size": chunk_size,
            "total_chunks": total_chunks,
            "target": target,
        }
        if tool_id is not None:
            body["tool_id"] = tool_id

        response = self.client.post("/api/v1/tools/uploads/init/", body, format="json")
        self.assertEqual(response.status_code, 201)
        payload = self.unwrap(response)
        return payload["data"]["upload_id"], total_chunks

    def upload_chunk(self, upload_id: str, chunk_index: int, data: bytes):
        response = self.client.post(
            f"/api/v1/tools/uploads/{upload_id}/chunks/{chunk_index}/",
            {
                "chunk": SimpleUploadedFile(f"chunk_{chunk_index}.part", data),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        return self.unwrap(response)

    def merge_upload(self, upload_id: str):
        response = self.client.post(f"/api/v1/tools/uploads/{upload_id}/merge/")
        return response, self.unwrap(response)

    def test_merge_reports_missing_chunks_and_allows_resume(self):
        tool = Tool.objects.create(
            name="EQ Tool",
            code="eq-tool",
            category="Inference",
            department="EM / Interference",
            created_by=self.user,
        )
        content = (b"a" * MIN_CHUNK_SIZE) + (b"b" * MIN_CHUNK_SIZE)
        upload_id, _ = self.init_upload(
            target=ToolUploadSession.TARGET_TOOL_VERSION,
            filename="eq.tar.gz",
            content=content,
            chunk_size=MIN_CHUNK_SIZE,
            tool_id=tool.id,
        )

        self.upload_chunk(upload_id, 0, content[:MIN_CHUNK_SIZE])

        merge_response, merge_payload = self.merge_upload(upload_id)
        self.assertEqual(merge_response.status_code, 400)
        self.assertEqual(merge_payload["code"], "merge_failed")
        self.assertEqual(merge_payload["data"]["missing_chunks"], [1])

        status_response = self.client.get(f"/api/v1/tools/uploads/{upload_id}/status/")
        self.assertEqual(status_response.status_code, 200)
        status_payload = self.unwrap(status_response)
        self.assertEqual(status_payload["data"]["missing_chunks"], [1])

        self.upload_chunk(upload_id, 1, content[MIN_CHUNK_SIZE:])
        final_merge_response, final_merge_payload = self.merge_upload(upload_id)
        self.assertEqual(final_merge_response.status_code, 200)
        self.assertEqual(final_merge_payload["data"]["missing_chunks"], [])
        self.assertEqual(final_merge_payload["data"]["status"], ToolUploadSession.STATUS_COMPLETED)

    def test_bind_upload_endpoint_is_json_and_idempotent(self):
        tool = Tool.objects.create(
            name="EQ Tool",
            code="eq-tool-bind",
            category="Inference",
            department="EM / Interference",
            created_by=self.user,
        )
        content = (b"a" * MIN_CHUNK_SIZE) + (b"b" * MIN_CHUNK_SIZE)
        upload_id, _ = self.init_upload(
            target=ToolUploadSession.TARGET_TOOL_VERSION,
            filename="eq-bind.tar.gz",
            content=content,
            chunk_size=MIN_CHUNK_SIZE,
            tool_id=tool.id,
        )

        self.upload_chunk(upload_id, 0, content[:MIN_CHUNK_SIZE])
        self.upload_chunk(upload_id, 1, content[MIN_CHUNK_SIZE:])
        merge_response, _ = self.merge_upload(upload_id)
        self.assertEqual(merge_response.status_code, 200)

        bind_body = {
            "upload_id": upload_id,
            "version": "v1.0.1",
            "release_notes": "first bind",
            "changelog": "- add deploy bundle",
        }
        first_bind = self.client.post(
            f"/api/v1/tools/{tool.id}/versions/bind-upload/",
            bind_body,
            format="json",
        )
        self.assertEqual(first_bind.status_code, 201)
        first_payload = self.unwrap(first_bind)
        version_id = first_payload["data"]["id"]

        second_bind = self.client.post(
            f"/api/v1/tools/{tool.id}/versions/bind-upload/",
            bind_body,
            format="json",
        )
        self.assertEqual(second_bind.status_code, 200)
        second_payload = self.unwrap(second_bind)
        self.assertEqual(second_payload["data"]["id"], version_id)

        upload = ToolUploadSession.objects.get(upload_id=upload_id)
        version = ToolVersion.objects.get(pk=version_id)
        self.assertEqual(upload.bound_version_id, version.id)
        self.assertEqual(version.version, "v1.0.1")
        self.assertEqual(version.file_size, len(content))

    def test_add_version_multipart_upload_still_supported(self):
        tool = Tool.objects.create(
            name="EQ Tool",
            code="eq-tool-multipart",
            category="Inference",
            department="EM / Interference",
            created_by=self.user,
        )

        response = self.client.post(
            f"/api/v1/tools/{tool.id}/versions/",
            {
                "version": "v2.0.0",
                "release_notes": "multipart upload",
                "changelog": "- multipart path",
                "file": SimpleUploadedFile("bundle.bin", b"abc123"),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 201)
        payload = self.unwrap(response)
        self.assertEqual(payload["data"]["version"], "v2.0.0")
        self.assertEqual(payload["data"]["file_size"], 6)

    def test_create_tool_with_uploaded_file_still_supported(self):
        content = b"small-binary"
        upload_id, _ = self.init_upload(
            target=ToolUploadSession.TARGET_TOOL_CREATE,
            filename="tool.bin",
            content=content,
            chunk_size=MIN_CHUNK_SIZE,
        )
        self.upload_chunk(upload_id, 0, content)
        merge_response, _ = self.merge_upload(upload_id)
        self.assertEqual(merge_response.status_code, 200)

        response = self.client.post(
            "/api/v1/tools/",
            {
                "name": "Create Tool",
                "code": "create-tool-upload",
                "category": "Inference",
                "department": "EM / Interference",
                "summary": "summary",
                "detail": "detail",
                "status": Tool.STATUS_ACTIVE,
                "initial_version": "v1.0.0",
                "release_notes": "initial release",
                "changelog": "- initial release",
                "upload_id": upload_id,
                "file_name": "tool.bin",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        payload = self.unwrap(response)
        self.assertEqual(payload["data"]["latest_version"], "v1.0.0")
        version = ToolVersion.objects.get(tool_id=payload["data"]["id"], version="v1.0.0")
        self.assertEqual(version.file_size, len(content))
