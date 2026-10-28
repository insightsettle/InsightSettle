// GENERATED from phosphor-icons/phosphor-flutter 2.1.0 (MIT, phosphoricons.com): only the icons the app uses.
// Bundled as fonts (assets/fonts/phosphor) with plain const IconData, because the published package subclasses
// IconData, which current Flutter no longer allows. Same names as the package, so a later switch back is one import.
// To add an icon: copy its code points from the package source and add one line below.
import 'package:flutter/widgets.dart';

/// A two-layer duotone glyph: the faded secondary shape behind the primary line.
class DuotoneIconData {
  const DuotoneIconData(this.primary, this.secondary);
  final IconData primary;
  final IconData secondary;
}

/// Draws a Phosphor icon: an [IconData] (regular, bold, fill) or a [DuotoneIconData].
class PhosphorIcon extends StatelessWidget {
  const PhosphorIcon(this.icon, {super.key, this.size, this.color, this.duotoneSecondaryOpacity = 0.2, this.semanticLabel});
  final Object icon;
  final double? size;
  final Color? color;
  final double duotoneSecondaryOpacity;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final i = icon;
    if (i is DuotoneIconData) {
      return Stack(alignment: Alignment.center, children: [
        Opacity(opacity: duotoneSecondaryOpacity, child: Icon(i.secondary, size: size, color: color)),
        Icon(i.primary, size: size, color: color, semanticLabel: semanticLabel),
      ]);
    }
    return Icon(i as IconData, size: size, color: color, semanticLabel: semanticLabel);
  }
}


abstract final class PhosphorIconsRegular {
  static const bell = IconData(0xe0ce, fontFamily: 'PhosphorRegular');
  static const handshake = IconData(0xe582, fontFamily: 'PhosphorRegular');
  static const userCircle = IconData(0xe4c4, fontFamily: 'PhosphorRegular');
}

abstract final class PhosphorIconsBold {
  static const arrowLeft = IconData(0xe058, fontFamily: 'PhosphorBold');
  static const arrowRight = IconData(0xe06c, fontFamily: 'PhosphorBold');
  static const arrowSquareOut = IconData(0xe5de, fontFamily: 'PhosphorBold');
  static const check = IconData(0xe182, fontFamily: 'PhosphorBold');
  static const copy = IconData(0xe1ca, fontFamily: 'PhosphorBold');
  static const linkSimple = IconData(0xe2e6, fontFamily: 'PhosphorBold');
  static const lockSimple = IconData(0xe308, fontFamily: 'PhosphorBold');
  static const plus = IconData(0xe3d4, fontFamily: 'PhosphorBold');
  static const signOut = IconData(0xe42a, fontFamily: 'PhosphorBold');
  static const trash = IconData(0xe4a6, fontFamily: 'PhosphorBold');
  static const warningCircle = IconData(0xe4e2, fontFamily: 'PhosphorBold');
}

abstract final class PhosphorIconsFill {
  static const circle = IconData(0xe18a, fontFamily: 'PhosphorFill');
  static const coins = IconData(0xe78e, fontFamily: 'PhosphorFill');
  static const handshake = IconData(0xe582, fontFamily: 'PhosphorFill');
  static const listMagnifyingGlass = IconData(0xebe0, fontFamily: 'PhosphorFill');
  static const lockSimple = IconData(0xe308, fontFamily: 'PhosphorFill');
  static const truck = IconData(0xe4b4, fontFamily: 'PhosphorFill');
}

