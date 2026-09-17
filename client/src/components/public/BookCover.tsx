const palettes = [
  ['#174B78', '#2E78AE'],
  ['#155274', '#369BAF'],
  ['#176B7B', '#40B8C0'],
  ['#1B617F', '#14A39D'],
  ['#4E7A55', '#79A97D'],
  ['#414747', '#818585'],
  ['#1D4D7B', '#58B0DB'],
];

/** غلاف مولَّد بألوان الهوية عند عدم توفر صورة غلاف */
export function BookCover({ title, author, coverUrl, className = '' }: { title: string; author?: string; coverUrl?: string; className?: string }) {
  if (coverUrl) {
    return <img src={coverUrl} alt={`غلاف كتاب ${title}`} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }
  const hash = [...title].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const [from, to] = palettes[hash % palettes.length];
  return (
    <div
      role="img"
      aria-label={`غلاف كتاب ${title}`}
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden p-4 text-white ${className}`}
      style={{ backgroundImage: `linear-gradient(150deg, ${from}, ${to})` }}
    >
      <span className="absolute inset-y-0 right-0 w-2.5 bg-black/15" aria-hidden />
      <span className="absolute -bottom-10 -left-10 size-32 rounded-full border-[14px] border-white/10" aria-hidden />
      <span className="h-0.5 w-10 bg-white/60" aria-hidden />
      <span className="line-clamp-3 text-base leading-7 font-bold">{title}</span>
      <span className="line-clamp-1 text-xs text-white/80">{author}</span>
    </div>
  );
}
