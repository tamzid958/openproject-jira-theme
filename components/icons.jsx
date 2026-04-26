"use client";

import {
  Search,
  Plus,
  Bell,
  HelpCircle,
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
} from "lucide-react";

const STAR_FILLED = (props) => <Star {...props} fill="currentColor" strokeWidth={0} />;

const NAME_TO_ICON = {
  search: Search,
  plus: Plus,
  menu: MenuIcon,
  bell: Bell,
  help: HelpCircle,
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
};

export function Icon({ name, size = 16, className = "", style }) {
  const Cmp = NAME_TO_ICON[name];
  if (!Cmp) return null;
  return <Cmp size={size} strokeWidth={1.7} className={className} style={style} />;
}

export function TypeIcon({ type, size = 14 }) {
  const cls = `type-ico ${type}`;
  if (type === "bug") {
    return (
      <span className={cls} style={{ width: size, height: size }}>
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 16 16" fill="white">
          <circle cx="8" cy="9" r="4" />
          <path
            stroke="white"
            strokeWidth="1.4"
            d="M8 3v2M3 8h2M11 8h2M4 4l1.5 1.5M12 4l-1.5 1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }
  if (type === "task") {
    return (
      <span className={cls} style={{ width: size, height: size }}>
        <svg
          width={size * 0.75}
          height={size * 0.75}
          viewBox="0 0 16 16"
          fill="none"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 8l3 3 7-7" />
        </svg>
      </span>
    );
  }
  if (type === "story") {
    return (
      <span className={cls} style={{ width: size, height: size }}>
        <svg width={size * 0.8} height={size * 0.8} viewBox="0 0 16 16" fill="white">
          <path
            d="M4 3h6l3 3v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
            opacity=".95"
          />
        </svg>
      </span>
    );
  }
  if (type === "epic") {
    return (
      <span className={cls} style={{ width: size, height: size }}>
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 16 16" fill="white">
          <path d="M8 2 14 8l-3 6H5l-3-6z" />
        </svg>
      </span>
    );
  }
  if (type === "subtask") {
    return (
      <span className={cls} style={{ width: size, height: size }}>
        <svg
          width={size * 0.75}
          height={size * 0.75}
          viewBox="0 0 16 16"
          fill="none"
          stroke="white"
          strokeWidth="1.8"
        >
          <rect x="2" y="6" width="6" height="6" rx="1" />
          <rect x="8" y="2" width="6" height="6" rx="1" />
        </svg>
      </span>
    );
  }
  return null;
}

const PRIORITY_COLORS = {
  highest: "var(--pri-highest)",
  high: "var(--pri-high)",
  medium: "var(--pri-medium)",
  low: "var(--pri-low)",
  lowest: "var(--pri-lowest)",
};

export function PriorityIcon({ priority, size = 14 }) {
  const color = PRIORITY_COLORS[priority] || "var(--text-3)";
  if (priority === "medium") {
    return (
      <span className="priority-ico" style={{ color, width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M3 6h10M3 10h10" />
        </svg>
      </span>
    );
  }
  if (priority === "lowest" || priority === "low") {
    return (
      <span className="priority-ico" style={{ color, width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6l5 5 5-5" />
          {priority === "lowest" && <path d="M3 2l5 5 5-5" />}
        </svg>
      </span>
    );
  }
  return (
    <span className="priority-ico" style={{ color, width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 10l5-5 5 5" />
        {priority === "highest" && <path d="M3 14l5-5 5 5" />}
      </svg>
    </span>
  );
}
