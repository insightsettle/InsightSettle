#!/usr/bin/env bash
# Generates the Android, iOS and web platform folders (not kept in git) and applies Insight's settings.
# Run from mobile/: bash tool/prepare_platforms.sh
set -euo pipefail

flutter create --org com.insightsettle --project-name insight_mobile --platforms android,ios,web . >/dev/null
# flutter create adds a counter-app test that does not apply to this app.
if grep -q "MyApp" test/widget_test.dart 2>/dev/null; then git checkout -- test/widget_test.dart 2>/dev/null || true; fi

# Android: app name, internet access in release builds, links opening in the browser.
M=android/app/src/main/AndroidManifest.xml
sed -i 's/android:label="[^"]*"/android:label="Insight"/' "$M"
grep -q 'android.permission.INTERNET' "$M" || sed -i 's#<application#<uses-permission android:name="android.permission.INTERNET"/>\n    <application#' "$M"
grep -q '<queries>' "$M" && grep -q 'android.intent.action.VIEW' "$M" || sed -i 's#</manifest>#    <queries>\n        <intent>\n            <action android:name="android.intent.action.VIEW" />\n            <data android:scheme="https" />\n        </intent>\n    </queries>\n</manifest>#' "$M"

# iOS: display name.
P=ios/Runner/Info.plist
/usr/bin/env python3 - "$P" <<'PY'
import re, sys
p = sys.argv[1]
s = open(p).read()
s = re.sub(r'(<key>CFBundleDisplayName</key>\s*<string>)[^<]*(</string>)', r'\1Insight\2', s)
s = re.sub(r'(<key>CFBundleName</key>\s*<string>)[^<]*(</string>)', r'\1Insight\2', s)
open(p, 'w').write(s)
PY

# Web: title and manifest names.
sed -i 's#<title>[^<]*</title>#<title>Insight</title>#' web/index.html
sed -i 's/"name": "[^"]*"/"name": "Insight"/; s/"short_name": "[^"]*"/"short_name": "Insight"/' web/manifest.json

dart run flutter_launcher_icons >/dev/null
echo "Platforms ready."
