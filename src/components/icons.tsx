import * as React from "react";
import {
  ArrowLeft as PArrowLeft,
  ArrowLineDown,
  ArrowRight as PArrowRight,
  ArrowSquareOut,
  ArrowUpRight as PArrowUpRight,
  Article as PArticle,
  Backpack,
  BookOpenText as PBookOpenText,
  Books,
  Buildings,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  ChatCircleDots,
  Check as PCheck,
  CheckCircle,
  CircleNotch,
  ArrowCounterClockwise,
  DotsThree,
  Eye as PEye,
  EyeSlash,
  GlobeSimple,
  House,
  MagnifyingGlass,
  Megaphone,
  SquaresFour,
  UserCircle,
  CloudArrowUp,
  Rocket,
  Pause as PPause,
  Play as PPlay,
  Compass as PCompass,
  Circle as PCircle,
  Clock as PClock,
  Desktop,
  Door,
  EnvelopeSimple,
  FacebookLogo,
  File,
  FileText as PFileText,
  FloppyDisk,
  Flask,
  ForkKnife,
  GlobeHemisphereWest,
  GraduationCap as PGraduationCap,
  Fingerprint,
  HandHeart,
  Heartbeat,
  Image as PImage,
  Lightning,
  Medal,
  RocketLaunch,
  Info as PInfo,
  InstagramLogo,
  Lock as PLock,
  MapPin as PMapPin,
  MusicNotes,
  Newspaper as PNewspaper,
  PaperPlaneTilt,
  PencilSimple,
  Phone as PPhone,
  Plus as PPlus,
  Question,
  ShieldCheck as PShieldCheck,
  SignOut,
  Smiley,
  Sparkle,
  Trash,
  Trophy as PTrophy,
  TShirt,
  Tray,
  UploadSimple,
  UsersThree,
  Warning,
  WarningCircle,
  X as PX,
  XLogo,
  YoutubeLogo,
  type Icon as PhosphorIcon,
  type IconWeight,
} from "@phosphor-icons/react";

/**
 * One icon family for the whole site: Phosphor.
 * Content icons are duotone (a soft tint behind the line), controls are bold so
 * they stay crisp at small sizes. Names match the old set so call sites stay simple.
 */
export type LucideIcon = React.ComponentType<{ className?: string }>;

function make(Base: PhosphorIcon, weight: IconWeight): LucideIcon {
  const Wrapped = ({ className }: { className?: string }) => (
    <Base weight={weight} className={className} aria-hidden="true" />
  );
  Wrapped.displayName = `Icon(${Base.displayName ?? "icon"})`;
  return Wrapped;
}

// Controls and arrows
export const ArrowRight = make(PArrowRight, "bold");
export const ArrowLeft = make(PArrowLeft, "bold");
export const ArrowUpRight = make(PArrowUpRight, "bold");
export const ArrowDownToLine = make(ArrowLineDown, "bold");
export const ChevronDown = make(CaretDown, "bold");
export const ChevronUp = make(CaretUp, "bold");
export const Undo = make(ArrowCounterClockwise, "bold");
export const MoreHorizontal = make(DotsThree, "bold");
export const Eye = make(PEye, "bold");
export const EyeOff = make(EyeSlash, "bold");
export const Search = make(MagnifyingGlass, "bold");
export const Home = make(House, "duotone");
export const Dashboard = make(SquaresFour, "duotone");
export const Website = make(GlobeSimple, "duotone");
export const Announce = make(Megaphone, "duotone");
export const Account = make(UserCircle, "duotone");
export const DropFiles = make(CloudArrowUp, "duotone");
export const Launch = make(Rocket, "duotone");
export const Pause = make(PPause, "fill");
export const Play = make(PPlay, "fill");
export const ChevronLeft = make(CaretLeft, "bold");
export const ChevronRight = make(CaretRight, "bold");
export const X = make(PX, "bold");
export const Check = make(PCheck, "bold");
export const Circle = make(PCircle, "fill");
export const Plus = make(PPlus, "bold");
export const Send = make(PaperPlaneTilt, "bold");
export const ExternalLink = make(ArrowSquareOut, "bold");
export const LogOut = make(SignOut, "bold");
export const Upload = make(UploadSimple, "bold");
export const Loader2 = make(CircleNotch, "bold");
export const LoaderCircle = Loader2;
export const Pencil = make(PencilSimple, "bold");
export const Trash2 = make(Trash, "bold");
export const Save = make(FloppyDisk, "bold");

// Status
export const CheckCircle2 = make(CheckCircle, "duotone");
export const CircleAlert = make(WarningCircle, "duotone");
export const TriangleAlert = make(Warning, "duotone");
export const Info = make(PInfo, "duotone");

// Content
export const Mail = make(EnvelopeSimple, "duotone");
export const Phone = make(PPhone, "duotone");
export const MapPin = make(PMapPin, "duotone");
export const Clock = make(PClock, "duotone");
export const Lock = make(PLock, "duotone");
export const Facebook = make(FacebookLogo, "fill");
export const Instagram = make(InstagramLogo, "bold");
export const Youtube = make(YoutubeLogo, "fill");
export const XLogoIcon = make(XLogo, "bold");
export const FileText = make(PFileText, "duotone");
export const File2 = make(File, "duotone");
export const GraduationCap = make(PGraduationCap, "duotone");
export const BookOpenText = make(PBookOpenText, "duotone");
export const School = make(Backpack, "duotone");
export const MessageCircle = make(ChatCircleDots, "duotone");
export const Users = make(UsersThree, "duotone");
export const DoorOpen = make(Door, "duotone");
export const ShieldCheck = make(PShieldCheck, "duotone");
export const HeartPulse = make(Heartbeat, "duotone");
export const Globe2 = make(GlobeHemisphereWest, "duotone");
export const Sparkles = make(Sparkle, "duotone");
export const Shirt = make(TShirt, "duotone");
export const Library = make(Books, "duotone");
export const FlaskConical = make(Flask, "duotone");
export const Monitor = make(Desktop, "duotone");
export const Trophy = make(PTrophy, "duotone");
export const Music = make(MusicNotes, "duotone");
export const Utensils = make(ForkKnife, "duotone");
export const Smile = make(Smiley, "duotone");
export const HelpCircle = make(Question, "duotone");
export const Building2 = make(Buildings, "duotone");
export const Newspaper = make(PNewspaper, "duotone");
export const ImageIcon = make(PImage, "duotone");
export const Image = ImageIcon;
export const Compass = make(PCompass, "duotone");
export const Inbox = make(Tray, "duotone");
export const LayoutList = make(PArticle, "duotone");

// One icon per BOMAS value.
export const VALUE_ICONS: Record<string, LucideIcon> = {
  bravery: make(Lightning, "duotone"),
  opportunity: make(RocketLaunch, "duotone"),
  mastery: make(Medal, "duotone"),
  authenticity: make(Fingerprint, "duotone"),
  service: make(HandHeart, "duotone"),
};

// Facilities are free text from the database, so the icon is matched by name.
const FACILITY_ICONS: [string, LucideIcon][] = [
  ["library", Library],
  ["science", FlaskConical],
  ["lab", FlaskConical],
  ["computer", Monitor],
  ["ict", Monitor],
  ["sport", Trophy],
  ["field", Trophy],
  ["music", Music],
  ["art", Music],
  ["dining", Utensils],
  ["hall", Utensils],
  ["playground", Smile],
];

export function facilityIcon(title: string): LucideIcon {
  const t = title.toLowerCase();
  return FACILITY_ICONS.find(([k]) => t.includes(k))?.[1] ?? Building2;
}
