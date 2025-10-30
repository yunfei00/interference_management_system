# HTTP 客户端：与 Windows Agent 通讯
import requests

DEFAULT_TIMEOUT = 6

class AgentError(Exception):
    pass

def _headers(host):
        return {"Authorization": f"Bearer {host.token}"}

def call_metrics(host, timeout=DEFAULT_TIMEOUT):
    url = f"http://{host.ip}:{host.port}/metrics"
    r = requests.get(url, headers=_headers(host), timeout=timeout)
    r.raise_for_status()
    return r.json()

def call_control(host, action: str, service_name: str | None = None, timeout=DEFAULT_TIMEOUT):
    url = f"http://{host.ip}:{host.port}/control"
    payload = {"action": action}
    if service_name:
        payload["service_name"] = service_name
    r = requests.post(url, json=payload, headers=_headers(host), timeout=timeout)
    if r.status_code >= 400:
        try:
            detail = r.json().get("detail")
        except Exception:
            detail = r.text
        raise AgentError(detail)
    return r.json()
