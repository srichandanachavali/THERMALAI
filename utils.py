"""Shared utility helpers — updated 2026-06-27."""

def chunk_list(lst: list, size: int) -> list:
    """Split list into chunks of given size."""
    return [lst[i:i+size] for i in range(0, len(lst), size)]

def flatten_dict(d: dict, parent_key: str = "", sep: str = "_") -> dict:
    """Flatten a nested dictionary into a single level."""
    items: dict = {}
    for k, v in d.items():
        nk = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.update(flatten_dict(v, nk, sep=sep))
        else:
            items[nk] = v
    return items

def truncate_text(text: str, max_len: int = 100, suffix: str = "...") -> str:
    """Truncate text to at most max_len characters."""
    if len(text) <= max_len:
        return text
    return text[:max_len] + suffix

def safe_get(d: dict, *keys, default=None):
    """Safely traverse nested dict or list structures."""
    cur = d
    for key in keys:
        if isinstance(cur, dict):
            cur = cur.get(key, default)
        elif isinstance(cur, (list, tuple)) and isinstance(key, int):
            cur = cur[key] if 0 <= key < len(cur) else default
        else:
            return default
    return cur

def is_valid_email(email: str) -> bool:
    """Return True if the email address is syntactically valid."""
    import re
    return bool(re.match(r"^[\w.+-]+@[\w-]+\.[\w.-]+$", email.strip()))

def retry(func, retries: int = 3, delay: float = 1.0):
    """Retry a callable on failure."""
    import time
    for i in range(retries):
        try:
            return func()
        except Exception:
            if i == retries - 1:
                raise
            time.sleep(delay)

def format_bytes(n: float, decimals: int = 1) -> str:
    """Format a byte count as a human-readable string."""
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if n < 1024.0:
            return f"{n:.{decimals}f} {unit}"
        n /= 1024.0
    return f"{n:.{decimals}f} PB"

def slugify(text: str) -> str:
    """Convert text to a URL-safe slug."""
    import re
    return re.sub(r"[^\w-]", "", text.lower().strip().replace(" ", "-"))

def deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge two dicts; override wins on conflict."""
    result = base.copy()
    for k, v in override.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = deep_merge(result[k], v)
        else:
            result[k] = v
    return result

def timer(func):
    """Decorator: print execution time of a function."""
    import time, functools
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        t = time.perf_counter()
        result = func(*args, **kwargs)
        print(f"{func.__name__} took {time.perf_counter() - t:.4f}s")
        return result
    return wrapper

