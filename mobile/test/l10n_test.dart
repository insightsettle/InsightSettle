import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:insight_mobile/l10n.dart';
import 'package:insight_mobile/l10n_ar.dart';

/// Every literal passed to tr()/trf() in lib/ must have an Arabic entry, so the Arabic app never shows English.
void main() {
  test('every UI string has an Arabic translation', () {
    final pattern = RegExp(r"""\btrf?\(\s*'((?:[^'\\]|\\.)*)'""");
    final missing = <String>{};
    for (final f in Directory('lib').listSync(recursive: true).whereType<File>().where((f) => f.path.endsWith('.dart'))) {
      for (final m in pattern.allMatches(f.readAsStringSync())) {
        final s = m.group(1)!.replaceAll("\\'", "'");
        if (!kArabic.containsKey(s)) missing.add(s);
      }
    }
    final labelMaps = [...kStatusEn.values, ...kMilestoneStatusEn.values, ...kDealTypeEn.values];
    for (final s in labelMaps) {
      if (!kArabic.containsKey(s)) missing.add(s);
    }
    expect(missing, isEmpty, reason: 'Missing Arabic: ${missing.join(' | ')}');
  });

  test('no empty translations', () {
    expect(kArabic.entries.where((e) => e.value.trim().isEmpty), isEmpty);
  });
}
