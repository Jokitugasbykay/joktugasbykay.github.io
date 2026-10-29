export type BadgeType = 'FITUR BARU' | 'UPDATE TERBARU' | 'BUG FIX' | 'INFO' | 'PENTING' | 'UPDATE';

export interface UpdateItem {
  id: string;
  date: string;
  title: string;
  desc: string;
  type: BadgeType;
  badgeClass: string;
}

export interface AnnouncementItem {
  id: string;
  date: string;
  title: string;
  desc: string;
  type: BadgeType;
  badgeClass: string;
}

export interface ChangelogItem {
  id: string;
  date: string;
  desc: string;
}

export interface AboutSection {
  number: string;
  id: string;
  title: string;
  content: string;
}

export interface SystemStatusItem {
  name: string;
  status: string;
  color?: string;
  dotColor?: string;
}

export interface OperationalStep {
  step: number;
  text: string;
  highlight?: boolean;
}
