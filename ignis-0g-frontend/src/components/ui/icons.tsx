import { AltArrowDownIcon } from "@solar-icons/react/line-duotone/alt-arrow-down"
import { AltArrowRightIcon } from "@solar-icons/react/line-duotone/alt-arrow-right"
import { ArrowDownIcon } from "@solar-icons/react/line-duotone/arrow-down"
import { ArrowRightIcon } from "@solar-icons/react/line-duotone/arrow-right"
import { ArrowRightUpIcon } from "@solar-icons/react/line-duotone/arrow-right-up"
import { AtomIcon } from "@solar-icons/react/line-duotone/atom"
import { Book2Icon } from "@solar-icons/react/line-duotone/book-2"
import { BookmarkIcon } from "@solar-icons/react/line-duotone/bookmark"
import { BotIcon } from "@solar-icons/react/line-duotone/bot"
import { CheckCircleIcon } from "@solar-icons/react/line-duotone/check-circle"
import { CloseCircleIcon } from "@solar-icons/react/line-duotone/close-circle"
import { CpuIcon } from "@solar-icons/react/line-duotone/cpu"
import { DangerTriangleIcon } from "@solar-icons/react/line-duotone/danger-triangle"
import { DatabaseIcon } from "@solar-icons/react/line-duotone/database"
import { DocumentTextIcon } from "@solar-icons/react/line-duotone/document-text"
import { DownloadIcon } from "@solar-icons/react/line-duotone/download"
import { FlameIcon } from "@solar-icons/react/line-duotone/flame"
import { FlaskIcon } from "@solar-icons/react/line-duotone/flask"
import { FolderIcon } from "@solar-icons/react/line-duotone/folder"
import { GlobalIcon } from "@solar-icons/react/line-duotone/global"
import { GraphNewUpIcon } from "@solar-icons/react/line-duotone/graph-new-up"
import { HamburgerMenuIcon } from "@solar-icons/react/line-duotone/hamburger-menu"
import { LayersIcon } from "@solar-icons/react/line-duotone/layers"
import { MagnifierIcon } from "@solar-icons/react/line-duotone/magnifier"
import { MenuDotsIcon } from "@solar-icons/react/line-duotone/menu-dots"
import { PanelLeftOpenIcon } from "@solar-icons/react/line-duotone/panel-left-open"
import { PanelRightOpenIcon } from "@solar-icons/react/line-duotone/panel-right-open"
import { RestartIcon } from "@solar-icons/react/line-duotone/restart"
import { RocketIcon } from "@solar-icons/react/line-duotone/rocket"
import { SendSquareIcon } from "@solar-icons/react/line-duotone/send-square"
import { SettingsIcon } from "@solar-icons/react/line-duotone/settings"
import { ShareIcon } from "@solar-icons/react/line-duotone/share"
import { ShieldCheckIcon } from "@solar-icons/react/line-duotone/shield-check"
import { StarsMinimalisticIcon } from "@solar-icons/react/line-duotone/stars-minimalistic"
import { TransferHorizontalIcon } from "@solar-icons/react/line-duotone/transfer-horizontal"
import { Tuning2Icon } from "@solar-icons/react/line-duotone/tuning-2"
import { WindIcon } from "@solar-icons/react/line-duotone/wind"

function solar(SolarIcon: typeof AltArrowDownIcon) {
  return function IconWrapper({ size = 24 }: { size?: number }) {
    return <SolarIcon size={size} aria-hidden="true" style={{ flexShrink: 0 }} />
  }
}

export const ArrowDown = solar(ArrowDownIcon)
export const ArrowRight = solar(ArrowRightIcon)
export const ArrowUpRight = solar(ArrowRightUpIcon)
export const Bot = solar(BotIcon)
export const ChartNoAxesCombined = solar(GraphNewUpIcon)
export const ChevronDown = solar(AltArrowDownIcon)
export const ChevronRight = solar(AltArrowRightIcon)
export const CheckCircle2 = solar(CheckCircleIcon)
export const Database = solar(DatabaseIcon)
export const FileText = solar(DocumentTextIcon)
export const FlaskConical = solar(FlaskIcon)
export const Folder = solar(FolderIcon)
export const Layers3 = solar(LayersIcon)
export const BookOpen = solar(Book2Icon)
export const Menu = solar(HamburgerMenuIcon)
export const Network = solar(AtomIcon)
export const PanelLeft = solar(PanelLeftOpenIcon)
export const PanelRight = solar(PanelRightOpenIcon)
export const Reset = solar(RestartIcon)
export const Search = solar(MagnifierIcon)
export const Send = solar(SendSquareIcon)
export const Settings = solar(SettingsIcon)
export const ShieldCheck = solar(ShieldCheckIcon)
export const SlidersHorizontal = solar(Tuning2Icon)
export const X = solar(CloseCircleIcon)
export const Bookmark = solar(BookmarkIcon)
export const Share = solar(ShareIcon)
export const MoreHorizontal = solar(MenuDotsIcon)
export const Download = solar(DownloadIcon)
export const GitCompare = solar(TransferHorizontalIcon)
export const Rocket = solar(RocketIcon)
export const Flame = solar(FlameIcon)
export const Globe = solar(GlobalIcon)
export const Wind = solar(WindIcon)
export const AlertTriangle = solar(DangerTriangleIcon)
export const Cpu = solar(CpuIcon)
export const Sparkles = solar(StarsMinimalisticIcon)
