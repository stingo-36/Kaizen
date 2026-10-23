/* App icons: Phosphor (duotone for feature icons, bold for small UI glyphs), exposed under the names the
   screens already use so call sites keep the same props (size, color, strokeWidth, style). */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import type { IconProps, IconWeight } from 'phosphor-react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pulse as PActivity } from 'phosphor-react-native/src/icons/Pulse';
import { ArrowLeft as PArrowLeft } from 'phosphor-react-native/src/icons/ArrowLeft';
import { ArrowsLeftRight as PArrowLeftRight } from 'phosphor-react-native/src/icons/ArrowsLeftRight';
import { ArrowRight as PArrowRight } from 'phosphor-react-native/src/icons/ArrowRight';
import { ArrowUp as PArrowUp } from 'phosphor-react-native/src/icons/ArrowUp';
import { At as PAtSign } from 'phosphor-react-native/src/icons/At';
import { Bed as PBed } from 'phosphor-react-native/src/icons/Bed';
import { Bell as PBell } from 'phosphor-react-native/src/icons/Bell';
import { Briefcase as PBriefcase } from 'phosphor-react-native/src/icons/Briefcase';
import { BookOpen as PBookOpen } from 'phosphor-react-native/src/icons/BookOpen';
import { BookmarkSimple as PBookmark } from 'phosphor-react-native/src/icons/BookmarkSimple';
import { ArrowSquareOut as PExternalLink } from 'phosphor-react-native/src/icons/ArrowSquareOut';
import { LinkSimple as PLink2 } from 'phosphor-react-native/src/icons/LinkSimple';
import { Images as PImages } from 'phosphor-react-native/src/icons/Images';
import { Star as PStar } from 'phosphor-react-native/src/icons/Star';
import { CheckSquare as PCheckSquare } from 'phosphor-react-native/src/icons/CheckSquare';
import { ChatsCircle as PChats } from 'phosphor-react-native/src/icons/ChatsCircle';
import { Notepad as PNotepad } from 'phosphor-react-native/src/icons/Notepad';
import { Hash as PHash } from 'phosphor-react-native/src/icons/Hash';
import { PaperPlaneTilt as PSend } from 'phosphor-react-native/src/icons/PaperPlaneTilt';
import { ArrowBendUpLeft as PReply } from 'phosphor-react-native/src/icons/ArrowBendUpLeft';
import { CalendarBlank as PCalendar } from 'phosphor-react-native/src/icons/CalendarBlank';
import { InstagramLogo as PInstagram } from 'phosphor-react-native/src/icons/InstagramLogo';
import { YoutubeLogo as PYoutube } from 'phosphor-react-native/src/icons/YoutubeLogo';
import { GlobeSimple as PGlobe } from 'phosphor-react-native/src/icons/GlobeSimple';
import { CalendarCheck as PCalendarClock } from 'phosphor-react-native/src/icons/CalendarCheck';
import { Check as PCheck } from 'phosphor-react-native/src/icons/Check';
import { CheckCircle as PCheckCircle2 } from 'phosphor-react-native/src/icons/CheckCircle';
import { CaretDown as PChevronDown } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretLeft as PChevronLeft } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRight as PChevronRight } from 'phosphor-react-native/src/icons/CaretRight';
import { CaretUp as PChevronUp } from 'phosphor-react-native/src/icons/CaretUp';
import { WarningCircle as PCircleAlert } from 'phosphor-react-native/src/icons/WarningCircle';
import { Clock as PClock } from 'phosphor-react-native/src/icons/Clock';
import { Cloud as PCloud } from 'phosphor-react-native/src/icons/Cloud';
import { CloudSlash as PCloudOff } from 'phosphor-react-native/src/icons/CloudSlash';
import { Drop as PDroplet } from 'phosphor-react-native/src/icons/Drop';
import { Barbell as PDumbbell } from 'phosphor-react-native/src/icons/Barbell';
import { DotsThree as PEllipsis } from 'phosphor-react-native/src/icons/DotsThree';
import { Notebook as PNotebook } from 'phosphor-react-native/src/icons/Notebook';
import { Eye as PEye } from 'phosphor-react-native/src/icons/Eye';
import { EyeSlash as PEyeOff } from 'phosphor-react-native/src/icons/EyeSlash';
import { Flag as PFlag } from 'phosphor-react-native/src/icons/Flag';
import { Fire as PFlame } from 'phosphor-react-native/src/icons/Fire';
import { Footprints as PFootprints } from 'phosphor-react-native/src/icons/Footprints';
import { Heartbeat as PHeartPulse } from 'phosphor-react-native/src/icons/Heartbeat';
import { House as PHouse } from 'phosphor-react-native/src/icons/House';
import { Lightbulb as PLightbulb } from 'phosphor-react-native/src/icons/Lightbulb';
import { ListChecks as PListChecks } from 'phosphor-react-native/src/icons/ListChecks';
import { Lock as PLock } from 'phosphor-react-native/src/icons/Lock';
import { SignOut as PLogOut } from 'phosphor-react-native/src/icons/SignOut';
import { Envelope as PMail } from 'phosphor-react-native/src/icons/Envelope';
import { Medal as PMedal } from 'phosphor-react-native/src/icons/Medal';
import { Minus as PMinus } from 'phosphor-react-native/src/icons/Minus';
import { Moon as PMoon } from 'phosphor-react-native/src/icons/Moon';
import { PencilSimple as PPencil } from 'phosphor-react-native/src/icons/PencilSimple';
import { Play as PPlay } from 'phosphor-react-native/src/icons/Play';
import { Pause as PPause } from 'phosphor-react-native/src/icons/Pause';
import { Plus as PPlus } from 'phosphor-react-native/src/icons/Plus';
import { ArrowsClockwise as PRefreshCw } from 'phosphor-react-native/src/icons/ArrowsClockwise';
import { Gauge as PScale } from 'phosphor-react-native/src/icons/Gauge';
import { MagnifyingGlass as PSearch } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { GearSix as PSettings2 } from 'phosphor-react-native/src/icons/GearSix';
import { ShieldCheck as PShieldCheck } from 'phosphor-react-native/src/icons/ShieldCheck';
import { CreditCard as PCreditCard } from 'phosphor-react-native/src/icons/CreditCard';
import { DeviceMobile as PSmartphone } from 'phosphor-react-native/src/icons/DeviceMobile';
import { Wallet as PWallet } from 'phosphor-react-native/src/icons/Wallet';
import { ArrowDownLeft as PArrowDownLeft } from 'phosphor-react-native/src/icons/ArrowDownLeft';
import { PiggyBank as PPiggyBank } from 'phosphor-react-native/src/icons/PiggyBank';
import { Sparkle as PSparkles } from 'phosphor-react-native/src/icons/Sparkle';
import { Sun as PSun } from 'phosphor-react-native/src/icons/Sun';
import { SunHorizon as PSunrise } from 'phosphor-react-native/src/icons/SunHorizon';
import { ThumbsUp as PThumbsUp } from 'phosphor-react-native/src/icons/ThumbsUp';
import { Trash as PTrash2 } from 'phosphor-react-native/src/icons/Trash';
import { TrendDown as PTrendingDown } from 'phosphor-react-native/src/icons/TrendDown';
import { TrendUp as PTrendingUp } from 'phosphor-react-native/src/icons/TrendUp';
import { Trophy as PTrophy } from 'phosphor-react-native/src/icons/Trophy';
import { User as PUser } from 'phosphor-react-native/src/icons/User';
import { ForkKnife as PUtensils } from 'phosphor-react-native/src/icons/ForkKnife';
import { X as PX } from 'phosphor-react-native/src/icons/X';
import { Lightning as PZap } from 'phosphor-react-native/src/icons/Lightning';
import { Bicycle as PBike } from 'phosphor-react-native/src/icons/Bicycle';
import { Brain as PBrain } from 'phosphor-react-native/src/icons/Brain';
import { CigaretteSlash as PCigaretteOff } from 'phosphor-react-native/src/icons/CigaretteSlash';
import { Heart as PHeart } from 'phosphor-react-native/src/icons/Heart';
import { PenNib as PPenLine } from 'phosphor-react-native/src/icons/PenNib';
import { PersonSimpleWalk as PPersonStanding } from 'phosphor-react-native/src/icons/PersonSimpleWalk';
import { PhoneSlash as PPhoneOff } from 'phosphor-react-native/src/icons/PhoneSlash';
import { Cookie as PCookie } from 'phosphor-react-native/src/icons/Cookie';
import { Wine as PWine } from 'phosphor-react-native/src/icons/Wine';
import { Pill as PPill } from 'phosphor-react-native/src/icons/Pill';
import { BowlFood as PSalad } from 'phosphor-react-native/src/icons/BowlFood';

