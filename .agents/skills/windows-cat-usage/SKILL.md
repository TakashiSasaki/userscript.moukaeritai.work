---
name: Windows Cat Usage (PowerShell)
description: Guidelines for correctly using the `cat` command (Get-Content alias) on Windows PowerShell to handle multiple files, managed encodings, and common integrations.
---

# Windows Cat Usage (PowerShell)

In Windows PowerShell, `cat` is an alias for the `Get-Content` cmdlet. Its behavior significantly differs from the POSIX `cat` utility found in Linux/macOS.

## 1. Handling Multiple Files

The most common pitfall is attempting to list multiple files separated by spaces. In PowerShell, this will result in an error or only the first file being processed.

### ❌ Incorrect (Linux style)
```powershell
cat file1.txt file2.txt
```
*Result: Error (Get-Content does not accept positional parameters for multiple paths).*

### ✅ Correct (PowerShell style)
You MUST use a **comma-separated list** (array syntax).
```powershell
cat file1.txt, file2.txt
```
*Note: Commas inform PowerShell to pass an array to the `-Path` parameter.*

---

## 2. Performance and Data Handling

### Use `-Raw` for Large Files
By default, `cat` reads a file line-by-line and returns an array of strings. This can be slow for large files.
- Use `-Raw` to read the entire file as a single string (much faster for simple viewing or regex).
```powershell
cat large_file.log -Raw
```

### Limit Output
Use `-TotalCount` (or `-Head`) to view only the beginning of a file.
```powershell
cat documentation.md -TotalCount 20
```

---

## 3. Encoding Considerations

Older versions of PowerShell (5.1 and below) may default to `UTF-16` or `ANSI` when reading files, which can mangle `UTF-8` characters.
- Use `-Encoding UTF8` if you see strange symbols.
```powershell
cat project_info.txt -Encoding UTF8
```

---

## 4. Integration Examples

### Searching within files (Grep equivalent)
Pipes the content of multiple files to `Select-String`.
```powershell
cat src/*.js, tests/*.js | Select-String "TODO"
```

### Filtering and Unifying
Read multiple files, filter lines, and save to a new file.
```powershell
cat log1.log, log2.log | Where-Object { $_ -match "Error" } | Out-File errors_unified.log
```

## 5. Reliable Alternatives for Agents

If `cat` behavior is unpredictable in the current shell context, use the following:
1. **`Get-Content -Path @("file1", "file2")`**: Explicit array syntax.
2. **`type file1 file2`**: The legacy CMD `type` command (Internal command, often more lenient).
3. **`view_file`**: Use the Agent's built-in tool for reliable content retrieval.
