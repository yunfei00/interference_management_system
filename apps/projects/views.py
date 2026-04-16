from __future__ import annotations

from django.http import FileResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated

from accounts.models import User
from apps.common.api import BaselineGenericViewSet, BaselineModelViewSet
from apps.common.permissions import ApprovedUserPermission

from .models import Milestone, Project, ProjectAttachment, Task, TaskDependency
from .permissions import ensure_project_visibility
from .selectors import (
    build_projects_summary,
    get_accessible_projects_queryset,
    get_member_options_queryset,
    get_project_activity_queryset,
    get_project_attachments_queryset,
    get_project_list_queryset,
    get_project_milestones_queryset,
    get_project_tasks_queryset,
)
from .serializers import (
    AttachmentCreateSerializer,
    MilestoneSerializer,
    MilestoneWriteSerializer,
    ProjectActivitySerializer,
    ProjectAttachmentSerializer,
    ProjectDetailSerializer,
    ProjectListSerializer,
    ProjectMemberOptionSerializer,
    ProjectMemberUpdateSerializer,
    ProjectWriteSerializer,
    SubTaskSerializer,
    SubTaskWriteSerializer,
    TaskDependencyCreateSerializer,
    TaskDependencySerializer,
    TaskDetailSerializer,
    TaskListSerializer,
    TaskMoveSerializer,
    TaskProgressSerializer,
    TaskWriteSerializer,
)
from .services import (
    add_task_dependency,
    add_project_members,
    archive_project,
    create_attachment,
    create_milestone,
    create_project,
    create_subtask,
    create_task,
    delete_attachment,
    delete_milestone,
    delete_task,
    move_task,
    remove_project_member,
    remove_task_dependency,
    update_milestone,
    update_project,
    update_task,
    update_task_progress,
)


def download_response(attachment: ProjectAttachment) -> FileResponse:
    response = FileResponse(
        attachment.file.open("rb"),
        as_attachment=True,
        filename=attachment.file_name or attachment.file.name.rsplit("/", 1)[-1],
    )
    response["Accept-Ranges"] = "bytes"
    response["Cache-Control"] = "private, no-store"
    return response


