export function TimelineItem({ title, time }: {
  title: string; time: string;
}) {
  return (
    <li className="relative grid min-h-24 grid-cols-2 items-center odd:[&>div]:col-start-1 odd:[&>div]:pr-5 odd:[&>div]:text-right even:[&>div]:col-start-2 even:[&>div]:pl-5 even:[&>div]:text-left sm:odd:[&>div]:pr-10 sm:even:[&>div]:pl-10">
      <span aria-hidden="true" className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#5c6641] bg-background" />
      <div className="min-w-0 py-4 font-serif">
        <p className="text-sm tabular-nums sm:text-base">{time}</p>
        <h3 className="mt-2 text-[clamp(1rem,4.2vw,1.75rem)] font-normal leading-tight">{title}</h3>
      </div>
    </li>
  );
}
