const UnderConstructionView = () => {
  return (
    <main
      className="grid min-h-screen place-items-center bg-[#fffef9] p-0 text-[#37430f]"
      aria-labelledby="under-construction-title"
    >
      <div className="floral-frame invitation-card relative overflow-hidden bg-[#fffef9] px-[clamp(1.25rem,4vw,3.1rem)] py-[clamp(1.6rem,4vw,3rem)] flex items-center justify-center">
        <img className="florals-corner florals-corner-top-left" src="/florals.png" alt="" aria-hidden="true" />
        <img className="florals-corner florals-corner-top-right" src="/florals.png" alt="" aria-hidden="true" />
        <img className="florals-corner florals-corner-bottom-left" src="/florals.png" alt="" aria-hidden="true" />
        <img className="florals-corner florals-corner-bottom-right" src="/florals.png" alt="" aria-hidden="true" />
        <div className="absolute left-1/2 top-1/2 z-10 grid w-full max-w-[82cqi] min-w-0 -translate-x-1/2 -translate-y-1/2 gap-[clamp(1rem,5cqmin,1.9rem)] text-center">
          <span className="font-script text-[clamp(1.5rem,7cqmin,3.5rem)] font-normal leading-none text-[#7c8459]">
            coming soon
          </span>
          <h1
            id="under-construction-title"
            className="font-serif uppercase text-[clamp(1.6rem,9cqmin,5.5rem)] font-extralight leading-[0.95] tracking-[12%] text-[#56651f]"
          >
            Under Construction
          </h1>
          <p className="mx-auto max-w-[90%] font-sans tracking-[20%] text-[clamp(0.68rem,3cqmin,1.5rem)] italic text-[#56651f]/85">
            We are still putting the finishing touches together. Check back soon for the full details.
          </p>
        </div>
      </div>
    </main>
  );
};

export { UnderConstructionView };
