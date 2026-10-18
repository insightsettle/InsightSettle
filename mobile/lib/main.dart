import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'api.dart';
import 'config.dart';
import 'l10n.dart';
import 'screens/home.dart';
import 'screens/sign_in.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppLocale.load();
  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    publishableKey: AppConfig.supabaseKey,
    httpClient: PublishableKeyClient(),
  );
  runApp(const InsightApp());
}

class InsightApp extends StatelessWidget {
  const InsightApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<Locale>(
      valueListenable: AppLocale.notifier,
      builder: (context, locale, _) => MaterialApp(
        title: 'Insight',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        locale: locale,
        supportedLocales: const [Locale('ar'), Locale('en')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: const AuthGate(),
      ),
    );
  }
}

/// Shows sign-in until there is a session, then the client home.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<AuthState>(
      stream: sb.auth.onAuthStateChange,
      builder: (context, _) => sb.auth.currentSession == null ? const SignInScreen() : const HomeShell(),
    );
  }
}
