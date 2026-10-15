import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { cn } from "@/lib/utils.ts";
import type { ChangeEvent, ComponentProps } from "react";
import type { AttendingSelection, CheckInField } from "./check-in.machine.ts";
import { rsvpCardClass, rsvpLabelClass, rsvpNotesClass, rsvpSaveClass } from "./check-in.rsvp-styles.ts";

interface CheckInViewProps {
  readonly firstName: string;
  readonly isError: boolean;
  readonly isSubmitting: boolean;
  readonly lastName: string;
  readonly message: string | null;
  readonly onFieldChange: (field: CheckInField, value: string) => void;
  readonly onFormSubmit: NonNullable<ComponentProps<"form">["onSubmit"]>;
}

const CheckInView = ({
  firstName,
  isError,
  isSubmitting,
  lastName,
  message,
  onFieldChange,
  onFormSubmit,
}: CheckInViewProps) => {
  const handleChange =
    (field: CheckInField) => (event: ChangeEvent<HTMLInputElement>) => {
      onFieldChange(field, event.currentTarget.value);
    };

  return (
    <main
      className="login-invitation"
      aria-labelledby="wedding-title"
    >
      <div className="login-invitation-card">
        <div className="login-invitation-content">
          <div className="login-floral-arrangement">
            <div className="login-floral-side" aria-hidden="true">
              <img className="login-floral-spray" src="/floral-left.png" alt="" />
            </div>
            <img className="login-invitation-logo" src="/logo.png" width={233} height={252} alt="Kevin and Cherelynn monogram" />
            <div className="login-floral-side" aria-hidden="true">
              <img className="login-floral-spray" src="/floral-right.png" alt="" />
            </div>
          </div>
          <header className="login-invitation-heading">
            <h1 id="wedding-title" className="login-invitation-names">
              <span className="font-serif">
                Kevin
              </span>
              <span className="login-invitation-and font-script">and</span>
              <span className="font-serif">
                Cherelynn
              </span>
            </h1>
            <p className="login-invitation-intro">
              {`together with their families invite \n you to celebrate their wedding`}
            </p>
          </header>

          <form className="login-invitation-form" onSubmit={onFormSubmit}>
            <div className="login-invitation-fields">
              <label>
                <span>First name</span>
                <Input className="login-invitation-input" autoComplete="given-name" required value={firstName} onChange={handleChange("firstName")} />
              </label>
              <label>
                <span>Last name</span>
                <Input className="login-invitation-input" autoComplete="family-name" required value={lastName} onChange={handleChange("lastName")} />
              </label>
            </div>

            <Button className="login-invitation-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Logging in" : "Log in"}
            </Button>

            <p
              className={cn("login-invitation-status", isError && "login-invitation-status-error")}
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
    <section id="rsvp" aria-labelledby="rsvp-title">
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
          className={cn("mx-auto max-w-xl", rsvpCardClass)}
          onSubmit={onFormSubmit}
        >
          <RsvpAttendanceChoices attending={attending} disabled={isSubmitting} onChange={onAttendingChange} />

          <label className="grid gap-1.5">
            <span className={rsvpLabelClass}>Email</span>
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
            <span className={rsvpLabelClass}>Notes</span>
            <textarea className={rsvpNotesClass} disabled={isSubmitting} maxLength={1000} rows={3} value={notes} placeholder="Anything we should know? (optional)" onChange={(event) => onFieldChange("notes", event.currentTarget.value)} />
          </label>
          <Button className={rsvpSaveClass} disabled={!canSubmit} type="submit">
            {isSubmitting ? "Saving RSVP" : "Save RSVP"}
          </Button>
          <p className={cn("min-h-4 text-center text-[0.75rem] font-bold tracking-[0.06em] text-[#56651f]/80", isError && "text-[#9f342d]")} role="status" aria-live="polite">{message}</p>
        </form>
      </div>
    </section>
  );
};

export function RsvpAttendanceChoices({ attending, disabled, onChange }: { attending: AttendingSelection; disabled: boolean; onChange: (value: AttendingSelection) => void }) {
  return <fieldset className="grid gap-3" disabled={disabled}>
            <legend className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#56651f]/80">
              Will you be attending?
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Will you be attending?">
              {(["Yes", "No"] as const).map((option) => {
                const selected = attending === option;
                return (
                  <label
                    key={option}
                    className={cn(
                      "flex min-h-[2.75rem] cursor-pointer items-center justify-center gap-2 rounded-md border px-4 text-[0.72rem] font-bold uppercase tracking-[0.16em] transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#56651f] has-[:focus-visible]:ring-offset-2",
                      selected
                        ? "border-[#56651f] bg-[#56651f] text-[#fffef9]"
                        : "border-[#97a07c] bg-[#fffef9]/88 text-[#37430f] hover:border-[#56651f]",
                    )}
                  >
                    <input
                      className="sr-only"
                      checked={selected}
                      disabled={disabled}
                      name="attending"
                      onChange={() => onChange(option)}
                      type="radio"
                      value={option}
                    />
                    {option === "Yes" ? "Yes, I'll be there" : "No, can't make it"}
                  </label>
                );
              })}
            </div>
          </fieldset>;
}

export { CheckInView, RsvpSectionView };
export type { CheckInViewProps, RsvpSectionViewProps };
