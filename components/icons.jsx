"use client";

import {
  Search,
  Plus,
  Bell,
  HelpCircle,
  Info,
  RotateCcw,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Star,
  Home,
  Inbox,
  LayoutGrid,
  List,
  AlignLeft,
  Zap,
  BarChart3,
  Folder,
  Users,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  MoreVertical,
  Eye,
  Paperclip,
  MessageSquare,
  Flag,
  Link as LinkIcon,
  GripVertical,
  Calendar,
  Clock,
  Play,
  Pause,
  Trash2,
  Pencil,
  Copy,
  ArrowUp,
  ArrowDown,
  Minus,
  Image as ImageIcon,
  AtSign,
  Smile,
  Send,
  Sparkles,
  RotateCw,
  Loader2,
  Menu as MenuIcon,
  Tag as TagIcon,
  Sun,
  Moon,
  Monitor,
  Contrast,
  WifiOff,
  CloudUpload,
  Download,
} from "lucide-react";

const STAR_FILLED = (props) => <Star {...props} fill="currentColor" strokeWidth={0} />;

const NAME_TO_ICON = {
  search: Search,
  plus: Plus,
  menu: MenuIcon,
  bell: Bell,
  help: HelpCircle,
  info: Info,
  "rotate-ccw": RotateCcw,
  settings: Settings,
  "chev-down": ChevronDown,
  "chev-right": ChevronRight,
  "chev-left": ChevronLeft,
  check: Check,
  x: X,
  star: Star,
  "star-fill": STAR_FILLED,
  home: Home,
  inbox: Inbox,
  board: LayoutGrid,
  list: List,
  backlog: AlignLeft,
  sprint: Zap,
  chart: BarChart3,
  folder: Folder,
  people: Users,
  filter: Filter,
  sort: ArrowUpDown,
  "more-h": MoreHorizontal,
  "more-v": MoreVertical,
  eye: Eye,
  paperclip: Paperclip,
  comment: MessageSquare,
  flag: Flag,
  link: LinkIcon,
  grip: GripVertical,
  calendar: Calendar,
  clock: Clock,
  play: Play,
  pause: Pause,
  lightning: Zap,
  trash: Trash2,
  edit: Pencil,
  copy: Copy,
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
  minus: Minus,
  image: ImageIcon,
  mention: AtSign,
  emoji: Smile,
  epic: Sparkles,
  send: Send,
  tag: TagIcon,
  refresh: RotateCw,
  loader: Loader2,
  sun: Sun,
  moon: Moon,
  monitor: Monitor,
  contrast: Contrast,
  "wifi-off": WifiOff,
  "cloud-upload": CloudUpload,
  download: Download,
};

export function Icon({ name, size = 16, className = "", style }) {
  const Cmp = NAME_TO_ICON[name];
  if (!Cmp) return null;
  return <Cmp size={size} strokeWidth={1.7} className={className} style={style} />;
}

// API-driven type badge: a colored square using the type's own color, with
// the first letter of the type name as the glyph. There is no keyword-based
// shape variation — OpenProject doesn't tell us "this is a bug" vs "this is
// a story", only the configured name and color.
export function TypeIcon({ name, color, size = 14 }) {
  if (!name) return null;
  const initial = String(name).trim().slice(0, 1).toUpperCase() || "?";
  const swatch = color || "var(--text-3)";
  return (
    <span
      className="type-ico"
      title={name}
      style={{
        width: size,
        height: size,
        backgroundColor: swatch,
        color: "var(--bg-on-color, #fff)",
        borderRadius: 3,
        display: "inline-grid",
        placeItems: "center",
        fontSize: Math.max(8, Math.round(size * 0.7)),
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {initial}
    </span>
  );
}

// API-driven priority badge: a colored dot whose size grows with the
// priority's ordinal position relative to the priority list. Higher
// rank (lower `position`) reads as a larger, more saturated dot.
export function PriorityIcon({ name, color, position, totalPositions, size = 14 }) {
  if (!name) return null;
  const dot = color || "var(--text-3)";
  const total = typeof totalPositions === "number" && totalPositions > 0 ? totalPositions : null;
  // Higher rank = larger inner dot. Default mid-size when we lack a position.
  let scale = 0.55;
  if (total && typeof position === "number") {
    const rank = 1 - (position - 1) / Math.max(1, total - 1);
    scale = 0.4 + 0.5 * Math.max(0, Math.min(1, rank));
  }
  const inner = Math.round(size * scale);
  return (
    <span
      className="priority-ico"
      title={name}
      style={{
        width: size,
        height: size,
        display: "inline-grid",
        placeItems: "center",
      }}
    >
      <span
        style={{
          width: inner,
          height: inner,
          borderRadius: "9999px",
          backgroundColor: dot,
          display: "inline-block",
        }}
      />
    </span>
  );
}
