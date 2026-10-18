import 'package:flutter/material.dart';

/// Insight design tokens (Figma v1 / website): dark primary green for UI, the logo greens only as accents.
class InsightColors {
  static const primary = Color(0xFF0F6B56);
  static const primarySubtle = Color(0xFFE3F2EC);
  static const brand1 = Color(0xFF55BD8A);
  static const brand2 = Color(0xFF5CC4BA);
  static const background = Color(0xFFF6F8F7);
  static const surface = Colors.white;
  static const ink = Color(0xFF0B1A16);
  static const muted = Color(0xFF5B6B66);
  static const border = Color(0xFFE2E8E5);
  static const warning = Color(0xFFB45309);
  static const warningSubtle = Color(0xFFFFF4E5);
  static const danger = Color(0xFFB42318);
  static const dangerSubtle = Color(0xFFFDECEA);
  static const gold = Color(0xFFB08A3E);
  static const goldSubtle = Color(0xFFF6EFDF);
}

const kFontFamily = 'ThmanyahSans';

ThemeData buildTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: InsightColors.primary,
    primary: InsightColors.primary,
    surface: InsightColors.surface,
    error: InsightColors.danger,
  );
  final base = ThemeData(useMaterial3: true, colorScheme: scheme, fontFamily: kFontFamily);
  return base.copyWith(
    scaffoldBackgroundColor: InsightColors.background,
    appBarTheme: const AppBarTheme(
      backgroundColor: InsightColors.surface,
      foregroundColor: InsightColors.ink,
      elevation: 0,
      scrolledUnderElevation: 1,
      centerTitle: false,
      titleTextStyle: TextStyle(fontFamily: kFontFamily, fontSize: 18, fontWeight: FontWeight.w700, color: InsightColors.ink),
    ),
    cardTheme: CardThemeData(
      color: InsightColors.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: InsightColors.border),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: InsightColors.surface,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: InsightColors.border)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: InsightColors.border)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(0, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: const TextStyle(fontFamily: kFontFamily, fontWeight: FontWeight.w700, fontSize: 15),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        side: const BorderSide(color: InsightColors.border),
        textStyle: const TextStyle(fontFamily: kFontFamily, fontWeight: FontWeight.w500, fontSize: 15),
      ),
    ),
    navigationBarTheme: const NavigationBarThemeData(
      backgroundColor: InsightColors.surface,
      indicatorColor: InsightColors.primarySubtle,
    ),
    dividerTheme: const DividerThemeData(color: InsightColors.border, space: 1),
  );
}