@extend_schema(tags=["Projects"])
class ProjectViewSet(BaselineModelViewSet):
    permission_classes = [IsAuthenticated, ApprovedUserPermission]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return get_project_list_queryset(self.request.user, self.request.query_params)

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return ProjectWriteSerializer
        if self.action == "retrieve":
            return ProjectDetailSerializer
        return ProjectListSerializer

    def get_object(self):
        project = get_object_or_404(
            get_accessible_projects_queryset(self.request.user, include_archived=True),
            pk=self.kwargs["pk"],
        )
        ensure_project_visibility(self.request.user, project)
        return project

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        project = create_project(operator=request.user, data=serializer.validated_data, request=request)
        return self.success_response(
            data=ProjectDetailSerializer(project, context={"request": request}).data,
            code="created",
            message="Project created successfully.",
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        project = self.get_object()
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(
            data=request.data,
            partial=partial,
            context={"request": request, "project": project},
        )
        serializer.is_valid(raise_exception=True)
        updated = update_project(
            project=project,
            operator=request.user,
            data=serializer.validated_data,
            request=request,
        )
        return self.success_response(
            data=ProjectDetailSerializer(updated, context={"request": request}).data,
            code="updated",
            message="Project updated successfully.",
        )

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        archive_project(project=project, operator=request.user, request=request)
        return self.success_response(code="deleted", message="Project archived successfully.")

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        return self.success_response(data=build_projects_summary(request.user))

    @action(detail=False, methods=["get"], url_path="member-options")
    def member_options(self, request):
        keyword = (request.query_params.get("q") or "").strip()
        queryset = get_member_options_queryset(request.user, keyword)
        return self.success_response(
            data=ProjectMemberOptionSerializer(queryset[:50], many=True).data
        )

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        project = self.get_object()
        archive_project(project=project, operator=request.user, request=request)
        return self.success_response(
            data=ProjectDetailSerializer(project, context={"request": request}).data,
            code="updated",
            message="Project archived successfully.",
        )

    @action(detail=True, methods=["post"], url_path="members")
    def add_members(self, request, pk=None):
        project = self.get_object()
        serializer = ProjectMemberUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = add_project_members(
            project=project,
            operator=request.user,
            users=serializer.validated_users,
            request=request,
        )
        return self.success_response(
            data=ProjectDetailSerializer(updated, context={"request": request}).data,
            message="Project members updated successfully.",
        )

    @action(detail=True, methods=["delete"], url_path=r"members/(?P<user_id>\d+)")
    def remove_member(self, request, pk=None, user_id=None):
        project = self.get_object()
        member = get_object_or_404(User, pk=int(user_id))
        updated = remove_project_member(
            project=project,
            operator=request.user,
            member=member,
            request=request,
        )
        return self.success_response(
            data=ProjectDetailSerializer(updated, context={"request": request}).data,
            message="Member removed successfully.",
        )

    @action(detail=True, methods=["get"], url_path="dashboard")
    def dashboard(self, request, pk=None):
        project = self.get_object()
        ensure_project_visibility(request.user, project)

        task_queryset = get_project_tasks_queryset(request.user, project=project, params={})
        task_counts = {
            "total": task_queryset.count(),
            "todo": task_queryset.filter(status=Task.STATUS_TODO).count(),
            "in_progress": task_queryset.filter(status=Task.STATUS_IN_PROGRESS).count(),
            "blocked": task_queryset.filter(status=Task.STATUS_BLOCKED).count(),
            "done": task_queryset.filter(status=Task.STATUS_DONE).count(),
        }
        upcoming_tasks = task_queryset.exclude(status=Task.STATUS_DONE).filter(
            due_date__isnull=False
        ).order_by("due_date", "id")[:5]
        recent_activities = get_project_activity_queryset(
            request.user,
            project=project,
        )[:10]
        recent_tasks = task_queryset.order_by("-updated_at", "-id")[:5]
        milestone_queryset = get_project_milestones_queryset(request.user, project=project)

        return self.success_response(
            data={
                "project": ProjectDetailSerializer(project, context={"request": request}).data,
                "task_counts": task_counts,
                "upcoming_tasks": TaskListSerializer(
                    upcoming_tasks,
                    many=True,
                    context={"request": request},
                ).data,
                "recent_activities": ProjectActivitySerializer(
                    recent_activities,
                    many=True,
                ).data,
                "recent_tasks": TaskListSerializer(
                    recent_tasks,
                    many=True,
                    context={"request": request},
                ).data,
                "milestones": MilestoneSerializer(milestone_queryset[:5], many=True).data,
            }
        )

    @action(detail=True, methods=["get", "post"], url_path="tasks")
    def tasks(self, request, pk=None):
        project = self.get_object()
        ensure_project_visibility(request.user, project)

        if request.method.lower() == "post":
            serializer = TaskWriteSerializer(
                data=request.data,
                context={"request": request, "project": project},
            )
            serializer.is_valid(raise_exception=True)
            task = create_task(
                project=project,
                operator=request.user,
                data=serializer.validated_data,
                request=request,
            )
            return self.success_response(
                data=TaskDetailSerializer(task, context={"request": request}).data,
                code="created",
                message="Task created successfully.",
                status_code=status.HTTP_201_CREATED,
            )

        queryset = get_project_tasks_queryset(request.user, project=project, params=request.query_params)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = TaskListSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)
        return self.success_response(
            data=TaskListSerializer(queryset, many=True, context={"request": request}).data
        )

    @action(detail=True, methods=["get", "post"], url_path="milestones")
    def milestones(self, request, pk=None):
        project = self.get_object()
        ensure_project_visibility(request.user, project)

        if request.method.lower() == "post":
            serializer = MilestoneWriteSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            milestone = create_milestone(
                project=project,
                operator=request.user,
                data=serializer.validated_data,
                request=request,
            )
            return self.success_response(
                data=MilestoneSerializer(milestone).data,
                code="created",
                message="Milestone created successfully.",
                status_code=status.HTTP_201_CREATED,
            )

        queryset = get_project_milestones_queryset(request.user, project=project)
        return self.success_response(data=MilestoneSerializer(queryset, many=True).data)

    @action(detail=True, methods=["get", "post"], url_path="attachments", parser_classes=[MultiPartParser, FormParser])
    def attachments(self, request, pk=None):
        project = self.get_object()
        ensure_project_visibility(request.user, project)

        if request.method.lower() == "post":
            serializer = AttachmentCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            attachment = create_attachment(
                project=project,
                operator=request.user,
                upload=serializer.validated_data["file"],
                task=serializer.validated_data.get("task"),
                request=request,
            )
            return self.success_response(
                data=ProjectAttachmentSerializer(attachment).data,
                code="created",
                message="Attachment uploaded successfully.",
                status_code=status.HTTP_201_CREATED,
            )

        queryset = get_project_attachments_queryset(request.user, project=project)
        task_id = (request.query_params.get("task") or "").strip()
        if task_id.isdigit():
            queryset = queryset.filter(task_id=int(task_id))
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ProjectAttachmentSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return self.success_response(data=ProjectAttachmentSerializer(queryset, many=True).data)

    @action(detail=True, methods=["get"], url_path="activities")
    def activities(self, request, pk=None):
        project = self.get_object()
        ensure_project_visibility(request.user, project)
        queryset = get_project_activity_queryset(request.user, project=project)
        task_id = (request.query_params.get("task") or "").strip()
        if task_id.isdigit():
            queryset = queryset.filter(task_id=int(task_id))
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ProjectActivitySerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return self.success_response(data=ProjectActivitySerializer(queryset, many=True).data)


