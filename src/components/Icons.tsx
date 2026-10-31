// Simple original line icons (24x24, stroke = currentColor).
import type { ReactNode } from "react";

const I = ({ children, size = 20 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export const IconPlus = (p: { size?: number }) => <I {...p}><path d="M12 5v14M5 12h14" /></I>;
export const IconList = (p: { size?: number }) => <I {...p}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></I>;
export const IconChart = (p: { size?: number }) => <I {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></I>;
export const IconSearch = (p: { size?: number }) => <I {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></I>;
export const IconUpload = (p: { size?: number }) => <I {...p}><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></I>;
export const IconFlask = (p: { size?: number }) => <I {...p}><path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3" /><path d="M7.5 15h9" /></I>;
export const IconDoc = (p: { size?: number }) => <I {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></I>;
export const IconSwap = (p: { size?: number }) => <I {...p}><path d="M4 7h13l-3-3M20 17H7l3 3" /></I>;
export const IconFlag = (p: { size?: number }) => <I {...p}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></I>;
export const IconLeft = (p: { size?: number }) => <I {...p}><path d="m15 18-6-6 6-6" /></I>;
export const IconRight = (p: { size?: number }) => <I {...p}><path d="m9 18 6-6-6-6" /></I>;
export const IconCheck = (p: { size?: number }) => <I {...p}><path d="m5 12 5 5 9-10" /></I>;
export const IconX = (p: { size?: number }) => <I {...p}><path d="M6 6l12 12M18 6 6 18" /></I>;
export const IconPause = (p: { size?: number }) => <I {...p}><path d="M9 5v14M15 5v14" /></I>;
export const IconStop = (p: { size?: number }) => <I {...p}><rect x="5" y="5" width="14" height="14" rx="2" /></I>;
export const IconExpand = (p: { size?: number }) => <I {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></I>;
export const IconFont = (p: { size?: number }) => <I {...p}><path d="M4 19 9 5l5 14M6 14h6M15 19l3-8 3 8M16 16.5h4" /></I>;
export const IconTrash = (p: { size?: number }) => <I {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></I>;
export const IconBook = (p: { size?: number }) => <I {...p}><path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z" /><path d="M4 21V5" /></I>;
export const IconGear = (p: { size?: number }) => <I {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></I>;
export const IconGlobe = (p: { size?: number }) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></I>;
