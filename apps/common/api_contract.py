from __future__ import annotations

from typing import Any

from django.http import JsonResponse
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

SUCCESS_ENVELOPE_KEYS = {"success", "code", "message", "data"}


def build_api_envelope(
    data: Any = None,
    *,
    success: bool = True,
    code: str = "ok",
    message: str = "Request completed successfully.",
) -> dict[str, Any]:
    return {
        "success": success,
        "code": code,
        "message": message,
        "data": data,
    }


def api_success_response(
    data: Any = None,
    *,
    code: str = "ok",
    message: str = "Request completed successfully.",
    status_code: int = status.HTTP_200_OK,
) -> JsonResponse:
    return JsonResponse(
        build_api_envelope(data=data, code=code, message=message),
        status=status_code,
    )


def api_error_response(
    data: Any = None,
    *,
    code: str = "request_error",
    message: str = "Request failed.",
    status_code: int = status.HTTP_400_BAD_REQUEST,
) -> JsonResponse:
    return JsonResponse(
        build_api_envelope(
            data=data,
            success=False,
            code=code,
            message=message,
        ),
        status=status_code,
    )


def extract_error_message(payload: Any) -> str:
    if isinstance(payload, list):
        return "; ".join(str(item) for item in payload if item) or "Request failed."
    if isinstance(payload, dict):
        for value in payload.values():
            message = extract_error_message(value)
            if message:
                return message
        return "Request failed."
    if payload in (None, ""):
        return "Request failed."
    return str(payload)


def baseline_exception_handler(
    exc: Exception, context: dict[str, Any]
) -> Response | None:
    from rest_framework.views import exception_handler as drf_exception_handler

    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    response.data = build_api_envelope(
        data=response.data,
        success=False,
        code=str(getattr(exc, "default_code", "request_error")),
        message=extract_error_message(response.data),
    )
    return response


class BaselineJSONRenderer(JSONRenderer):
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if data is None:
            response = (renderer_context or {}).get("response")
            if (
                response is not None
                and response.status_code == status.HTTP_204_NO_CONTENT
            ):
                response.status_code = status.HTTP_200_OK
                data = build_api_envelope(
                    data=None,
                    code="deleted",
                    message="Resource deleted successfully.",
                )

        if isinstance(data, dict) and SUCCESS_ENVELOPE_KEYS.issubset(data.keys()):
            return super().render(data, accepted_media_type, renderer_context)

        return super().render(
            build_api_envelope(data=data),
            accepted_media_type,
            renderer_context,
        )


class BaselinePageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        page_size = self.get_page_size(self.request) or self.page_size
        return Response(
            build_api_envelope(
                data={
                    "items": data,
                    "pagination": {
                        "page": self.page.number,
                        "page_size": page_size,
                        "count": self.page.paginator.count,
                        "pages": self.page.paginator.num_pages,
                        "next": self.get_next_link(),
                        "previous": self.get_previous_link(),
                    },
                }
            )
        )