@extend_schema(tags=["Projects"])
class TaskViewSet(BaselineGenericViewSet):
    permission_classes = [IsAuthenticated, ApprovedUserPermission]
    parser_classes = [JSONParser]
    queryset = (
        Task.objects.filter(is_deleted=False)
        .select_related("project", "assignee", "milestone", "parent_task", "created_by")
        .prefetch_related("collaborators", "subtasks", "dependencies__depends_on", "attachments")
    )
    serializer_class = TaskDetailSerializer
    http_method_names = ["get", "put", "patch", "delete", "post", "head", "options"]

    def get_object(self):
        task = get_object_or_404(self.queryset, pk=self.kwargs["pk"])
        ensure_project_visibility(self.request.user, task.project)
        return task

    def retrieve(self, request, *args, **kwargs):
        task = self.get_object()
        return self.success_response(
            data=TaskDetailSerializer(task, context={"request": request}).data
        )

    def update(self, request, *args, **kwargs):
        task = self.get_object()
        partial = kwargs.pop("partial", False)
        serializer = TaskWriteSerializer(
            data=request.data,
            partial=partial,
            context={"request": request, "project": task.project, "task": task},
        )
        serializer.is_valid(raise_exception=True)
        updated = update_task(
            task=task,
            operator=request.user,
            data=serializer.validated_data,
            request=request,
        )
        return self.success_response(
            data=TaskDetailSerializer(updated, context={"request": request}).data,
            code="updated",
            message="Task updated successfully.",
        )

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()
        delete_task(task=task, operator=request.user, request=request)
        return self.success_response(code="deleted", message="Task deleted successfully.")

    @action(detail=True, methods=["post"], url_path="move")
    def move(self, request, pk=None):
        task = self.get_object()
        serializer = TaskMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = move_task(
            task=task,
            operator=request.user,
            target_status=serializer.validated_data["status"],
            target_order_index=serializer.validated_data["order_index"],
            request=request,
        )
        return self.success_response(
            data={
                "task": TaskDetailSerializer(result["task"], context={"request": request}).data,
                "column_orders": result["column_orders"],
            },
            code="updated",
            message="Task moved successfully.",
        )

    @action(detail=True, methods=["post"], url_path="progress")
    def progress(self, request, pk=None):
        task = self.get_object()
        serializer = TaskProgressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = update_task_progress(
            task=task,
            operator=request.user,
            progress=serializer.validated_data["progress"],
            request=request,
        )
        return self.success_response(
            data=TaskDetailSerializer(updated, context={"request": request}).data,
            code="updated",
            message="Task progress updated successfully.",
        )

    @action(detail=True, methods=["post"], url_path="subtasks")
    def subtasks(self, request, pk=None):
        task = self.get_object()
        serializer = SubTaskWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subtask = create_subtask(
            task=task,
            operator=request.user,
            data=serializer.validated_data,
            request=request,
        )
        return self.success_response(
            data=SubTaskSerializer(subtask).data,
            code="created",
            message="Subtask created successfully.",
            status_code=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="dependencies")
    def dependencies(self, request, pk=None):
        task = self.get_object()
        serializer = TaskDependencyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dependency = add_task_dependency(
            task=task,
            depends_on=serializer.validated_data["depends_on"],
            operator=request.user,
            request=request,
        )
        return self.success_response(
            data=TaskDependencySerializer(dependency).data,
            code="created",
            message="Task dependency created successfully.",
            status_code=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["delete"], url_path=r"dependencies/(?P<dependency_id>\d+)")
    def remove_dependency(self, request, pk=None, dependency_id=None):
        task = self.get_object()
        dependency = get_object_or_404(
            TaskDependency.objects.select_related("depends_on"),
            pk=int(dependency_id),
            task=task,
        )
        remove_task_dependency(
            task=task,
            dependency=dependency,
            operator=request.user,
            request=request,
        )
        return self.success_response(code="deleted", message="Task dependency removed successfully.")


