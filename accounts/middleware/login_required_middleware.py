# system/middleware/login_required_middleware.py
from django.conf import settings
from django.shortcuts import redirect
from django.urls import reverse, NoReverseMatch

DEFAULT_WHITELIST_PREFIXES = [
    '/static',
    '/media',
    '/admin',
    '/favicon.ico',
    '/login',
    '/logout',
    '/register',
    '/accounts',
]

class LoginRequiredMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

        # 基本白名单（可以在 settings.py 中覆盖或扩展）
        self.whitelist = list(DEFAULT_WHITELIST_PREFIXES)

        # 尝试把登录/登出/注册等视图名反解析加入白名单（安全方式）
        for name in getattr(settings, 'LOGIN_WHITELIST_NAMES', ['login', 'logout', 'register', 'password_reset']):
            try:
                url = reverse(name)
            except NoReverseMatch:
                # 如果没有定义该 name，则跳过
                continue
            # 确保以斜杠结尾以简化前缀匹配
            if not url.endswith('/'):
                url = url + '/'
            self.whitelist.append(url)

        # 可在 settings 中加入额外的 path 前缀白名单
        extra = getattr(settings, 'LOGIN_WHITELIST_PATHS', [])
        self.whitelist.extend(extra)

    def __call__(self, request):
        path = request.path
        print("current request path:", request.path)
        print("user is authenticated:", request.user.is_authenticated)
        # ['/static/', '/media/', '/admin/', '/favicon.ico', '/login', '/logout', '/health/', '/api/public/']
        # 1) 如果路径以任何白名单前缀开始 => 放行
        # print('whitelist path:', self.whitelist)
        if any(path.startswith(p) for p in self.whitelist):
            # print('not whitelisted path:', path)
            return self.get_response(request)

        # 2) 未登录则重定向（并带 next 参数）
        if not request.user.is_authenticated:
            login_url = getattr(settings, 'LOGIN_URL', '/login/')
            return redirect(f'{login_url}?next={request.path}')

        return self.get_response(request)
