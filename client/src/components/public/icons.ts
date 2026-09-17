import { BookOpen, Database, FileText, FlaskConical, Globe, GraduationCap, Library, Newspaper, Search, Video, type LucideIcon } from 'lucide-react';

export const resourceIcons: Record<string, LucideIcon> = {
  globe: Globe,
  library: Library,
  database: Database,
  'book-open': BookOpen,
  'graduation-cap': GraduationCap,
  newspaper: Newspaper,
  search: Search,
  'file-text': FileText,
  video: Video,
  flask: FlaskConical,
};

export const resourceIconLabels: Record<string, string> = {
  globe: 'موقع',
  library: 'مكتبة',
  database: 'قاعدة بيانات',
  'book-open': 'كتاب',
  'graduation-cap': 'تعليم',
  newspaper: 'مجلة',
  search: 'بحث',
  'file-text': 'مستند',
  video: 'فيديو',
  flask: 'بحث علمي',
};
