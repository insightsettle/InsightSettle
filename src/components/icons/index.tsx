/**
 * Insight icon set: Phosphor Icons (MIT, phosphor-icons.com), founder decision 28 Oct 2026.
 * Existing code keeps its familiar names (from the earlier Lucide set); each name maps to a Phosphor icon.
 * Controls (arrows, carets, check, close, plus) use the "bold" weight so they stay crisp at small sizes;
 * every other icon uses "duotone", the two-tone style that gives the brand its look. Pass `weight` to override.
 * A `strokeWidth` above 2 (used for the active phone tab) switches to the "fill" weight.
 */
import { forwardRef, type ComponentType, type SVGProps } from "react";
import {
  ArrowClockwise as PhArrowClockwise, ArrowCounterClockwise as PhArrowCounterClockwise, ArrowDown as PhArrowDown, ArrowLeft as PhArrowLeft, ArrowRight as PhArrowRight, ArrowUUpLeft as PhArrowUUpLeft, ArrowUpRight as PhArrowUpRight, ArrowsLeftRight as PhArrowsLeftRight, Bank as PhBank, Bell as PhBell, Brain as PhBrain, Briefcase as PhBriefcase, Broadcast as PhBroadcast, Buildings as PhBuildings, Calculator as PhCalculator, CalendarDots as PhCalendarDots, Car as PhCar, CaretDown as PhCaretDown, CaretLeft as PhCaretLeft, CaretRight as PhCaretRight, CaretUp as PhCaretUp, ChartBar as PhChartBar, ChatCircle as PhChatCircle, ChatText as PhChatText, Check as PhCheck, CheckCircle as PhCheckCircle, Circle as PhCircle, CircleNotch as PhCircleNotch, ClipboardText as PhClipboardText, Clock as PhClock, ClockCounterClockwise as PhClockCounterClockwise, Coins as PhCoins, Copy as PhCopy, CreditCard as PhCreditCard, CurrencyCircleDollar as PhCurrencyCircleDollar, Detective as PhDetective, DeviceMobile as PhDeviceMobile, DotsSixVertical as PhDotsSixVertical, DotsThree as PhDotsThree, DownloadSimple as PhDownloadSimple, Envelope as PhEnvelope, EnvelopeSimpleOpen as PhEnvelopeSimpleOpen, Eye as PhEye, Factory as PhFactory, FileArrowUp as PhFileArrowUp, FileMagnifyingGlass as PhFileMagnifyingGlass, FileText as PhFileText, Files as PhFiles, FloppyDisk as PhFloppyDisk, Gavel as PhGavel, GearSix as PhGearSix, GlobeHemisphereEast as PhGlobeHemisphereEast, Hammer as PhHammer, Handshake as PhHandshake, HardHat as PhHardHat, House as PhHouse, IdentificationCard as PhIdentificationCard, Info as PhInfo, Key as PhKey, Laptop as PhLaptop, Lifebuoy as PhLifebuoy, LinkSimple as PhLinkSimple, List as PhList, ListMagnifyingGlass as PhListMagnifyingGlass, ListNumbers as PhListNumbers, LockSimple as PhLockSimple, MagnifyingGlass as PhMagnifyingGlass, MapPin as PhMapPin, Minus as PhMinus, Package as PhPackage, PaperPlaneTilt as PhPaperPlaneTilt, Paperclip as PhPaperclip, PenNib as PhPenNib, Percent as PhPercent, Plus as PhPlus, Printer as PhPrinter, QrCode as PhQrCode, Receipt as PhReceipt, Scales as PhScales, Scroll as PhScroll, SealCheck as PhSealCheck, ShieldCheck as PhShieldCheck, ShieldWarning as PhShieldWarning, SidebarSimple as PhSidebarSimple, SignOut as PhSignOut, Signature as PhSignature, SlidersHorizontal as PhSlidersHorizontal, Sparkle as PhSparkle, Square as PhSquare, SquaresFour as PhSquaresFour, Stack as PhStack, StackSimple as PhStackSimple, Star as PhStar, Timer as PhTimer, Trash as PhTrash, Tray as PhTray, Trophy as PhTrophy, Truck as PhTruck, UploadSimple as PhUploadSimple, User as PhUser, UserCheck as PhUserCheck, UserMinus as PhUserMinus, Users as PhUsers, Wallet as PhWallet, Warning as PhWarning, WarningCircle as PhWarningCircle, Watch as PhWatch, Wrench as PhWrench, X as PhX, XCircle as PhXCircle,
  type Icon as PhIcon, type IconWeight,
} from "@phosphor-icons/react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref" | "strokeWidth"> & { size?: number | string; weight?: IconWeight; mirrored?: boolean; color?: string; strokeWidth?: number | string; absoluteStrokeWidth?: boolean };
/** Kept for components typed against the earlier set. */
export type LucideIcon = ComponentType<IconProps>;
export type { IconWeight };

