from django import forms

from .models import Tool


class ToolForm(forms.ModelForm):
    """Legacy form kept for compatibility with old Django pages."""

    class Meta:
        model = Tool
        fields = ["name", "code", "category", "department", "summary", "detail", "status", "tags"]
