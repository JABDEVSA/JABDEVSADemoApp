"""Deterministic CSV analysis worker. One JSON request/response per process.

Original CSV is never mutated. No third-party Python dependencies are needed.
"""
import csv
import io
import json
import math
import random
import statistics
import sys
from datetime import date, timedelta

MAX_ROWS = 20_000
MAX_COLUMNS = 80
MAX_BYTES = 1_000_000


def number(value):
    try:
        result = float(value.strip())
        return result if math.isfinite(result) else None
    except (ValueError, TypeError):
        return None


def parse(text):
    if not isinstance(text, str) or len(text.encode('utf-8')) > MAX_BYTES:
        raise ValueError('CSV must be UTF-8 text and no larger than 1 MB.')
    if '\x00' in text:
        raise ValueError('The file contains binary data. Please choose a UTF-8 CSV.')
    try:
        reader = csv.reader(io.StringIO(text.lstrip('\ufeff')), strict=True)
        headers = next(reader, [])
        headers = [h.strip() for h in headers]
        if not headers or len(headers) > MAX_COLUMNS or any(not h for h in headers):
            raise ValueError('Use 1–80 non-empty column headings.')
        if len(set(headers)) != len(headers):
            raise ValueError('Column headings must be unique.')
        rows = []
        for row in reader:
            if not row:
                continue
            if len(row) != len(headers):
                raise ValueError(f'Row {len(rows) + 2} has {len(row)} cells; expected {len(headers)}.')
            rows.append(row)
            if len(rows) > MAX_ROWS:
                raise ValueError('This demo supports up to 20,000 rows.')
        if not rows:
            raise ValueError('Add at least one data row below the headings.')
        return headers, rows
    except csv.Error as error:
        raise ValueError(f'Invalid CSV: {error}') from error


def write_csv(headers, rows, spreadsheet_safe=False):
    output = io.StringIO(newline='')
    writer = csv.writer(output, lineterminator='\r\n')
    writer.writerow(headers if not spreadsheet_safe else [safe_cell(h) for h in headers])
    for row in rows:
        writer.writerow([safe_cell(v) for v in row] if spreadsheet_safe else row)
    return output.getvalue()


def safe_cell(value):
    # Prevent formula execution when an exported CSV is opened in a spreadsheet.
    return "'" + value if value.lstrip().startswith(('=', '+', '-', '@')) and number(value) is None else value


def sample(kind):
    rng = random.Random(42)
    rows = []
    sizes = {'retail': 1200, 'subscriptions': 850, 'logistics': 640}
    if kind not in sizes:
        raise ValueError('Unknown sample dataset.')
    for i in range(sizes[kind]):
        day = (date(2026, 1, 1) + timedelta(days=i % 180)).isoformat()
        if kind == 'retail':
            headers = ['order_id', 'date', 'category', 'region', 'revenue', 'quantity', 'customer']
            row = [f'ORD-{i+1:04}', day, rng.choice(['Electronics', 'Home & living', 'Fashion', 'Outdoor']), rng.choice(['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape']), f'{rng.uniform(120, 4800):.2f}', str(rng.randint(1, 8)), f'Customer {i%240+1:03}']
        elif kind == 'subscriptions':
            headers = ['account_id', 'date', 'plan', 'region', 'monthly_revenue', 'seats', 'status']
            row = [f'ACC-{i+1:04}', day, rng.choice(['Starter', 'Growth', 'Enterprise']), rng.choice(['Gauteng', 'Western Cape', 'KwaZulu-Natal']), f'{rng.uniform(99, 1800):.2f}', str(rng.randint(1, 30)), rng.choice(['Active', 'Active', 'Trial', 'Cancelled'])]
        else:
            headers = ['delivery_id', 'date', 'service', 'region', 'distance_km', 'delivery_hours', 'status']
            row = [f'DEL-{i+1:04}', day, rng.choice(['Express', 'Standard', 'Economy']), rng.choice(['Gauteng', 'Western Cape', 'Limpopo']), str(rng.randint(5, 500)), str(rng.randint(2, 72)), rng.choice(['Delivered', 'Delivered', 'Delayed'])]
        if i % 31 == 0:
            row[3] = ''
        if i % 43 == 0:
            row[4] = ''
        if i % 37 == 0:
            row[2] = ' ' + row[2] + ' '
        if i % 97 == 0:
            row[4] = '98500'
        if i % 53 == 0 and rows:
            row = rows[-1].copy()
        rows.append(row)
    return {'csv': write_csv(headers, rows), 'name': {'retail': 'Retail sales', 'subscriptions': 'SaaS subscriptions', 'logistics': 'Delivery operations'}[kind] + '.csv'}


