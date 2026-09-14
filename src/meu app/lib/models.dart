class StaffUser {
  const StaffUser({required this.id, required this.name, required this.username, required this.role, required this.permissions});
  final String id;
  final String name;
  final String username;
  final String role;
  final Map<String, dynamic> permissions;

  bool get canServe => const {'Administrador', 'Gerente', 'Gerente Geral', 'Garçom', 'Garçom / Atendente'}.contains(role);
  factory StaffUser.fromJson(String id, Map<dynamic, dynamic> json) => StaffUser(
    id: id,
    name: '${json['nome'] ?? 'Colaborador'}',
    username: '${json['usuario'] ?? ''}',
    role: '${json['cargo'] ?? ''}',
    permissions: Map<String, dynamic>.from(json['permissoes'] as Map? ?? const {}),
  );
}

class RestaurantTable {
  const RestaurantTable({required this.id, required this.number, required this.status, required this.value, this.customer, this.activeOrderId});
  final String id;
  final int number;
  final String status;
  final double value;
  final String? customer;
  final String? activeOrderId;
  bool get available => status == 'livre';
  factory RestaurantTable.fromJson(String id, Map<dynamic, dynamic> json) => RestaurantTable(
    id: id,
    number: (json['numero'] as num?)?.toInt() ?? 0,
    status: '${json['status'] ?? 'livre'}',
    value: (json['valorAtual'] as num?)?.toDouble() ?? 0,
    customer: json['clienteNome'] as String?,
    activeOrderId: json['pedidoAtivoId'] as String?,
  );
}

class MenuProduct {
  const MenuProduct({required this.id, required this.name, required this.price, required this.category, required this.available, required this.station});
  final String id;
  final String name;
  final double price;
  final String category;
  final bool available;
  final String station;
  factory MenuProduct.fromJson(String id, Map<dynamic, dynamic> json) => MenuProduct(
    id: id,
    name: '${json['nome'] ?? 'Produto'}',
    price: (json['preco'] as num?)?.toDouble() ?? 0,
    category: '${json['categoria'] ?? 'Outros'}',
    available: json['disponivel'] != false,
    station: '${json['estacaoProducao'] ?? 'cozinha'}',
  );
}

class CartLine {
  CartLine({required this.product, this.quantity = 1, this.note = ''});
  final MenuProduct product;
  int quantity;
  String note;
  double get total => product.price * quantity;
}
