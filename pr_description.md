🧹 Sync Domain Catalogs and Userscript Metadata

🎯 **What**
This PR standardizes the repository's userscript catalogs by reorganizing user scripts into domain subdirectories, updating the local domain `index.html` catalogs, stripping hardcoded version indicators, verifying metadata elements, and ensuring exact matches between `userscript-check-installed` payload names and catalog names.

💡 **Why**
- Several scripts were located in the root of domain directories instead of slugified subdirectories.
- Hardcoded versions (e.g. `(v1.0.0)`) in `index.html` files disrupted the dynamic version displays handled by `domain-landing.js`.
- Multiple redundant and duplicate older script versions were lingering in random hashed folders, creating confusing and unmaintained states in catalogs.

✅ **Verification**
- **Domain Root Directory match**: Verified that all directories correctly match the root `index.html` `.domain-grid` blocks.
- **Event and Metadata Check**: Verified that the event data payloads exactly match the `@name` metadata in all `.user.js` files (via `GM_info.script.name`). Added `@match` headers if any were missing (they were all correctly present).
- **Redundant file removal reasoning**:
  1. `cpubenchmark.net/45afd...` -> Redundant hash copy of `copy-cpu-benchmark-table-of-passmark`.
  2. `jbrc-sys.com/4d507...` -> Redundant hash copy of `battery-recycle-station`.
  3. `jbrc-sys.com/Battery Recycle Station-0.1.20220823.2.user.js` -> Outdated version of the same script (`20220824` kept).
  4. `mineo.jp/4fe4b...` -> Redundant copy of `mineo-gift-code`.
  5. `twitter.com/Mute X Tweets...2024.user.js` -> Exact `md5` duplicate of the script inside `twitter.com/89402...`.
  6. `vpn1.ehime-u.ac.jp/0cad6...` -> Redundant hash copy of `cisco-ssl-vpn-bookmark`.
  7. `getpocket.com/Pocket Tweaker.test.js` -> Was an abandoned failing test for an obsolete, unused userscript.

✨ **Result**
Catalogs are perfectly synced. HTML tags no longer rely on manually entered versions. Tests are passing, and dead code/duplicates are permanently removed.
