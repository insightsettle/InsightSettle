import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api.dart';
import '../config.dart';
import '../l10n.dart';
import '../theme.dart';
import '../widgets/common.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});
  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await sb.auth.signInWithPassword(email: _email.text.trim(), password: _password.text);
    } on AuthException catch (e) {
      setState(() => _error = e.message.toLowerCase().contains('invalid') ? tr('The email or password is not correct.') : e.message);
    } catch (_) {
      setState(() => _error = tr('The service is not reachable right now. Please try again.'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reset() async {
    final email = _email.text.trim();
    if (email.isEmpty) {
      setState(() => _error = tr('Enter your email first.'));
      return;
    }
    try {
      await sb.auth.resetPasswordForEmail(email, redirectTo: '${AppConfig.siteUrl}/auth/reset');
      if (mounted) showMessage(context, tr('If this email has an account, a reset link is on its way.'));
    } catch (_) {
      if (mounted) showMessage(context, tr('The service is not reachable right now. Please try again.'), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: AutofillGroup(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Center(child: BrandLogo(height: 56)),
                    const SizedBox(height: 28),
                    Text(tr('Sign in'), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 6),
                    Text(tr('Clear rules for deals between people and businesses across the Gulf.'),
                        style: const TextStyle(color: InsightColors.muted)),
                    const SizedBox(height: 24),
                    TextField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      textDirection: TextDirection.ltr,
                      autofillHints: const [AutofillHints.email],
                      decoration: InputDecoration(labelText: tr('Email')),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _password,
                      obscureText: true,
                      textDirection: TextDirection.ltr,
                      autofillHints: const [AutofillHints.password],
                      decoration: InputDecoration(labelText: tr('Password')),
                      onSubmitted: (_) => _busy ? null : _signIn(),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(_error!, style: const TextStyle(color: InsightColors.danger)),
                    ],
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: _busy ? null : _signIn,
                      child: Text(_busy ? tr('Signing in…') : tr('Sign in')),
                    ),
                    TextButton(onPressed: _busy ? null : _reset, child: Text(tr('Forgot password?'))),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: () => launchUrl(Uri.parse('${AppConfig.siteUrl}/auth'), mode: LaunchMode.externalApplication),
                      child: Text(tr('Create an account on the website')),
                    ),
                    const SizedBox(height: 24),
                    TextButton(
                      onPressed: () => AppLocale.set(AppLocale.isArabic ? 'en' : 'ar'),
                      child: Text(AppLocale.isArabic ? 'English' : 'العربية'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
