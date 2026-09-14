# Murupi Garçom

Aplicativo Flutter para o fluxo do garçom: login local contra os colaboradores cadastrados no Realtime Database, seleção de mesa, pedido, envio à cozinha e impressão/compartilhamento do consumo.

O app **não usa Firebase Authentication**. Ele consulta `restaurants/murupi/database/staff`, onde o site já mantém os colaboradores. A senha não é gravada no aplicativo nem enviada por `--dart-define`; ela é validada contra o registro do colaborador no Realtime Database, como no site.

## Preparação

Instale o Flutter SDK e execute, nesta pasta:

```powershell
flutter pub get
flutter run --dart-define=FIREBASE_API_KEY="..." --dart-define=FIREBASE_APP_ID="..." --dart-define=FIREBASE_PROJECT_ID="..." --dart-define=FIREBASE_DATABASE_URL="https://..." --dart-define=FIREBASE_MESSAGING_SENDER_ID="..."
```

Use os valores equivalentes do `.env` do PDV. Não copie o `.env` para este diretório nem o versione. Para gerar APK, troque `flutter run` por `flutter build apk` com as mesmas quatro opções.

## Dados usados

- Usuários: `restaurants/murupi/database/staff`
- Mesas: `restaurants/murupi/database/tables`
- Cardápio: `restaurants/murupi/database/menu`
- Pedidos: `restaurants/murupi/database/orders`
- Fila de impressão: `restaurants/murupi/database/printQueue`

Os pedidos recebidos pela cozinha são criados com `status: novo` e itens `statusProducao: pendente`. O consumo é um PDF local aberto pelo diálogo nativo de impressão/compartilhamento Android.

Em produção, as regras do Realtime Database devem limitar leitura e gravação ao perfil de garçom e bloquear modificações financeiras, de preços e de colaboradores. Sem Firebase Auth, essas regras precisam usar um mecanismo de sessão assinado por backend; o login direto é compatível com o modelo atual do site, mas não fornece essa proteção de servidor sozinho.
