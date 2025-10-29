# datahub/forms.py
from django import forms
from .models import Dataset, DataFile

class DatasetForm(forms.ModelForm):
    class Meta:
        model = Dataset
        fields = ['name', 'description']

class UploadForm(forms.Form):
    dataset = forms.ModelChoiceField(queryset=Dataset.objects.all(), label='数据集')
    file = forms.FileField(label='数据文件（CSV/JSON/Excel）')
