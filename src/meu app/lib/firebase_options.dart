import 'package:firebase_core/firebase_core.dart';

class AppFirebaseOptions {
  static const _apiKey = String.fromEnvironment('FIREBASE_API_KEY');
  static const _appId = String.fromEnvironment('FIREBASE_APP_ID');
  static const _projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
  static const _databaseUrl = String.fromEnvironment('FIREBASE_DATABASE_URL');
  static const _messagingSenderId = String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');

  static bool get configured => [_apiKey, _appId, _projectId, _databaseUrl, _messagingSenderId].every((value) => value.isNotEmpty);

  static FirebaseOptions get current {
    if (!configured) throw StateError('Configure as variáveis FIREBASE_API_KEY, FIREBASE_APP_ID, FIREBASE_PROJECT_ID, FIREBASE_DATABASE_URL e FIREBASE_MESSAGING_SENDER_ID.');
    return const FirebaseOptions(
      apiKey: _apiKey,
      appId: _appId,
      projectId: _projectId,
      databaseURL: _databaseUrl,
      messagingSenderId: _messagingSenderId,
    );
  }
}
