import {
  BookOpen, BookMarked, CalendarDays, ClipboardList, FolderKanban, Globe2, Home, MapPinned, type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const mainNav: NavItem[] = [
  { to: '/', label: 'الرئيسية', icon: Home },
  { to: '/resources', label: 'المصادر الإلكترونية', icon: Globe2 },
  { to: '/books', label: 'الكتب', icon: BookOpen },
  { to: '/borrow', label: 'الاستعارة', icon: BookMarked },
  { to: '/projects', label: 'المشاريع', icon: FolderKanban },
  { to: '/events', label: 'الفعاليات', icon: CalendarDays },
  { to: '/surveys', label: 'الاستبيانات', icon: ClipboardList },
  { to: '/visit', label: 'زيارة المكتبة', icon: MapPinned },
];

export interface Service {
  to: string;
  title: string;
  description: string;
  cta: string;
  icon: LucideIcon;
  tone: string;
}

export const services: Service[] = [
  {
    to: '/resources',
    title: 'المصادر الإلكترونية',
    description: 'قواعد بيانات ومكتبات رقمية ومنصات تعليمية مختارة حسب التخصص.',
    cta: 'تصفحي المصادر',
    icon: Globe2,
    tone: 'from-brand-800 to-brand-600',
  },
  {
    to: '/borrow',
    title: 'استعارة الكتب',
    description: 'قدّمي طلب استعارة لكتاب متاح في دقائق، دون أي رسوم أو دفع.',
    cta: 'طلب استعارة',
    icon: BookMarked,
    tone: 'from-petrol-800 to-petrol-600',
  },
  {
    to: '/books',
    title: 'الكتب',
    description: 'استعرضي الكتب المتوفرة في المكتبة وحالة توفرها قبل الزيارة.',
    cta: 'استعراض الكتب',
    icon: BookOpen,
    tone: 'from-teal-800 to-teal-600',
  },
  {
    to: '/projects',
    title: 'المشاريع',
    description: 'مشاريع الطالبات المقدمة للمكتبة والمشاريع والفعاليات القادمة.',
    cta: 'عرض المشاريع',
    icon: FolderKanban,
    tone: 'from-petrol-700 to-teal-600',
  },
  {
    to: '/surveys',
    title: 'الاستبيانات',
    description: 'شاركي برأيك لتطوير خدمات المكتبة ومصادرها.',
    cta: 'شاركي الآن',
    icon: ClipboardList,
    tone: 'from-leaf-700 to-leaf-500',
  },
  {
    to: '/visit',
    title: 'زيارة المكتبة',
    description: 'أخبرينا عن زيارتك للمكتبة لنفهم احتياجاتك ونطوّر الخدمة.',
    cta: 'شاركي تجربتك',
    icon: MapPinned,
    tone: 'from-brand-700 to-teal-600',
  },
];
