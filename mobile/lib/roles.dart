/// Presentation names only; API identifiers and party permissions stay unchanged.
class PartyName {
  const PartyName(this.en, this.ar);
  final String en;
  final String ar;
  String get capitalized => '${en[0].toUpperCase()}${en.substring(1)}';
  String get arabicTo => ar.startsWith('ال') ? 'لل${ar.substring(2)}' : 'ل$ar';
}

class DealRoles {
  const DealRoles(this.payer, this.payee);
  final PartyName payer;
  final PartyName payee;
}

const _roles = <String, DealRoles>{
  'goods': DealRoles(PartyName('buyer', 'المشتري'), PartyName('seller', 'البائع')),
  'services': DealRoles(PartyName('client', 'العميل'), PartyName('service provider', 'مقدّم الخدمة')),
  'freelance': DealRoles(PartyName('client', 'العميل'), PartyName('service provider', 'مقدّم الخدمة')),
  'contracting': DealRoles(PartyName('owner', 'المالك'), PartyName('contractor', 'المقاول')),
  'auction': DealRoles(PartyName('winner', 'الفائز'), PartyName('organiser', 'المنظّم')),
};

const genericRoles = DealRoles(PartyName('payer', 'الدافع'), PartyName('payee', 'المستفيد'));
DealRoles rolesFor(String? dealType) => _roles[dealType] ?? genericRoles;