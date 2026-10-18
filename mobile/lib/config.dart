/// Build-time configuration. Override with --dart-define for another environment.
/// The publishable key is public by design (it is also in the website bundle); row-level security and the
/// server rules protect the data.
class AppConfig {
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://epgsnncbvygtjqsrykcp.supabase.co',
  );
  static const supabaseKey = String.fromEnvironment(
    'SUPABASE_PUBLISHABLE_KEY',
    defaultValue: 'sb_publishable_g7HPlVCoPTjPEdJLzlvsfA_tj7yseIJ',
  );

  /// Website that serves the mobile API (/api/v1) and the pages the app links to.
  static const siteUrl = String.fromEnvironment('INSIGHT_SITE', defaultValue: 'https://insightsettle.com');
}
