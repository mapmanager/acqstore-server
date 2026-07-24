# AcqStore Server packaging assets

Desktop packaging icons for AcqStore Server only.

| File | Role |
|------|------|
| `AcqStoreServer.png` | Master artwork (1024×1024, teal **AS** on white) |
| `AcqStoreServer.icns` | macOS `.app` icon |
| `AcqStoreServer.ico` | Windows exe icon (future) |
| `build_icons.sh` | Regenerates `.icns` / `.ico` from the master PNG |

Normal builds use the committed `.icns` / `.ico` files. Re-run
`./packaging/assets/build_icons.sh` only after changing the master PNG.

```bash
./packaging/assets/build_icons.sh
```

Requires macOS (`iconutil`), `uv`, and the project `build` dependency group (Pillow).
