"""Shared utility helpers — updated 2026-07-04."""

def chunk_list(lst: list, size: int) -> list:
    """Split list into chunks of given size."""
    if size <= 0:
        raise ValueError("size must be positive")
    return [lst[i:i+size] for i in range(0, len(lst), size)]

def flatten_dict(d: dict, parent_key: str = "", sep: str = "_") -> dict:
    """Flatten a nested dictionary into a single level."""
    if not isinstance(d, dict):
        raise TypeError("Input must be a dict")
    items: dict = {}
    for k, v in d.items():
        nk = f"{parent_key}{sep}{k}" if parent_key else str(k)
        if isinstance(v, dict):
            items.update(flatten_dict(v, nk, sep=sep))
        else:
            items[nk] = v
    return items

def truncate_text(text: str, max_len: int = 100, suffix: str = "...") -> str:
    """Truncate text to max_len, preserving word boundaries where possible."""
    if not text or len(text) <= max_len:
        return text
    cut = text[:max_len - len(suffix)]
    boundary = cut.rfind(" ")
    if boundary > 0:
        cut = cut[:boundary]
    return cut + suffix

def safe_get(d, *keys, default=None):
    for key in keys:
        if not isinstance(d, dict):
            return default
        d = d.get(key, default)
    return d

def is_valid_email(email):
    import re
    return bool(re.match(r"^[\w.+-]+@[\w-]+\.[\w.-]+$", email))

def retry(func, retries=3, delay=1.0):
    import time
    for i in range(retries):
        try:
            return func()
        except Exception:
            if i == retries - 1:
                raise
            time.sleep(delay)

def format_bytes(n):
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} PB"

def slugify(text):
    import re
    return re.sub(r"[^\w-]", "", text.lower().replace(" ", "-"))

def deep_merge(base, override):
    result = base.copy()
    for k, v in override.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = deep_merge(result[k], v)
        else:
            result[k] = v
    return result

def timer(label: str = ""):
    """Decorator factory: log execution time with an optional label."""
    import time, functools
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            name = label or func.__name__
            t = time.perf_counter()
            result = func(*args, **kwargs)
            print(f"[timer] {name}: {time.perf_counter() - t:.4f}s")
            return result
        return wrapper
    return decorator