abstract final class PhosphorIconsDuotone {
  static const arrowsLeftRight = DuotoneIconData(IconData(0xe0a1, fontFamily: 'PhosphorDuotone'), IconData(0xe0a0, fontFamily: 'PhosphorDuotone'));
  static const bell = DuotoneIconData(IconData(0xe0cf, fontFamily: 'PhosphorDuotone'), IconData(0xe0ce, fontFamily: 'PhosphorDuotone'));
  static const bellRinging = DuotoneIconData(IconData(0xe5e9, fontFamily: 'PhosphorDuotone'), IconData(0xe5e8, fontFamily: 'PhosphorDuotone'));
  static const bellSimple = DuotoneIconData(IconData(0xe0d1, fontFamily: 'PhosphorDuotone'), IconData(0xe0d0, fontFamily: 'PhosphorDuotone'));
  static const briefcase = DuotoneIconData(IconData(0xe0ef, fontFamily: 'PhosphorDuotone'), IconData(0xe0ee, fontFamily: 'PhosphorDuotone'));
  static const clockCounterClockwise = DuotoneIconData(IconData(0xe1a1, fontFamily: 'PhosphorDuotone'), IconData(0xe1a0, fontFamily: 'PhosphorDuotone'));
  static const cloudSlash = DuotoneIconData(IconData(0xe1b7, fontFamily: 'PhosphorDuotone'), IconData(0xe1b6, fontFamily: 'PhosphorDuotone'));
  static const coins = DuotoneIconData(IconData(0xe78f, fontFamily: 'PhosphorDuotone'), IconData(0xe78e, fontFamily: 'PhosphorDuotone'));
  static const envelopeSimple = DuotoneIconData(IconData(0xe219, fontFamily: 'PhosphorDuotone'), IconData(0xe218, fontFamily: 'PhosphorDuotone'));
  static const fileText = DuotoneIconData(IconData(0xe23b, fontFamily: 'PhosphorDuotone'), IconData(0xe23a, fontFamily: 'PhosphorDuotone'));
  static const flag = DuotoneIconData(IconData(0xe245, fontFamily: 'PhosphorDuotone'), IconData(0xe244, fontFamily: 'PhosphorDuotone'));
  static const gavel = DuotoneIconData(IconData(0xea33, fontFamily: 'PhosphorDuotone'), IconData(0xea32, fontFamily: 'PhosphorDuotone'));
  static const hammer = DuotoneIconData(IconData(0xe80f, fontFamily: 'PhosphorDuotone'), IconData(0xe80e, fontFamily: 'PhosphorDuotone'));
  static const handshake = DuotoneIconData(IconData(0xe583, fontFamily: 'PhosphorDuotone'), IconData(0xe582, fontFamily: 'PhosphorDuotone'));
  static const identificationCard = DuotoneIconData(IconData(0xe2c9, fontFamily: 'PhosphorDuotone'), IconData(0xe2c8, fontFamily: 'PhosphorDuotone'));
  static const laptop = DuotoneIconData(IconData(0xe587, fontFamily: 'PhosphorDuotone'), IconData(0xe586, fontFamily: 'PhosphorDuotone'));
  static const lightning = DuotoneIconData(IconData(0xe2df, fontFamily: 'PhosphorDuotone'), IconData(0xe2de, fontFamily: 'PhosphorDuotone'));
  static const linkSimple = DuotoneIconData(IconData(0xe2e7, fontFamily: 'PhosphorDuotone'), IconData(0xe2e6, fontFamily: 'PhosphorDuotone'));
  static const listMagnifyingGlass = DuotoneIconData(IconData(0xebe1, fontFamily: 'PhosphorDuotone'), IconData(0xebe0, fontFamily: 'PhosphorDuotone'));
  static const lockKey = DuotoneIconData(IconData(0xe2ff, fontFamily: 'PhosphorDuotone'), IconData(0xe2fe, fontFamily: 'PhosphorDuotone'));
  static const lockSimple = DuotoneIconData(IconData(0xe309, fontFamily: 'PhosphorDuotone'), IconData(0xe308, fontFamily: 'PhosphorDuotone'));
  static const package = DuotoneIconData(IconData(0xe391, fontFamily: 'PhosphorDuotone'), IconData(0xe390, fontFamily: 'PhosphorDuotone'));
  static const question = DuotoneIconData(IconData(0xe3eb, fontFamily: 'PhosphorDuotone'), IconData(0xe3e8, fontFamily: 'PhosphorDuotone'));
  static const receipt = DuotoneIconData(IconData(0xe3f1, fontFamily: 'PhosphorDuotone'), IconData(0xe3ec, fontFamily: 'PhosphorDuotone'));
  static const shieldCheck = DuotoneIconData(IconData(0xe40f, fontFamily: 'PhosphorDuotone'), IconData(0xe40c, fontFamily: 'PhosphorDuotone'));
  static const translate = DuotoneIconData(IconData(0xe4a3, fontFamily: 'PhosphorDuotone'), IconData(0xe4a2, fontFamily: 'PhosphorDuotone'));
  static const truck = DuotoneIconData(IconData(0xe4b5, fontFamily: 'PhosphorDuotone'), IconData(0xe4b4, fontFamily: 'PhosphorDuotone'));
  static const user = DuotoneIconData(IconData(0xe4c3, fontFamily: 'PhosphorDuotone'), IconData(0xe4c2, fontFamily: 'PhosphorDuotone'));
  static const userCircle = DuotoneIconData(IconData(0xe4c5, fontFamily: 'PhosphorDuotone'), IconData(0xe4c4, fontFamily: 'PhosphorDuotone'));
  static const wallet = DuotoneIconData(IconData(0xe68b, fontFamily: 'PhosphorDuotone'), IconData(0xe68a, fontFamily: 'PhosphorDuotone'));
}