function make(Base: PhIcon, fallback: IconWeight, name: string) {
  const C = forwardRef<SVGSVGElement, IconProps>(({ strokeWidth, absoluteStrokeWidth: _a, weight, ...rest }, ref) => {
    const w: IconWeight = weight ?? (strokeWidth != null && Number(strokeWidth) > 2 ? "fill" : fallback);
    const hidden = rest["aria-label"] == null && rest["aria-hidden"] == null ? { "aria-hidden": true as const } : {};
    return <Base ref={ref} weight={w} {...hidden} {...(rest as object)} />;
  });
  C.displayName = name;
  return C;
}

export const AlertCircle = make(PhWarningCircle, "duotone", "AlertCircle");
export const AlertTriangle = make(PhWarning, "duotone", "AlertTriangle");
export const ArrowDown = make(PhArrowDown, "bold", "ArrowDown");
export const ArrowLeft = make(PhArrowLeft, "bold", "ArrowLeft");
export const ArrowLeftRight = make(PhArrowsLeftRight, "bold", "ArrowLeftRight");
export const ArrowRight = make(PhArrowRight, "bold", "ArrowRight");
export const ArrowRightLeft = make(PhArrowsLeftRight, "bold", "ArrowRightLeft");
export const ArrowUpRight = make(PhArrowUpRight, "bold", "ArrowUpRight");
export const BadgeCheck = make(PhSealCheck, "duotone", "BadgeCheck");
export const Bell = make(PhBell, "duotone", "Bell");
export const Brain = make(PhBrain, "duotone", "Brain");
export const BriefcaseBusiness = make(PhBriefcase, "duotone", "BriefcaseBusiness");
export const Building2 = make(PhBuildings, "duotone", "Building2");
export const Calculator = make(PhCalculator, "duotone", "Calculator");
export const CalendarClock = make(PhCalendarDots, "duotone", "CalendarClock");
export const CalendarDays = make(PhCalendarDots, "duotone", "CalendarDays");
export const Car = make(PhCar, "duotone", "Car");
export const Check = make(PhCheck, "bold", "Check");
export const CheckCircle2 = make(PhCheckCircle, "duotone", "CheckCircle2");
export const ChevronDown = make(PhCaretDown, "bold", "ChevronDown");
export const ChevronDownIcon = make(PhCaretDown, "bold", "ChevronDownIcon");
export const ChevronLeft = make(PhCaretLeft, "bold", "ChevronLeft");
export const ChevronLeftIcon = make(PhCaretLeft, "bold", "ChevronLeftIcon");
export const ChevronRight = make(PhCaretRight, "bold", "ChevronRight");
export const ChevronRightIcon = make(PhCaretRight, "bold", "ChevronRightIcon");
export const ChevronUp = make(PhCaretUp, "bold", "ChevronUp");
export const Circle = make(PhCircle, "bold", "Circle");
export const CircleAlert = make(PhWarningCircle, "duotone", "CircleAlert");
export const CircleCheck = make(PhCheckCircle, "duotone", "CircleCheck");
export const CircleCheckBig = make(PhCheckCircle, "duotone", "CircleCheckBig");
export const CircleDollarSign = make(PhCurrencyCircleDollar, "duotone", "CircleDollarSign");
export const ClipboardList = make(PhClipboardText, "duotone", "ClipboardList");
export const Clock = make(PhClock, "duotone", "Clock");
export const Clock3 = make(PhClock, "duotone", "Clock3");
export const Coins = make(PhCoins, "duotone", "Coins");
export const Copy = make(PhCopy, "bold", "Copy");
export const CreditCard = make(PhCreditCard, "duotone", "CreditCard");
export const Download = make(PhDownloadSimple, "bold", "Download");
export const Eye = make(PhEye, "duotone", "Eye");
export const Factory = make(PhFactory, "duotone", "Factory");
export const FileBarChart = make(PhChartBar, "duotone", "FileBarChart");
export const FileCheck = make(PhSealCheck, "duotone", "FileCheck");
export const FileCheck2 = make(PhFiles, "duotone", "FileCheck2");
export const FileSearch = make(PhFileMagnifyingGlass, "duotone", "FileSearch");
export const FileSignature = make(PhSignature, "duotone", "FileSignature");
export const FileText = make(PhFileText, "duotone", "FileText");
export const FileUp = make(PhFileArrowUp, "duotone", "FileUp");
export const Gavel = make(PhGavel, "duotone", "Gavel");
export const Globe = make(PhGlobeHemisphereEast, "duotone", "Globe");
export const Globe2 = make(PhGlobeHemisphereEast, "duotone", "Globe2");
export const GripVertical = make(PhDotsSixVertical, "bold", "GripVertical");
export const Hammer = make(PhHammer, "duotone", "Hammer");
export const Handshake = make(PhHandshake, "duotone", "Handshake");
export const HardHat = make(PhHardHat, "duotone", "HardHat");
export const History = make(PhClockCounterClockwise, "duotone", "History");
export const Home = make(PhHouse, "duotone", "Home");
export const IdCard = make(PhIdentificationCard, "duotone", "IdCard");
export const Inbox = make(PhTray, "duotone", "Inbox");
export const Info = make(PhInfo, "duotone", "Info");
export const KeyRound = make(PhKey, "duotone", "KeyRound");
export const Landmark = make(PhBank, "duotone", "Landmark");
export const Laptop = make(PhLaptop, "duotone", "Laptop");
export const Layers = make(PhStack, "duotone", "Layers");
export const Layers3 = make(PhStackSimple, "duotone", "Layers3");
export const LayoutDashboard = make(PhSquaresFour, "duotone", "LayoutDashboard");
export const LifeBuoy = make(PhLifebuoy, "duotone", "LifeBuoy");
export const Link2 = make(PhLinkSimple, "duotone", "Link2");
export const ListOrdered = make(PhListNumbers, "duotone", "ListOrdered");
export const Loader2 = make(PhCircleNotch, "bold", "Loader2");
export const LoaderCircle = make(PhCircleNotch, "bold", "LoaderCircle");
export const Lock = make(PhLockSimple, "duotone", "Lock");
export const LogOut = make(PhSignOut, "duotone", "LogOut");
export const Mail = make(PhEnvelope, "duotone", "Mail");
export const MailCheck = make(PhEnvelopeSimpleOpen, "duotone", "MailCheck");
export const MapPin = make(PhMapPin, "duotone", "MapPin");
export const Menu = make(PhList, "bold", "Menu");
export const MessageCircle = make(PhChatCircle, "duotone", "MessageCircle");
export const MessageSquare = make(PhChatText, "duotone", "MessageSquare");
export const Minus = make(PhMinus, "bold", "Minus");
export const MoreHorizontal = make(PhDotsThree, "bold", "MoreHorizontal");
export const Package = make(PhPackage, "duotone", "Package");
export const PackageCheck = make(PhPackage, "duotone", "PackageCheck");
export const PanelLeft = make(PhSidebarSimple, "bold", "PanelLeft");
export const Paperclip = make(PhPaperclip, "duotone", "Paperclip");
export const PenTool = make(PhPenNib, "duotone", "PenTool");
export const Percent = make(PhPercent, "duotone", "Percent");
export const Plus = make(PhPlus, "bold", "Plus");
export const Printer = make(PhPrinter, "duotone", "Printer");
export const QrCode = make(PhQrCode, "duotone", "QrCode");
export const Radio = make(PhBroadcast, "duotone", "Radio");
export const Receipt = make(PhReceipt, "duotone", "Receipt");
export const ReceiptText = make(PhReceipt, "duotone", "ReceiptText");
export const RefreshCw = make(PhArrowClockwise, "bold", "RefreshCw");
export const RotateCcw = make(PhArrowCounterClockwise, "bold", "RotateCcw");
export const Save = make(PhFloppyDisk, "duotone", "Save");
export const Scale = make(PhScales, "duotone", "Scale");
export const ScanSearch = make(PhDetective, "duotone", "ScanSearch");
export const ScrollText = make(PhScroll, "duotone", "ScrollText");
export const Search = make(PhMagnifyingGlass, "bold", "Search");
export const SearchCheck = make(PhListMagnifyingGlass, "duotone", "SearchCheck");
export const Send = make(PhPaperPlaneTilt, "duotone", "Send");
export const Settings = make(PhGearSix, "duotone", "Settings");
export const ShieldAlert = make(PhShieldWarning, "duotone", "ShieldAlert");
export const ShieldCheck = make(PhShieldCheck, "duotone", "ShieldCheck");
export const SlidersHorizontal = make(PhSlidersHorizontal, "duotone", "SlidersHorizontal");
export const Smartphone = make(PhDeviceMobile, "duotone", "Smartphone");
export const Sparkles = make(PhSparkle, "duotone", "Sparkles");
export const Square = make(PhSquare, "bold", "Square");
export const Star = make(PhStar, "duotone", "Star");
export const Timer = make(PhTimer, "duotone", "Timer");
export const Trash2 = make(PhTrash, "duotone", "Trash2");
export const TriangleAlert = make(PhWarning, "duotone", "TriangleAlert");
export const Trophy = make(PhTrophy, "duotone", "Trophy");
export const Truck = make(PhTruck, "duotone", "Truck");
export const Undo2 = make(PhArrowUUpLeft, "bold", "Undo2");
export const Upload = make(PhUploadSimple, "bold", "Upload");
export const UserCheck = make(PhUserCheck, "duotone", "UserCheck");
export const UserRound = make(PhUser, "duotone", "UserRound");
export const UserRoundCheck = make(PhUserCheck, "duotone", "UserRoundCheck");
export const UserX = make(PhUserMinus, "duotone", "UserX");
export const Users = make(PhUsers, "duotone", "Users");
export const Wallet = make(PhWallet, "duotone", "Wallet");
export const Watch = make(PhWatch, "duotone", "Watch");
export const Wrench = make(PhWrench, "duotone", "Wrench");
export const X = make(PhX, "bold", "X");
export const XCircle = make(PhXCircle, "duotone", "XCircle");
