# datahub/utils.py
import io, csv
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # 后端环境
import matplotlib.pyplot as plt

def parse_file_to_rows(fobj, filename):
    name = filename.lower()
    if name.endswith('.csv'):
        text = io.TextIOWrapper(fobj, encoding='utf-8', errors='ignore')
        reader = csv.DictReader(text)
        for row in reader:
            yield row
    elif name.endswith('.json'):
        import json
        data = json.load(fobj)
        # 期望为 list[dict]
        for row in data:
            yield row
    elif name.endswith(('.xls', '.xlsx')):
        df = pd.read_excel(fobj)
        for row in df.to_dict(orient='records'):
            yield row
    else:
        raise ValueError('不支持的文件类型')

def rows_to_measurements(dataset, rows):
    """
    期望列名：x, y, value（可大小写混排）；可选 device_id, timestamp
    """
    from .models import Measurement
    objs = []
    for r in rows:
        x = float(r.get('x') or r.get('X'))
        y = float(r.get('y') or r.get('Y'))
        value = float(r.get('value') or r.get('val') or r.get('VALUE'))
        m = Measurement(dataset=dataset, x=x, y=y, value=value,
                        device_id=r.get('device_id'), timestamp=r.get('timestamp') or None)
        objs.append(m)
    Measurement.objects.bulk_create(objs, batch_size=1000)
    return len(objs)

def heatmap_svg_from_queryset(qs, bins=50):
    """
    用 Matplotlib 生成可缩放 SVG：坐标轴 + 色条
    """
    df = pd.DataFrame(list(qs.values('x', 'y', 'value')))
    if df.empty:
        return b'<svg xmlns="http://www.w3.org/2000/svg"></svg>'
    x = df['x'].to_numpy()
    y = df['y'].to_numpy()
    v = df['value'].to_numpy()

    # 构建规则网格
    xi = np.linspace(x.min(), x.max(), bins)
    yi = np.linspace(y.min(), y.max(), bins)
    grid = np.zeros((bins, bins))
    count = np.zeros((bins, bins))

    # 简单的邻近桶格
    x_idx = np.clip(((x - x.min()) / (x.max() - x.min() + 1e-9) * (bins - 1)).astype(int), 0, bins-1)
    y_idx = np.clip(((y - y.min()) / (y.max() - y.min() + 1e-9) * (bins - 1)).astype(int), 0, bins-1)
    for xi0, yi0, val in zip(x_idx, y_idx, v):
        grid[yi0, xi0] += val
        count[yi0, xi0] += 1
    grid = np.divide(grid, np.maximum(count, 1))

    fig = plt.figure(figsize=(6, 4), dpi=96)
    ax = fig.add_subplot(111)
    im = ax.imshow(grid, origin='lower',
                   extent=[x.min(), x.max(), y.min(), y.max()],
                   aspect='auto')
    cbar = fig.colorbar(im, ax=ax)
    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_title('Heatmap')

    buf = io.BytesIO()
    fig.savefig(buf, format='svg', bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return buf.getvalue()
