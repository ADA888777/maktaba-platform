import { useState, type ReactNode } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Table2, BarChart3 } from 'lucide-react';
import type { LabelValue } from '../../lib/types';
import { fmtNumber } from '../../lib/format';

/**
 * ألوان الرسوم مأخوذة من لوحة الهوية.
 * الترتيب التصنيفي تم التحقق منه (فرق لوني ≥ 15 بين المتجاورات، ومناسب لعمى الألوان)،
 * ولأن لوحة الهوية منخفضة التشبع تُرفق الرسوم دائمًا بتسميات مباشرة وجدول بديل.
 */
export const CATEGORICAL = ['#155274', '#78C9E7', '#64966C', '#2B9EAB', '#1D4D7B'];
export const OTHER_COLOR = '#BFC1C1';
export const SERIES = { primary: '#215987', secondary: '#2B9EAB' };
const GRID = '#ECEDED';
const AXIS = '#818585';

export function ChartCard({
  title, subtitle, children, table, action, className = '',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  table?: { head: string[]; rows: (string | number)[][] };
  action?: ReactNode;
  className?: string;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={`card flex min-w-0 flex-col p-4 sm:p-5 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action}
          {table && (
            <button
              onClick={() => setAsTable((v) => !v)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-ink-600 hover:bg-ink-100"
              aria-pressed={asTable}
            >
              {asTable ? <BarChart3 className="size-4" /> : <Table2 className="size-4" />}
              {asTable ? 'رسم' : 'جدول'}
            </button>
          )}
        </div>
      </header>
      {asTable && table ? <MiniTable {...table} /> : children}
    </section>
  );
}

function MiniTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  if (!rows.length) return <ChartEmpty />;
  return (
    <div className="scrollbar-thin max-h-80 overflow-auto rounded-xl border border-ink-100">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-ink-50 text-xs text-ink-600">
          <tr>{head.map((h) => <th key={h} className="px-3 py-2 text-right font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-ink-100">
              {r.map((c, j) => (
                <td key={j} className={`px-3 py-2 ${typeof c === 'number' ? 'font-semibold tabular-nums' : ''}`}>
                  {typeof c === 'number' ? fmtNumber(c) : c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChartEmpty({ text = 'لا توجد بيانات كافية في هذه الفترة' }: { text?: string }) {
  return <div className="flex h-48 items-center justify-center rounded-xl bg-ink-50 text-sm text-ink-500">{text}</div>;
}

interface TipEntry {
  dataKey?: unknown;
  name?: unknown;
  value?: unknown;
  color?: string;
  payload?: { fill?: string };
}
interface TipProps {
  active?: boolean;
  payload?: readonly TipEntry[];
  label?: unknown;
  fmt?: (l: string) => string;
}

function TooltipBox({ active, payload, label, fmt }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div dir="rtl" className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs shadow-[var(--shadow-lift)]">
      <p className="mb-1 font-bold text-ink-900">{fmt ? fmt(String(label)) : String(label ?? payload[0]?.name ?? '')}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey ?? p.name)} className="flex items-center gap-2 text-ink-700">
          <span className="size-2.5 rounded-sm" style={{ background: p.color ?? p.payload?.fill }} />
          {String(p.name)}: <span className="font-bold tabular-nums text-ink-900">{fmtNumber(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

/** أعمدة أفقية تنمو من اليمين (مناسبة للتسميات العربية الطويلة) */
export function HBarChart({ data, name = 'العدد', color = SERIES.primary, max = 8 }: { data: LabelValue[]; name?: string; color?: string; max?: number }) {
  const rows = data.slice(0, max);
  if (!rows.length || rows.every((r) => !r.value)) return <ChartEmpty />;
  const height = Math.max(rows.length * 38 + 20, 120);
  return (
    <div dir="ltr" style={{ height }} role="img" aria-label={rows.map((r) => `${r.label}: ${r.value}`).join('، ')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 4, bottom: 0, left: 32 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" reversed allowDecimals={false} tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            orientation="right"
            width={150}
            tick={{ fill: '#414747', fontSize: 12, textAnchor: 'start', dx: 4 }}
            tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 19)}…` : v)}
            axisLine={false}
            tickLine={false}
            mirror={false}
          />
          <Tooltip cursor={{ fill: 'rgb(23 75 120 / 0.06)' }} content={(p) => <TooltipBox {...(p as unknown as TipProps)} />} />
          <Bar
            dataKey="value"
            name={name}
            fill={color}
            radius={[4, 0, 0, 4]}
            maxBarSize={22}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="value"
              content={(props) => {
                const { x = 0, y = 0, width = 0, height = 0, value } = props as { x?: number; y?: number; width?: number; height?: number; value?: number };
                const left = Math.min(Number(x), Number(x) + Number(width));
                return (
                  <text x={left - 6} y={Number(y) + Number(height) / 2} dy={4} textAnchor="end" fill="#414747" fontSize={11} fontWeight={600}>
                    {fmtNumber(Number(value))}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ColumnChart({
  data, xKey, yKey, name, color = SERIES.primary, formatX,
}: { data: Record<string, string | number>[]; xKey: string; yKey: string; name: string; color?: string; formatX?: (v: string) => string }) {
  if (!data.length || data.every((d) => !Number(d[yKey]))) return <ChartEmpty />;
  return (
    <div dir="ltr" className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 8 }} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey={xKey} reversed tickFormatter={formatX} tick={{ fill: AXIS, fontSize: 11 }} axisLine={{ stroke: GRID }} tickLine={false} />
          <YAxis orientation="right" allowDecimals={false} width={36} tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: 'rgb(23 75 120 / 0.06)' }} content={(p) => <TooltipBox {...(p as unknown as TipProps)} fmt={formatX} />} />
          <Bar dataKey={yKey} name={name} fill={color} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} label={data.length <= 12 ? { position: 'top', fill: '#414747', fontSize: 11 } : undefined} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendChart({
  data, xKey, series, formatX,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  series: { key: string; name: string; color: string }[];
  formatX?: (v: string) => string;
}) {
  if (!data.length || data.every((d) => series.every((s) => !Number(d[s.key])))) return <ChartEmpty />;
  return (
    <div>
      {series.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-4 text-xs text-ink-700">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded" style={{ background: s.color }} /> {s.name}
            </li>
          ))}
        </ul>
      )}
      <div dir="ltr" className="h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey={xKey} reversed tickFormatter={formatX} tick={{ fill: AXIS, fontSize: 11 }} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={24} />
            <YAxis orientation="right" allowDecimals={false} width={36} tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ stroke: '#A0A3A3', strokeDasharray: '3 3' }}
              content={(p) => <TooltipBox {...(p as unknown as TipProps)} fmt={formatX} />}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** دائري مجوّف: أكبر 4 فئات + «أخرى»، مع وسيلة إيضاح ونسب مباشرة */
