from __future__ import annotations

from .models import DataFile
from .utils import parse_file_to_rows, rows_to_measurements


def ingest_uploaded_file(dataset, uploaded_file):
    data_file = DataFile.objects.create(
        dataset=dataset,
        file=uploaded_file,
        original_name=uploaded_file.name,
    )
    inserted = rows_to_measurements(
        dataset,
        parse_file_to_rows(data_file.file.file, data_file.original_name),
    )
    return data_file, inserted
