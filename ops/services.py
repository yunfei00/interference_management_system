# HTTP client for the Windows agent plus command execution helpers.
from __future__ import annotations

import json

import requests
from django.utils import timezone

from .models import CommandTask

DEFAULT_TIMEOUT = 6


class AgentError(Exception):
    pass


def _headers(host):
    return {"Authorization": f"Bearer {host.token}"}


def call_metrics(host, timeout=DEFAULT_TIMEOUT):
    url = f"http://{host.ip}:{host.port}/metrics"
    response = requests.get(url, headers=_headers(host), timeout=timeout)
    response.raise_for_status()
    return response.json()


def call_control(host, action: str, service_name: str | None = None, timeout=DEFAULT_TIMEOUT):
    url = f"http://{host.ip}:{host.port}/control"
    payload = {"action": action}
    if service_name:
        payload["service_name"] = service_name
    response = requests.post(url, json=payload, headers=_headers(host), timeout=timeout)
    if response.status_code >= 400:
        try:
            detail = response.json().get("detail")
        except Exception:
            detail = response.text
        raise AgentError(detail)
    return response.json()


def execute_command_for_host(host, command: str, operator, service_name: str | None = None):
    task = CommandTask.objects.create(
        host=host,
        command=command,
        payload={"service_name": service_name or ""},
        status="RUNNING",
        operator=str(operator),
    )
    try:
        result = call_control(host, command, service_name=service_name)
        task.status = "SUCCESS"
        if isinstance(result, (dict, list)):
            task.result = json.dumps(result, ensure_ascii=False)
        else:
            task.result = str(result)
    except Exception as exc:
        task.status = "FAILED"
        task.result = str(exc)
    finally:
        task.finished_at = timezone.now()
        task.save()
    return task


def execute_batch_command(hosts, command: str, operator, service_name: str | None = None):
    return [
        execute_command_for_host(
            host,
            command=command,
            operator=operator,
            service_name=service_name,
        )
        for host in hosts
    ]
