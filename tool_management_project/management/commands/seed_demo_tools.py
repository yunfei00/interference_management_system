"""批量写入工具仓库演示数据（多工具、多版本）。"""

from __future__ import annotations

from datetime import timedelta
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils import timezone

from tool_management_project.demo_tools_data import (
    DEMO_TOOL_CODES,
    DEMO_TOOLS,
    build_demo_content_bytes,
    demo_tool_count,
    demo_version_count,
)
from tool_management_project.models import Tool, ToolVersion
from tool_management_project.serializers import normalize_tags
from tool_management_project.services import sync_tool_latest

User = get_user_model()


class Command(BaseCommand):
    help = "写入干扰方向工具演示数据（可 --clear 按编码清理后重建）"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="删除 DEMO_TOOL_CODES 中的工具及其版本后重新 seed",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            deleted, _ = Tool.objects.filter(code__in=DEMO_TOOL_CODES).delete()
            self.stdout.write(self.style.WARNING(f"已清理演示工具（含级联版本），删除行数: {deleted}"))

        user = User.objects.filter(is_superuser=True).first()
        if user is None:
            user = User.objects.filter(is_staff=True).first()

        base_time = timezone.now()
        created_tools = 0
        created_versions = 0

        for idx, spec in enumerate(DEMO_TOOLS):
            if Tool.objects.filter(code=spec["code"]).exists():
                self.stdout.write(f"跳过已存在: {spec['code']}")
                continue
            tool = Tool.objects.create(
                name=spec["name"],
                code=spec["code"],
                category=spec["category"],
                department=spec["owner_department"],
                summary=spec["summary"],
                detail=spec["description"],
                status=spec["status"],
                tags=normalize_tags(spec.get("tags") or []),
                created_by=user,
            )
            created_tools += 1
            for vidx, ver in enumerate(spec["versions"]):
                raw = build_demo_content_bytes(spec["code"], ver["version"])
                cf = ContentFile(raw, name=ver["stub"])
                ToolVersion.objects.create(
                    tool=tool,
                    version=ver["version"],
                    release_notes=ver["release_notes"],
                    changelog=ver["changelog"],
                    file=cf,
                    file_name=ver["stub"],
                    file_size=len(raw),
                    created_by=user,
                    created_at=base_time
                    - timedelta(days=120 - idx * 6 - vidx * 2, hours=vidx),
                )
                created_versions += 1
            sync_tool_latest(tool.id)

        self.stdout.write(
            self.style.SUCCESS(
                f"演示数据定义: {demo_tool_count()} 个工具、{demo_version_count()} 个版本；"
                f"本次新建工具 {created_tools} 个、版本 {created_versions} 个。"
            ),
        )
