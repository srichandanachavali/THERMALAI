"""Shared utility helpers — updated 2026-07-02."""

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

def is_valid_email(email: str) -> bool:
    """Return True if the email address is syntactically valid."""
    import re
    if not email or "@" not in email:
        return False
    return bool(re.fullmatch(r"^[\w.+\-]+@[\w\-]+\.[\w.\-]+$", email.strip().lower()))

def retry(func, retries: int = 3, delay: float = 1.0, backoff: float = 1.5):
    """Retry a callable with optional exponential backoff."""
    import time
    wait = delay
    for i in range(retries):
        try:
            return func()
        except Exception:
            if i == retries - 1:
                raise
            time.sleep(wait)
            wait *= backoff

def format_bytes(n: float, decimals: int = 1, binary: bool = True) -> str:
    """Format a byte count as a human-readable string (IEC or SI)."""
    div = 1024.0 if binary else 1000.0
    units = ["B", "KiB", "MiB", "GiB", "TiB"] if binary else ["B", "KB", "MB", "GB", "TB"]
    for unit in units:
        if abs(n) < div:
            return f"{n:.{decimals}f} {unit}"
        n /= div
    return f"{n:.{decimals}f} {units[-1]}"

def slugify(text: str, sep: str = "-") -> str:
    """Convert text to a URL-safe slug."""
    import re
    text = re.sub(r"[^\w\s-]", "", text.lower().strip())
    return re.sub(r"[\s_-]+", sep, text).strip(sep)

def deep_merge(base: dict, override: dict, *, extend_lists: bool = False) -> dict:
    """Recursively merge two dicts; override wins on conflict.
    Pass extend_lists=True to append lists instead of replacing them.
    """
    result = base.copy()
    for k, v in override.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = deep_merge(result[k], v, extend_lists=extend_lists)
        elif extend_lists and k in result and isinstance(result[k], list) and isinstance(v, list):
            result[k] = result[k] + v
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