def profile(headers, rows):
    missing = sum(not cell.strip() for row in rows for cell in row)
    whitespace = sum(cell != cell.strip() for row in rows for cell in row)
    duplicates = len(rows) - len(set(tuple(row) for row in rows))
    columns = []
    outlier_cells = 0
    for index, name in enumerate(headers):
        values = [row[index] for row in rows]
        nonempty = [v for v in values if v.strip()]
        nums = [number(v) for v in nonempty]
        numeric = bool(nonempty) and all(v is not None for v in nums)
        col = {'name': name, 'type': 'number' if numeric else 'text', 'missing': len(values)-len(nonempty), 'unique': len(set(nonempty)), 'outliers': 0}
        if numeric:
            quartiles = statistics.quantiles(nums, n=4, method='inclusive') if len(nums) > 1 else [nums[0]] * 3
            iqr = quartiles[2] - quartiles[0]
            outliers = sum(v < quartiles[0]-1.5*iqr or v > quartiles[2]+1.5*iqr for v in nums)
            col.update(min=round(min(nums), 2), max=round(max(nums), 2), mean=round(statistics.mean(nums), 2), outliers=outliers)
            outlier_cells += outliers
        columns.append(col)
    denominator = len(rows) * len(headers)
    quality = max(0, round(100 * (1 - (missing + whitespace + duplicates * len(headers)) / denominator), 1))
    numeric_columns = [c for c in columns if c['type'] == 'number']
    category = next((i for i, c in enumerate(columns) if c['type'] == 'text' and 1 < c['unique'] <= 12), None)
    metric = headers.index(numeric_columns[0]['name']) if numeric_columns else None
    chart = []
    if category is not None:
        grouped = {}
        for row in rows:
            key = row[category].strip() or 'Missing'
            grouped[key] = grouped.get(key, 0) + ((number(row[metric]) or 0) if metric is not None else 1)
        chart = [{'name': k, 'value': round(v, 2)} for k, v in sorted(grouped.items(), key=lambda p: -p[1])]
    histogram = []
    if metric is not None:
        values = [number(row[metric]) for row in rows if number(row[metric]) is not None]
        lo, hi = min(values), max(values)
        step = (hi - lo) / 8 if hi != lo else 1
        buckets = [0] * 8
        for value in values:
            buckets[min(7, int((value - lo) / step))] += 1
        histogram = [{'name': f'{lo+i*step:,.0f}', 'value': count} for i, count in enumerate(buckets)]
    issues = [
        {'key': 'missing', 'title': 'Missing values', 'count': missing, 'unit': 'empty cells', 'description': 'Blank cells can leave gaps in analysis. Choose a replacement when cleaning.', 'severity': 'warning'},
        {'key': 'duplicates', 'title': 'Duplicate rows', 'count': duplicates, 'unit': 'repeated rows', 'description': 'Exact matches across every column. Keep the first occurrence when cleaning.', 'severity': 'warning'},
        {'key': 'whitespace', 'title': 'Inconsistent spacing', 'count': whitespace, 'unit': 'cells to trim', 'description': 'Leading or trailing spaces can split otherwise identical categories.', 'severity': 'info'},
        {'key': 'outliers', 'title': 'Unusual numeric values', 'count': outlier_cells, 'unit': 'cells to review', 'description': 'Flagged using the 1.5 × interquartile range rule. Review these; they are never removed automatically.', 'severity': 'info'}]
    return {'rows': len(rows), 'columnCount': len(headers), 'columns': columns, 'quality': quality, 'missing': missing, 'duplicates': duplicates, 'whitespace': whitespace, 'outliers': outlier_cells, 'issues': issues, 'chart': chart, 'chartLabel': headers[metric] if metric is not None else 'Row count', 'categoryLabel': headers[category] if category is not None else '', 'histogram': histogram}


def clean(headers, rows, options):
    if not isinstance(options, dict):
        raise ValueError('Cleaning options must be an object.')
    result = [row.copy() for row in rows]
    if options.get('trim'):
        result = [[v.strip() for v in row] for row in result]
    if options.get('fillMissing'):
        replacement = str(options.get('replacement', 'Unknown'))
        if not replacement.strip() or len(replacement) > 80:
            raise ValueError('Choose a replacement of 1–80 characters.')
        result = [[v if v.strip() else replacement for v in row] for row in result]
    if options.get('dropEmptyRows'):
        result = [row for row in result if any(v.strip() for v in row)]
    if options.get('deduplicate'):
        seen = set()
        unique = []
        for row in result:
            key = tuple(row)
            if key not in seen:
                seen.add(key)
                unique.append(row)
        result = unique
    if not result:
        raise ValueError('These options remove every row. Keep at least one data row.')
    return result


def handle(request):
    if not isinstance(request, dict):
        raise ValueError('Send a JSON object.')
    action = request.get('action', 'profile')
    if action == 'sample':
        return sample(request.get('kind'))
    headers, rows = parse(request.get('csv'))
    if action == 'validate':
        return {'rows': len(rows), 'columns': len(headers)}
    if action in ('preview', 'export'):
        original = profile(headers, rows)
        result = clean(headers, rows, request.get('options') or {})
        if action == 'export':
            return {'csv': write_csv(headers, result, spreadsheet_safe=True), 'rows': len(result)}
        return {'before': original, 'after': profile(headers, result), 'headers': headers, 'rows': result[:8], 'removedRows': len(rows)-len(result)}
    if action == 'rows':
        search = str(request.get('search', '')).casefold()
        filtered = [row for row in rows if any(search in v.casefold() for v in row)] if search else list(rows)
        column = request.get('sort', '')
        if column in headers:
            index = headers.index(column)
            numeric = all(number(row[index]) is not None for row in filtered if row[index].strip())
            filtered.sort(key=lambda row: (not row[index].strip(), (number(row[index]) or 0) if numeric else row[index].casefold()), reverse=request.get('direction') == 'desc')
        page_size = min(50, max(1, int(request.get('pageSize', 10))))
        pages = max(1, math.ceil(len(filtered) / page_size))
        page = min(pages, max(1, int(request.get('page', 1))))
        return {'headers': headers, 'rows': filtered[(page-1)*page_size:page*page_size], 'total': len(filtered), 'page': page, 'pages': pages, 'pageSize': page_size}
    return profile(headers, rows)


if __name__ == '__main__':
    sys.stdin.reconfigure(encoding='utf-8')
    sys.stdout.reconfigure(encoding='utf-8')
    try:
        print(json.dumps(handle(json.load(sys.stdin)), allow_nan=False))
    except (ValueError, TypeError, KeyError, OverflowError) as error:
        print(json.dumps({'error': str(error)}))
        sys.exit(2)
