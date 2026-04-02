from __future__ import annotations

from typing import Any

from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.api_contract import BaselineJSONRenderer, build_api_envelope


class BaselineAPIView(APIView):
    renderer_classes = [BaselineJSONRenderer]

    def success_response(
        self,
        *,
        data: Any = None,
        code: str = "ok",
        message: str = "Request completed successfully.",
        status_code: int = status.HTTP_200_OK,
    ) -> Response:
        return Response(
            build_api_envelope(data=data, code=code, message=message),
            status=status_code,
        )


class BaselineGenericViewSet(viewsets.GenericViewSet):
    renderer_classes = [BaselineJSONRenderer]

    def success_response(
        self,
        *,
        data: Any = None,
        code: str = "ok",
        message: str = "Request completed successfully.",
        status_code: int = status.HTTP_200_OK,
    ) -> Response:
        return Response(
            build_api_envelope(data=data, code=code, message=message),
            status=status_code,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return self.success_response(
            code="deleted",
            message="Resource deleted successfully.",
        )


class BaselineModelViewSet(BaselineGenericViewSet, viewsets.ModelViewSet):
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            build_api_envelope(
                data=serializer.data,
                code="created",
                message="Resource created successfully.",
            ),
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return self.success_response(
            data=serializer.data,
            code="updated",
            message="Resource updated successfully.",
        )


def build_frontend_modes() -> list[str]:
    return list(getattr(settings, "SUPPORTED_FRONTEND_MODES", ()))
