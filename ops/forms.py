from django import forms
from .models import Host

class HostForm(forms.ModelForm):
    class Meta:
        model = Host
        fields = ["name", "ip", "port", "token", "note"]
        widgets = {
            "name": forms.TextInput(attrs={"class": "form-control", "placeholder": "主机编号/名称"}),
            "ip": forms.TextInput(attrs={"class": "form-control", "placeholder": "例如 192.168.1.10"}),
            "port": forms.NumberInput(attrs={"class": "form-control"}),
            "token": forms.TextInput(attrs={"class": "form-control", "placeholder": "与Agent一致"}),
            "note": forms.TextInput(attrs={"class": "form-control"}),
        }