@extend_schema(tags=["Projects"])
class MilestoneViewSet(BaselineGenericViewSet):
    permission_classes = [IsAuthenticated, ApprovedUserPermission]
    queryset = Milestone.objects.select_related("project").all()
    serializer_class = MilestoneSerializer
    http_method_names = ["put", "patch", "delete", "head", "options"]

    def get_object(self):
        milestone = get_object_or_404(self.queryset, pk=self.kwargs["pk"])
        ensure_project_visibility(self.request.user, milestone.project)
        return milestone

    def update(self, request, *args, **kwargs):
        milestone = self.get_object()
        partial = kwargs.pop("partial", False)
        serializer = MilestoneWriteSerializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated = update_milestone(
            milestone=milestone,
            operator=request.user,
            data=serializer.validated_data,
            request=request,
        )
        return self.success_response(
            data=MilestoneSerializer(updated).data,
            code="updated",
            message="Milestone updated successfully.",
        )

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        milestone = self.get_object()
        delete_milestone(milestone=milestone, operator=request.user, request=request)
        return self.success_response(code="deleted", message="Milestone deleted successfully.")


@extend_schema(tags=["Projects"])
class AttachmentViewSet(BaselineGenericViewSet):
    permission_classes = [IsAuthenticated, ApprovedUserPermission]
    queryset = ProjectAttachment.objects.select_related("project", "task", "uploaded_by").all()
    serializer_class = ProjectAttachmentSerializer
    http_method_names = ["get", "delete", "head", "options"]

    def get_object(self):
        attachment = get_object_or_404(self.queryset, pk=self.kwargs["pk"])
        ensure_project_visibility(self.request.user, attachment.project)
        return attachment

    def destroy(self, request, *args, **kwargs):
        attachment = self.get_object()
        delete_attachment(attachment=attachment, operator=request.user, request=request)
        return self.success_response(code="deleted", message="Attachment deleted successfully.")

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        attachment = self.get_object()
        return download_response(attachment)
