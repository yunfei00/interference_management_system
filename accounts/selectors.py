from __future__ import annotations

from .permissions import build_menu_tree_for_user


def build_current_user_menu_tree(user) -> list[dict]:
    return build_menu_tree_for_user(user)
