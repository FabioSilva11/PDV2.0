import 'dart:math';
import 'package:firebase_database/firebase_database.dart';
import 'models.dart';

class RestaurantRepository {
  RestaurantRepository() : _root = FirebaseDatabase.instance.ref('restaurants/murupi/database');
  final DatabaseReference _root;

  Stream<List<RestaurantTable>> tables() => _root.child('tables').onValue.map((event) => _decode(event.snapshot).entries
    .map((entry) => RestaurantTable.fromJson(entry.key, entry.value)).toList()..sort((a, b) => a.number.compareTo(b.number)));
  Stream<List<MenuProduct>> menu() => _root.child('menu').onValue.map((event) => _decode(event.snapshot).entries
    .map((entry) => MenuProduct.fromJson(entry.key, entry.value)).where((item) => item.available).toList()..sort((a, b) => a.name.compareTo(b.name)));

  Future<StaffUser?> login(String username, String password) async {
    final snapshot = await _root.child('staff').get();
    for (final entry in _decode(snapshot).entries) {
      final user = entry.value;
      if ('${user['usuario'] ?? ''}'.toLowerCase() == username.trim().toLowerCase() &&
          '${user['senha'] ?? ''}' == password && user['status'] == 'ativo' && user['ativo'] != false) {
        final staff = StaffUser.fromJson(entry.key, user);
        if (!staff.canServe) throw StateError('Este usuário não possui perfil de atendimento de mesa.');
        return staff;
      }
    }
    return null;
  }

  Future<String> confirmOrder({required RestaurantTable table, required StaffUser staff, required List<CartLine> lines, required String customer, required String generalNote}) async {
    if (lines.isEmpty) throw StateError('Adicione ao menos um produto.');
    if (!table.available) throw StateError('A Mesa ${table.number} já está ocupada em outro terminal.');
    final subtotal = _money(lines.fold(0.0, (sum, line) => sum + line.total));
    final orderRef = _root.child('orders').push();
    final orderId = orderRef.key!;
    final number = DateTime.now().microsecondsSinceEpoch;
    final now = DateTime.now().toUtc().toIso8601String();
    final items = lines.map((line) => {
      'cartItemId': '${orderId}-${line.product.id}-${Random().nextInt(1 << 20)}',
      'menuItemId': line.product.id, 'nome': line.product.name, 'precoUnitario': _money(line.product.price),
      'quantidade': line.quantity, 'observacao': line.note, 'estacaoProducao': line.product.station,
'adicionais': <dynamic>[], 'remocoes': <dynamic>[]
    }).toList();
    final order = {
      'id': orderId, 'numero': number, 'tipo': 'mesa', 'mesaNumero': table.number,
      'nomeCliente': customer.isEmpty ? null : customer, 'garcomNome': staff.name, 'canal': 'Salão',
      'criadoEm': now, 'itens': items, 'subtotal': subtotal, 'desconto': 0, 'taxaServico': 0,
      'taxaEntrega': 0, 'total': subtotal, 'status': 'novo', 'statusPagamento': 'pendente',
      'pagamentos': <dynamic>[], 'valorTotalPago': 0, 'saldoRestante': subtotal,
      'observacoesGerais': generalNote.isEmpty ? null : generalNote, 'origem': 'app_garcom'
    };
    final groupId = '${orderId}-print';
    final jobId = _root.child('printQueue').push().key!;
    final fullContent = [
      'MURUPI RESTAURANTE',
      'VIA DO PEDIDO',
      'PEDIDO #$number',
      'TIPO: MESA',
      'MESA: ${table.number}',
      if (customer.isNotEmpty) 'CLIENTE: $customer',
      '--------------------------------',
      ...lines.expand((line) => [
        '${line.quantity}x ${line.product.name}',
        if (line.note.isNotEmpty) '  OBS: ${line.note}',
      ]),
      '--------------------------------',
      'TOTAL: R\$ ${subtotal.toStringAsFixed(2)}',
    ].join('\n');
    final jobs = <String, dynamic>{
      'printQueue/$jobId': {
        'id': jobId, 'pedidoId': orderId, 'grupoImpressaoId': groupId, 'tipo': 'pedido',
        'pedidoNumero': number, 'titulo': 'PEDIDO #$number', 'conteudoTexto': fullContent,
        'status': 'pendente', 'dataHora': now, 'tentativas': 0, 'origem': 'app_garcom'
      }
    };
    order['impressoes'] = [{'grupoId': groupId, 'pedidoJobId': jobId, 'pedidoGeradoEm': now, 'tipoOperacao': 'pedido_inicial'}];
    await _root.runTransaction((current) {
      final db = Map<dynamic, dynamic>.from(current as Map? ?? const {});
      final tables = Map<dynamic, dynamic>.from(db['tables'] as Map? ?? const {});
      final latest = Map<dynamic, dynamic>.from(tables[table.id] as Map? ?? const {});
      if ('${latest['status'] ?? 'livre'}' != 'livre') return Transaction.abort();
      latest.addAll({'status': 'ocupada', 'pedidoAtivoId': orderId, 'valorAtual': subtotal, 'clienteNome': customer.isEmpty ? null : customer, 'garcomResponsavel': staff.name, 'abertaEm': now});
      tables[table.id] = latest; db['tables'] = tables;
      final orders = Map<dynamic, dynamic>.from(db['orders'] as Map? ?? const {}); orders[orderId] = order; db['orders'] = orders;
      final queue = Map<dynamic, dynamic>.from(db['printQueue'] as Map? ?? const {});
      for (final pair in jobs.entries) queue[pair.key.split('/').last] = pair.value;
      db['printQueue'] = queue;
      return Transaction.success(db);
    }).then((result) { if (!result.committed) throw StateError('A mesa foi alterada por outro atendimento. Atualize e tente novamente.'); });
    return orderId;
  }

  static Map<String, Map<dynamic, dynamic>> _decode(DataSnapshot snapshot) => Map<dynamic, dynamic>.from(snapshot.value as Map? ?? const {}).map((key, value) => MapEntry('$key', Map<dynamic, dynamic>.from(value as Map? ?? const {})));
  static double _money(double amount) => (amount * 100).round() / 100;
}
