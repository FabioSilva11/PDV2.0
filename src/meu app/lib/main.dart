import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import 'firebase_options.dart';
import 'models.dart';
import 'restaurant_repository.dart';

final repository = RestaurantRepository();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (AppFirebaseOptions.configured) {
    await Firebase.initializeApp(options: AppFirebaseOptions.current);
  }
  runApp(const MurupiWaiterApp());
}

class MurupiWaiterApp extends StatelessWidget {
  const MurupiWaiterApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Murupi Garçom',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff9a5b14)), useMaterial3: true),
        home: AppFirebaseOptions.configured ? const LoginPage() : const ConfigurationPage(),
      );
}

class ConfigurationPage extends StatelessWidget {
  const ConfigurationPage({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(
        body: Center(child: Padding(padding: EdgeInsets.all(28), child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(LucideIcons.cloudOff, size: 54), SizedBox(height: 18),
          Text('Firebase não configurado', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)), SizedBox(height: 10),
          Text('Inicie o app com as cinco variáveis FIREBASE descritas no README.', textAlign: TextAlign.center),
        ]))),
      );
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final username = TextEditingController();
  final password = TextEditingController();
  final formKey = GlobalKey<FormState>();
  bool loading = false;
  String? error;

  Future<void> submit() async {
    if (!formKey.currentState!.validate()) return;
    setState(() { loading = true; error = null; });
    try {
      final user = await repository.login(username.text, password.text);
      if (!mounted) return;
      if (user == null) {
        setState(() => error = 'Usuário ou senha inválidos.');
      } else {
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => TablesPage(user: user)));
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString().replaceFirst('Bad state: ', ''));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override void dispose() { username.dispose(); password.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Scaffold(body: SafeArea(child: Center(child: SingleChildScrollView(child: Padding(
    padding: const EdgeInsets.all(28), child: Form(key: formKey, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const Icon(LucideIcons.utensils, size: 58), const SizedBox(height: 16),
      Text('Murupi Garçom', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold), textAlign: TextAlign.center),
      const SizedBox(height: 6), const Text('Entre com seu usuário e senha para atender mesas.', textAlign: TextAlign.center), const SizedBox(height: 28),
      TextFormField(controller: username, autocorrect: false, textInputAction: TextInputAction.next, decoration: const InputDecoration(labelText: 'Usuário', prefixIcon: Icon(LucideIcons.userRound), border: OutlineInputBorder()), validator: (v) => v == null || v.trim().isEmpty ? 'Informe seu usuário.' : null),
      const SizedBox(height: 14), TextFormField(controller: password, obscureText: true, onFieldSubmitted: (_) => submit(), decoration: const InputDecoration(labelText: 'Senha', prefixIcon: Icon(LucideIcons.lockKeyhole), border: OutlineInputBorder()), validator: (v) => v == null || v.isEmpty ? 'Informe sua senha.' : null),
      if (error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error), textAlign: TextAlign.center)),
      const SizedBox(height: 22), FilledButton.icon(onPressed: loading ? null : submit, icon: loading ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(LucideIcons.logIn), label: const Padding(padding: EdgeInsets.all(12), child: Text('Entrar'))),
    ])))),)));
}

class TablesPage extends StatelessWidget {
  const TablesPage({required this.user, super.key});
  final StaffUser user;
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Mesas'), actions: [IconButton(tooltip: 'Sair', icon: const Icon(LucideIcons.logOut), onPressed: () => Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const LoginPage()), (_) => false))]), body: StreamBuilder<List<RestaurantTable>>(
    stream: repository.tables(), builder: (context, snapshot) {
      if (snapshot.hasError) return Center(child: Text('Não foi possível carregar as mesas.\n${snapshot.error}', textAlign: TextAlign.center));
      if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
      final tables = snapshot.data!;
      return Column(children: [Padding(padding: const EdgeInsets.fromLTRB(16, 12, 16, 4), child: Align(alignment: Alignment.centerLeft, child: Text('Olá, ${user.name}', style: Theme.of(context).textTheme.titleMedium))), Expanded(child: GridView.builder(padding: const EdgeInsets.all(16), itemCount: tables.length, gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, childAspectRatio: 1.2, crossAxisSpacing: 12, mainAxisSpacing: 12), itemBuilder: (_, index) {
        final table = tables[index];
        return Card(child: InkWell(onTap: table.available ? () => Navigator.push(context, MaterialPageRoute(builder: (_) => OrderPage(user: user, table: table))) : null, child: Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Icon(table.available ? LucideIcons.armchair : LucideIcons.lockKeyhole, color: table.available ? Colors.green : Colors.orange), const Spacer(), Text('Mesa ${table.number}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20)), Text(table.available ? 'Livre' : 'Ocupada • R\$ ${table.value.toStringAsFixed(2)}'), if (!table.available && table.customer != null) Text(table.customer!, overflow: TextOverflow.ellipsis)]))));
      }))]);
    },
  ));
}

