#!/usr/bin/env python3
"""
Destructive: remove comments from many source files in the repository.
Backs up the repository (except .git and node_modules) before modifying files.

Usage: python3 scripts/strip_comments.py
"""
import os
import sys
import shutil
from datetime import datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BACKUP_DIR = os.path.join(ROOT, 'comment_backups_' + datetime.now().strftime('%Y%m%d_%H%M%S'))

EXTENSIONS = {
    # C-like and JS/TS
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    # styles
    '.css', '.scss', '.less',
    # markup
    '.html', '.htm', '.svg',
    # configs and scripts
    '.json', '.yml', '.yaml', '.env', '.toml',
    # python/shell
    '.py', '.sh', '.bash',
    # markdown
    '.md', '.mdx',
    # other text
    '.txt', '.tsx'
}

IGNORE_DIRS = {'.git', 'node_modules', 'comment_backups_' + datetime.now().strftime('%Y%m%d_%H%M%S')}


def make_backup():
    print('Creating backup at', BACKUP_DIR)
    shutil.copytree(ROOT, BACKUP_DIR, ignore=shutil.ignore_patterns('.git', 'node_modules', BACKUP_DIR))


def should_process(path):
    if not os.path.isfile(path):
        return False
    _, ext = os.path.splitext(path)
    return ext in EXTENSIONS


def strip_comments_js_like(text: str) -> str:
    # Basic state-machine stripper for // and /* */ and string/template literals.
    out = []
    i = 0
    n = len(text)
    state = 'code'
    string_quote = None
    while i < n:
        ch = text[i]
        nxt = text[i+1] if i+1 < n else ''
        if state == 'code':
            if ch == '/' and nxt == '/':
                # skip until end of line
                i += 2
                while i < n and text[i] != '\n':
                    i += 1
                continue
            if ch == '/' and nxt == '*':
                i += 2
                while i+1 < n and not (text[i] == '*' and text[i+1] == '/'):
                    i += 1
                i += 2 if i < n else 0
                continue
            if ch == '"' or ch == "'" or ch == '`':
                string_quote = ch
                out.append(ch)
                i += 1
                state = 'string'
                continue
            if ch == '<' and text[i:i+4] == '<!--':
                # HTML comment
                i += 4
                while i+2 < n and text[i:i+3] != '-->':
                    i += 1
                i += 3
                continue
            out.append(ch)
            i += 1
        elif state == 'string':
            out.append(ch)
            if ch == '\\':
                # escape next
                if i+1 < n:
                    out.append(text[i+1])
                    i += 2
                    continue
            if ch == string_quote:
                state = 'code'
                string_quote = None
            i += 1
    return ''.join(out)


def strip_comments_hash(text: str) -> str:
    # Remove # comments when not inside strings (naive)
    out_lines = []
    for lineno, line in enumerate(text.splitlines(True)):
        stripped = ''
        i = 0
        n = len(line)
        in_single = in_double = False
        while i < n:
            ch = line[i]
            if ch == "'" and not in_double:
                in_single = not in_single
                stripped += ch
                i += 1
                continue
            if ch == '"' and not in_single:
                in_double = not in_double
                stripped += ch
                i += 1
                continue
            if ch == '#' and not in_single and not in_double:
                # treat as comment start
                break
            stripped += ch
            i += 1
        out_lines.append(stripped)
    return ''.join(out_lines)


def process_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = f.read()
    except Exception:
        return False
    _, ext = os.path.splitext(path)
    new = data
    if ext in {'.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'}:
        new = strip_comments_js_like(data)
    elif ext in {'.css', '.scss', '.less'}:
        # remove /* */ and //
        new = strip_comments_js_like(data)
    elif ext in {'.html', '.htm', '.svg'}:
        # remove <!-- --> and JS-style inside
        new = strip_comments_js_like(data)
    elif ext in {'.py', '.sh', '.bash'}:
        new = strip_comments_hash(data)
    elif ext in {'.md', '.mdx'}:
        # remove HTML comments in markdown
        new = strip_comments_js_like(data)
    else:
        # fallback: try to remove JS-like comments
        new = strip_comments_js_like(data)

    if new != data:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new)
        return True
    return False


def main():
    make_backup()
    modified = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        # skip ignored dirs
        if any(part in IGNORE_DIRS for part in dirpath.split(os.sep)):
            continue
        for name in filenames:
            path = os.path.join(dirpath, name)
            if should_process(path):
                ok = process_file(path)
                if ok:
                    modified.append(path)
    print('Modified', len(modified), 'files')


if __name__ == '__main__':
    main()