export type IconCmpProps = { size?: number; color?: string; strokeWidth?: number; style?: StyleProp<ViewStyle>; weight?: IconWeight };
export type LucideIcon = ComponentType<IconCmpProps>;

function wrap(I: ComponentType<IconProps>, base: IconWeight): LucideIcon {
  function Icon({ strokeWidth, weight, ...rest }: IconCmpProps) {
    // A heavier stroke at a call site (used for "selected" states) maps to the bold or fill weight.
    const w = weight ?? (strokeWidth && strokeWidth >= 2.2 ? (base === 'duotone' ? 'fill' : 'bold') : base);
    return <I weight={w} {...rest} />;
  }
  return Icon;
}

export const Activity = wrap(PActivity, 'duotone');
export const ArrowLeft = wrap(PArrowLeft, 'bold');
export const ArrowLeftRight = wrap(PArrowLeftRight, 'bold');
export const ArrowRight = wrap(PArrowRight, 'bold');
export const ArrowUp = wrap(PArrowUp, 'bold');
export const AtSign = wrap(PAtSign, 'duotone');
export const Bed = wrap(PBed, 'duotone');
export const Bell = wrap(PBell, 'duotone');
export const BookOpen = wrap(PBookOpen, 'duotone');
export const Bookmark = wrap(PBookmark, 'duotone');
export const ExternalLink = wrap(PExternalLink, 'bold');
export const Link2 = wrap(PLink2, 'bold');
export const Images = wrap(PImages, 'duotone');
export const Star = wrap(PStar, 'bold');
export const CheckSquare = wrap(PCheckSquare, 'duotone');
export const Chats = wrap(PChats, 'duotone');
export const Notepad = wrap(PNotepad, 'duotone');
export const Hash = wrap(PHash, 'bold');
export const Send = wrap(PSend, 'bold');
export const Reply = wrap(PReply, 'bold');
export const CalendarDays = wrap(PCalendar, 'bold');
export const Instagram = wrap(PInstagram, 'bold');
export const Youtube = wrap(PYoutube, 'bold');
export const Globe = wrap(PGlobe, 'bold');
export const Briefcase = wrap(PBriefcase, 'duotone');
export const Notebook = wrap(PNotebook, 'duotone');
export const CalendarClock = wrap(PCalendarClock, 'duotone');
export const Check = wrap(PCheck, 'bold');
export const CheckCircle2 = wrap(PCheckCircle2, 'duotone');
export const ChevronDown = wrap(PChevronDown, 'bold');
export const ChevronLeft = wrap(PChevronLeft, 'bold');
export const ChevronRight = wrap(PChevronRight, 'bold');
export const ChevronUp = wrap(PChevronUp, 'bold');
export const CircleAlert = wrap(PCircleAlert, 'duotone');
export const Clock = wrap(PClock, 'duotone');
export const Cloud = wrap(PCloud, 'duotone');
export const CloudOff = wrap(PCloudOff, 'duotone');
export const Droplet = wrap(PDroplet, 'duotone');
export const Dumbbell = wrap(PDumbbell, 'duotone');
export const Ellipsis = wrap(PEllipsis, 'bold');
export const Eye = wrap(PEye, 'duotone');
export const EyeOff = wrap(PEyeOff, 'duotone');
export const Flag = wrap(PFlag, 'duotone');
export const Flame = wrap(PFlame, 'duotone');
export const Footprints = wrap(PFootprints, 'duotone');
export const HeartPulse = wrap(PHeartPulse, 'duotone');
export const House = wrap(PHouse, 'duotone');
export const Lightbulb = wrap(PLightbulb, 'duotone');
export const ListChecks = wrap(PListChecks, 'duotone');
export const Lock = wrap(PLock, 'duotone');
export const LogOut = wrap(PLogOut, 'duotone');
export const Mail = wrap(PMail, 'duotone');
export const Medal = wrap(PMedal, 'duotone');
export const Minus = wrap(PMinus, 'bold');
export const Moon = wrap(PMoon, 'duotone');
export const Pencil = wrap(PPencil, 'duotone');
export const Play = wrap(PPlay, 'fill');
export const Pause = wrap(PPause, 'fill');
export const Plus = wrap(PPlus, 'bold');
export const RefreshCw = wrap(PRefreshCw, 'bold');
export const Scale = wrap(PScale, 'duotone');
export const Search = wrap(PSearch, 'bold');
export const Settings2 = wrap(PSettings2, 'duotone');
export const ShieldCheck = wrap(PShieldCheck, 'duotone');
export const CreditCard = wrap(PCreditCard, 'duotone');
export const Smartphone = wrap(PSmartphone, 'duotone');
export const Wallet = wrap(PWallet, 'duotone');
export const PiggyBank = wrap(PPiggyBank, 'duotone');
export const ArrowDownLeft = wrap(PArrowDownLeft, 'bold');
export const Sparkles = wrap(PSparkles, 'duotone');
export const Sun = wrap(PSun, 'duotone');
export const Sunrise = wrap(PSunrise, 'duotone');
export const ThumbsUp = wrap(PThumbsUp, 'duotone');
export const Trash2 = wrap(PTrash2, 'duotone');
export const TrendingDown = wrap(PTrendingDown, 'bold');
export const TrendingUp = wrap(PTrendingUp, 'bold');
export const Trophy = wrap(PTrophy, 'duotone');
export const User = wrap(PUser, 'duotone');
export const Utensils = wrap(PUtensils, 'duotone');
export const X = wrap(PX, 'bold');
export const Zap = wrap(PZap, 'duotone');
export const Bike = wrap(PBike, 'duotone');
export const Brain = wrap(PBrain, 'duotone');
export const CigaretteOff = wrap(PCigaretteOff, 'duotone');
export const Heart = wrap(PHeart, 'duotone');
export const PenLine = wrap(PPenLine, 'duotone');
export const PersonStanding = wrap(PPersonStanding, 'duotone');
export const PhoneOff = wrap(PPhoneOff, 'duotone');
export const Pill = wrap(PPill, 'duotone');
export const Salad = wrap(PSalad, 'duotone');

/** Phosphor has no crossed-out candy or wine, so draw the slash over the plain icon. */
function slashed(I: ComponentType<IconProps>): LucideIcon {
  function Icon({ size = 20, color, style }: IconCmpProps) {
    return (
      <View style={[{ width: size, height: size }, style]}>
        <I size={size} color={color} weight="duotone" />
        <View style={{ position: 'absolute', left: size * 0.1, top: size / 2 - 1, width: size * 0.8, height: 2, borderRadius: 1, backgroundColor: color, transform: [{ rotate: '-45deg' }] }} />
      </View>
    );
  }
  return Icon;
}
export const CandyOff = slashed(PCookie);
export const WineOff = slashed(PWine);