class OrderPage extends StatefulWidget {
  const OrderPage({required this.user, required this.table, super.key});
  final StaffUser user; final RestaurantTable table;
  @override State<OrderPage> createState() => _OrderPageState();
}

class _OrderPageState extends State<OrderPage> {
  final lines = <CartLine>[]; final customer = TextEditingController(); final note = TextEditingController(); bool confirming = false;
  double get total => lines.fold(0, (sum, line) => sum + line.total);
  void add(MenuProduct product) { final match = lines.where((line) => line.product.id == product.id && line.note.isEmpty); setState(() { if (match.isEmpty) { lines.add(CartLine(product: product)); } else { match.first.quantity++; } }); }
  Future<void> confirmOrder() async {
    if (lines.isEmpty) return;
    setState(() => confirming = true);
    try {
      await repository.confirmOrder(table: widget.table, staff: widget.user, lines: lines, customer: customer.text.trim(), generalNote: note.text.trim());
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pedido confirmado e via do pedido registrada na fila de impressão.')));
      Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString().replaceFirst('Bad state: ', ''))));
    } finally { if (mounted) setState(() => confirming = false); }
  }
  Future<void> printConsumption() async {
    final document = pw.Document();
    document.addPage(pw.Page(build: (_) => pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
      pw.Text('Murupi — Consumo da Mesa ${widget.table.number}', style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold)), pw.SizedBox(height: 12),
      if (customer.text.trim().isNotEmpty) pw.Text('Cliente: ${customer.text.trim()}'), pw.Text('Garçom: ${widget.user.name}'), pw.Divider(),
      ...lines.map((line) => pw.Padding(padding: const pw.EdgeInsets.only(bottom: 6), child: pw.Text('${line.quantity}x ${line.product.name}  R\$ ${line.total.toStringAsFixed(2)}${line.note.isEmpty ? '' : '\n  Obs.: ${line.note}'}'))),
      pw.Divider(), pw.Text('Total: R\$ ${total.toStringAsFixed(2)}', style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
    ])));
    await Printing.layoutPdf(onLayout: (_) => document.save(), name: 'consumo-mesa-${widget.table.number}.pdf');
  }
  @override void dispose() { customer.dispose(); note.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: Text('Mesa ${widget.table.number}'), actions: [IconButton(tooltip: 'Emitir consumo', onPressed: lines.isEmpty ? null : printConsumption, icon: const Icon(LucideIcons.printer))]), body: StreamBuilder<List<MenuProduct>>(stream: repository.menu(), builder: (context, snapshot) {
    if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
    final products = snapshot.data!;
    return Column(children: [Padding(padding: const EdgeInsets.all(12), child: TextField(controller: customer, decoration: const InputDecoration(labelText: 'Cliente (opcional)', border: OutlineInputBorder()))), Expanded(child: ListView.builder(itemCount: products.length, itemBuilder: (_, index) { final product = products[index]; return ListTile(onTap: () => add(product), leading: const Icon(LucideIcons.circlePlus), title: Text(product.name), subtitle: Text(product.category), trailing: Text('R\$ ${product.price.toStringAsFixed(2)}')); })), _CartBar(lines: lines, total: total, onChange: () => setState(() {}), onConfirm: confirming ? null : confirmOrder, note: note)]);
  }));
}

class _CartBar extends StatelessWidget {
  const _CartBar({required this.lines, required this.total, required this.onChange, required this.onConfirm, required this.note});
  final List<CartLine> lines; final double total; final VoidCallback onChange; final VoidCallback? onConfirm; final TextEditingController note;
  @override Widget build(BuildContext context) => SafeArea(top: false, child: Material(elevation: 8, child: Padding(padding: const EdgeInsets.all(12), child: Column(mainAxisSize: MainAxisSize.min, children: [
    ...lines.map((line) => Row(children: [Expanded(child: Text('${line.quantity}x ${line.product.name}', overflow: TextOverflow.ellipsis)), IconButton(icon: const Icon(LucideIcons.minus), onPressed: () { if (line.quantity == 1) { lines.remove(line); } else { line.quantity--; } onChange(); }), IconButton(icon: const Icon(LucideIcons.plus), onPressed: () { line.quantity++; onChange(); })])),
    TextField(controller: note, decoration: const InputDecoration(labelText: 'Observação geral do pedido', prefixIcon: Icon(LucideIcons.messageSquareText))), const SizedBox(height: 8), Row(children: [Expanded(child: Text('Total R\$ ${total.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18))), FilledButton.icon(onPressed: onConfirm, icon: const Icon(LucideIcons.check), label: const Text('Confirmar Pedido'))]),
  ])));
}