export function DonutChart({ data, centerLabel = 'الإجمالي', colors = CATEGORICAL, maxSlices = 4 }: { data: LabelValue[]; centerLabel?: string; colors?: string[]; maxSlices?: number }) {
  const sorted = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  if (!sorted.length) return <ChartEmpty />;
  const head = sorted.slice(0, maxSlices);
  const rest = sorted.slice(maxSlices).reduce((s, d) => s + d.value, 0);
  const slices = rest ? [...head, { label: 'أخرى', value: rest }] : head;
  const total = slices.reduce((s, d) => s + d.value, 0);
  const colorOf = (i: number, label: string) => (label === 'أخرى' && rest ? OTHER_COLOR : colors[i % colors.length]);

  return (
    <div className="@container">
    <div className="flex flex-col items-center gap-5 @md:flex-row">
      <div className="relative size-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="100%" paddingAngle={1.5} stroke="#fff" strokeWidth={2} startAngle={90} endAngle={-270} isAnimationActive={false}>
              {slices.map((s, i) => <Cell key={s.label} fill={colorOf(i, s.label)} />)}
            </Pie>
            <Tooltip content={(p) => <TooltipBox {...(p as unknown as TipProps)} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-ink-900">{fmtNumber(total)}</span>
          <span className="text-xs text-ink-500">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2">
        {slices.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2 text-sm">
            <span className="size-3 shrink-0 rounded-sm" style={{ background: colorOf(i, s.label) }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-ink-700" title={s.label}>{s.label}</span>
            <span className="font-bold tabular-nums text-ink-900">{Math.round((s.value / total) * 100)}%</span>
            <span className="w-10 text-left text-xs tabular-nums text-ink-500">{fmtNumber(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}

/** شريط نسبة بسيط (مثلاً: زرن المكتبة / لم يزرنها) */
export function SplitBar({ a, b }: { a: { label: string; value: number }; b: { label: string; value: number } }) {
  const total = a.value + b.value;
  if (!total) return <ChartEmpty />;
  const pa = Math.round((a.value / total) * 100);
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-ink-100" role="img" aria-label={`${a.label} ${pa}%، ${b.label} ${100 - pa}%`}>
        <div className="h-full bg-teal-600" style={{ width: `${pa}%` }} />
        <div className="h-full w-0.5 bg-white" />
        <div className="h-full flex-1 bg-brand-800" />
      </div>
      <div className="mt-3 flex justify-between text-sm">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-teal-600" />{a.label} <strong className="tabular-nums">{pa}%</strong></span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-brand-800" />{b.label} <strong className="tabular-nums">{100 - pa}%</strong></span>
      </div>
    </div>
  );
}
