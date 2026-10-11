import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { cn } from "@/lib/utils.ts";
import { Eye, EyeOff } from "lucide-react";
import type { ChangeEvent, ComponentProps } from "react";
import type { AttendingSelection, CheckInField } from "./check-in.machine.ts";

interface CheckInViewProps {
  readonly firstName: string;
  readonly isError: boolean;
  readonly isSubmitting: boolean;
  readonly lastName: string;
  readonly message: string | null;
  readonly onFieldChange: (field: CheckInField, value: string) => void;
  readonly onFormSubmit: NonNullable<ComponentProps<"form">["onSubmit"]>;
  readonly onPasswordVisibilityToggle: () => void;
  readonly showPassword: boolean;
  readonly sitePassword: string;
}

const CheckInView = ({
  firstName,
  isError,
  isSubmitting,
  lastName,
  message,
  onFieldChange,
  onFormSubmit,
  onPasswordVisibilityToggle,
  showPassword,
  sitePassword,
}: CheckInViewProps) => {
  const handleChange =
    (field: CheckInField) => (event: ChangeEvent<HTMLInputElement>) => {
      onFieldChange(field, event.currentTarget.value);
    };

  return (
    <main
      className="grid min-h-screen place-items-center bg-[#fffef9] p-0 text-[#37430f]"
      aria-labelledby="wedding-title"
    >
      <div className="floral-frame invitation-card relative overflow-hidden bg-[#fffef9] px-[clamp(1.25rem,4vw,3.1rem)] py-[clamp(1.6rem,4vw,3rem)] flex items-center justify-center">
        <img className="florals-corner florals-corner-top-left" src="/florals.png" alt="" aria-hidden="true" />
        <img className="florals-corner florals-corner-top-right" src="/florals.png" alt="" aria-hidden="true" />
        <img className="florals-corner florals-corner-bottom-left" src="/florals.png" alt="" aria-hidden="true" />
        <img className="florals-corner florals-corner-bottom-right" src="/florals.png" alt="" aria-hidden="true" />
        <div className="absolute left-1/2 top-1/2 z-10 grid w-full max-w-[82cqi] min-w-0 -translate-x-1/2 -translate-y-1/2 gap-[clamp(1rem,5cqmin,1.9rem)] text-center">
          <header className="grid gap-[clamp(0.3rem,1.6cqmin,0.65rem)]">
            <h1 id="wedding-title" className="grid min-w-0 justify-items-center gap-[clamp(0.1rem,0.8cqmin,0.35rem)] text-[#56651f]">
              <span className="font-serif uppercase text-[clamp(1.9rem,11cqmin,7rem)] font-extralight leading-[0.95] tracking-[15%]">
                Kevin
              </span>
              <span className="font-script text-[clamp(1.5rem,7cqmin,3.5rem)] font-normal leading-none tracking-normal text-[#7c8459] my-1">and</span>
              <span className="font-serif uppercase text-[clamp(1.9rem,11cqmin,7rem)] font-extralight leading-[0.95] tracking-[15%]">
                Cherelynn
              </span>
            </h1>
            <p className="mx-auto font-sans tracking-[30%] text-[clamp(0.68rem,3cqmin,1.5rem)] italic  text-[#56651f]/85 whitespace-pre-line mt-4">
              {`together with their families invite \n you to celebrate their wedding`}
            </p>
          </header>

          <form className="mx-auto grid w-full min-w-0 max-w-[64cqi] gap-[clamp(0.6rem,2.6cqmin,1.05rem)] text-left" onSubmit={onFormSubmit}>
            <div className="grid min-w-0 grid-cols-2 gap-[clamp(0.5rem,2.6cqmin,1rem)]">
              <label className="grid min-w-0 gap-[clamp(0.2rem,0.8cqmin,0.4rem)]">
                <span className="text-[clamp(0.5rem,2cqmin,0.66rem)] font-bold uppercase tracking-[0.18em] text-[#56651f]/80">First name</span>
                <Input className="h-[clamp(2.25rem,9cqmin,2.75rem)] border-[#97a07c] bg-[#fffef9]/88 text-[#37430f] focus-visible:border-[#56651f]" autoComplete="given-name" required value={firstName} onChange={handleChange("firstName")} />
              </label>
              <label className="grid min-w-0 gap-[clamp(0.2rem,0.8cqmin,0.4rem)]">
                <span className="text-[clamp(0.5rem,2cqmin,0.66rem)] font-bold uppercase tracking-[0.18em] text-[#56651f]/80">Last name</span>
                <Input className="h-[clamp(2.25rem,9cqmin,2.75rem)] border-[#97a07c] bg-[#fffef9]/88 text-[#37430f] focus-visible:border-[#56651f]" autoComplete="family-name" required value={lastName} onChange={handleChange("lastName")} />
              </label>
            </div>

            <label className="grid min-w-0 gap-[clamp(0.2rem,0.8cqmin,0.4rem)]">
              <span className="text-[clamp(0.5rem,2cqmin,0.66rem)] font-bold uppercase tracking-[0.18em] text-[#56651f]/80">Site password</span>
              <div className="relative min-w-0">
                <Input
                  className="h-[clamp(2.25rem,9cqmin,2.75rem)] border-[#97a07c] bg-[#fffef9]/88 pr-11 text-[#37430f] focus-visible:border-[#56651f]"
                  autoComplete="current-password"
                  required
                  type={showPassword ? "text" : "password"}
                  value={sitePassword}
                  onChange={handleChange("sitePassword")}
                />
                <Button
                  aria-label={showPassword ? "Hide site password" : "Show site password"}
                  size="icon"
                  type="button"
                  variant="ghost"
                  className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-[#56651f] hover:bg-[#d6ddbf]/35"
                  onClick={onPasswordVisibilityToggle}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </label>

            <Button className="mt-1 h-[clamp(2.5rem,10cqmin,3rem)] w-full bg-[#56651f] text-[clamp(0.6rem,2.4cqmin,0.78rem)] font-bold uppercase tracking-[0.2em] text-[#fffef9] hover:bg-[#465319]" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Logging in" : "Log in"}
            </Button>

            <p
              className={cn("min-h-4 text-center text-[clamp(0.62rem,2.4cqmin,0.78rem)] font-bold tracking-[0.06em] text-[#56651f]/80", isError && "text-[#9f342d]")}
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          </form>
        </div>
      </div>
    </main>
  );
};

interface RsvpSectionViewProps {
  readonly attending: AttendingSelection;
  readonly email: string;
  readonly firstName: string;
  readonly isError: boolean;
  readonly isSubmitting: boolean;
  readonly message: string | null;
  readonly notes: string;
  readonly onAttendingChange: (value: AttendingSelection) => void;
  readonly onFieldChange: (field: CheckInField, value: string) => void;
  readonly onFormSubmit: NonNullable<ComponentProps<"form">["onSubmit"]>;
}

const RsvpSectionView = ({
  attending,
  email,
  firstName,
  isError,
  isSubmitting,
  message,
  notes,
  onAttendingChange,
  onFieldChange,
  onFormSubmit,
}: RsvpSectionViewProps) => {
  const greeting = firstName.trim() ? `, ${firstName.trim()}` : "";
  const canSubmit =
    !isSubmitting && (attending === "Yes" || attending === "No") && email.trim().length > 0;

  return (
    <section id="rsvp" aria-labelledby="rsvp-title" className="border-t border-[#aeb89a]/20 bg-[#f8f6f0]/50">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-8 text-center">
          <p className="font-script text-[1.5rem] leading-none text-[#7c8459]">répondez s&apos;il vous plaît</p>
          <h2 id="rsvp-title" className="mt-2 font-serif text-[1.55rem] font-extralight uppercase tracking-[0.18em] text-[#37430f] sm:text-[1.75rem]">
            RSVP
          </h2>
          <div className="mx-auto mt-3 h-px w-10 bg-[#aeb89a]/50" aria-hidden />
          <p className="mx-auto mt-3 max-w-md font-sans text-[0.76rem] leading-relaxed text-[#56651f]/70">
            {`Welcome${greeting} — let us know if we will see you there.`}
          </p>
        </header>

        <form
          className="mx-auto grid w-full max-w-xl gap-4 rounded-2xl border border-[#aeb89a]/25 bg-[#fffef9] px-5 py-6 text-left shadow-[0_1px_12px_rgba(55,67,15,0.06)] sm:px-7"
          onSubmit={onFormSubmit}
        >
          <fieldset className="grid gap-3">
            <legend className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#56651f]/80">
              Will you be attending?
            </legend>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Will you be attending?">
              {(["Yes", "No"] as const).map((option) => {
                const selected = attending === option;
                return (
                  <label
                    key={option}
                    className={cn(
                      "flex min-h-[2.75rem] cursor-pointer items-center justify-center gap-2 rounded-md border px-4 text-[0.72rem] font-bold uppercase tracking-[0.16em] transition",
                      selected
                        ? "border-[#56651f] bg-[#56651f] text-[#fffef9]"
                        : "border-[#97a07c] bg-[#fffef9]/88 text-[#37430f] hover:border-[#56651f]",
                    )}
                  >
                    <input
                      className="sr-only"
                      checked={selected}
                      disabled={isSubmitting}
                      name="attending"
                      onChange={() => onAttendingChange(option)}
                      type="radio"
                      value={option}
                    />
                    {option === "Yes" ? "Yes, I'll be there" : "No, can't make it"}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="grid gap-1.5">
            <span className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#56651f]/80">Email</span>
            <Input
              className="h-11 border-[#97a07c] bg-[#fffef9]/88 text-[#37430f] focus-visible:border-[#56651f]"
              autoComplete="email"
              disabled={isSubmitting}
              maxLength={254}
              required
              type="email"
              value={email}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onFieldChange("email", event.currentTarget.value)}
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#56651f]/80">Notes</span>
            <textarea
              className="min-h-24 rounded-md border border-[#97a07c] bg-[#fffef9]/88 px-3 py-2 font-sans text-[0.85rem] leading-relaxed text-[#37430f] placeholder:text-[#7c8459]/60 focus-visible:border-[#56651f] focus-visible:outline-none disabled:opacity-60"
              disabled={isSubmitting}
              maxLength={1000}
              rows={3}
              value={notes}
              placeholder="Anything we should know? (optional)"
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onFieldChange("notes", event.currentTarget.value)}
            />
          </label>

          <Button
            className="mt-1 h-12 w-full bg-[#56651f] text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#fffef9] hover:bg-[#465319]"
            disabled={!canSubmit}
            type="submit"
          >
            {isSubmitting ? "Saving RSVP" : "Save RSVP"}
          </Button>

          <p
            className={cn("min-h-4 text-center text-[0.75rem] font-bold tracking-[0.06em] text-[#56651f]/80", isError && "text-[#9f342d]")}
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        </form>
      </div>
    </section>
  );
};

export { CheckInView, RsvpSectionView };
export type { CheckInViewProps, RsvpSectionViewProps };
