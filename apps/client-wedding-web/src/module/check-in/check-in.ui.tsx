import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { cn } from "@/lib/utils.ts";
import { PolaroidCard, SectionHeading } from "../wedding/presentation";
import type { ChangeEvent, ComponentProps, ReactNode } from "react";
import type { AttendingSelection, CheckInField } from "./check-in.machine.ts";
import { rsvpCardClass, rsvpFieldClass, rsvpInputClass, rsvpLabelClass, rsvpNotesClass, rsvpSaveClass } from "./check-in.rsvp-styles.ts";

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
  readonly calendarAction?: ReactNode;
  readonly attending: AttendingSelection;
  readonly email: string;
  readonly firstName: string;
  readonly isError: boolean;
  readonly isSubmitting: boolean;
  readonly message: string | null;
  readonly notes: string;
  readonly dietaryRequirements?: string;
  readonly onAttendingChange: (value: AttendingSelection) => void;
  readonly onFieldChange: (field: CheckInField, value: string) => void;
  readonly onFormSubmit: NonNullable<ComponentProps<"form">["onSubmit"]>;
}

const RsvpSectionView = ({
  calendarAction,
  attending,
  email,
  isError,
  isSubmitting,
  message,
  notes,
  dietaryRequirements = "",
  onAttendingChange,
  onFieldChange,
  onFormSubmit,
}: RsvpSectionViewProps) => {
  const canSubmit =
    !isSubmitting && (attending === "Yes" || attending === "No") && email.trim().length > 0;

  return (
    <section id="rsvp" aria-labelledby="rsvp-title">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-8 text-center">
          <SectionHeading id="rsvp-title">
            RSVP
          </SectionHeading>
        </header>

        <PolaroidCard as="form"
          className={cn("mx-auto max-w-xl", rsvpCardClass)}
          onSubmit={onFormSubmit}
        >
          <RsvpAttendanceChoices attending={attending} disabled={isSubmitting} onChange={onAttendingChange} />

          <label className={rsvpFieldClass}>
            <span className={rsvpLabelClass}>Email</span>
            <Input
              className={rsvpInputClass}
              autoComplete="email"
              disabled={isSubmitting}
              maxLength={254}
              required
              type="email"
              value={email}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onFieldChange("email", event.currentTarget.value)}
            />
          </label>

          <label className={rsvpFieldClass}>
            <span className={rsvpLabelClass}>Dietary requirements</span>
            <textarea className={rsvpNotesClass} disabled={isSubmitting} maxLength={1000} rows={3} value={dietaryRequirements} placeholder="Any allergies or dietary requirements?" onChange={(event) => onFieldChange("dietaryRequirements", event.currentTarget.value)} />
          </label>

          <label className={rsvpFieldClass}>
            <span className={rsvpLabelClass}>Notes</span>
            <textarea className={rsvpNotesClass} disabled={isSubmitting} maxLength={1000} rows={3} value={notes} placeholder="Anything we should know?" onChange={(event) => onFieldChange("notes", event.currentTarget.value)} />
          </label>
          <Button className={rsvpSaveClass} disabled={!canSubmit} type="submit">
            {isSubmitting ? "Saving RSVP" : "Save RSVP"}
          </Button>
          <p className={cn("min-h-4 text-center text-[0.75rem] font-bold tracking-[0.06em] text-olive/80", isError && "text-destructive")} role="status" aria-live="polite">{message}</p>
          {calendarAction ? <div className="text-center">{calendarAction}</div> : null}
        </PolaroidCard>
      </div>
    </section>
  );
};

export function RsvpAttendanceChoices({ attending, disabled, onChange }: { attending: AttendingSelection; disabled: boolean; onChange: (value: AttendingSelection) => void }) {
  return <fieldset className="min-w-0" disabled={disabled}>
    <legend className={rsvpLabelClass}>
      Will you be attending?
    </legend>
    <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2" role="radiogroup" aria-label="Will you be attending?">
      {(["Yes", "No"] as const).map((option) => {
        const selected = attending === option;
        return (
          <label
            key={option}
            className={cn(
              "flex min-h-[2.75rem] cursor-pointer items-center justify-center gap-2 rounded-none border px-4 text-[0.72rem] font-bold uppercase tracking-[0.16em] transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-olive has-[:focus-visible]:ring-offset-2",
              selected
                ? "border-olive bg-olive text-paper"
                : "border-input bg-paper/88 text-foreground hover:border-olive",
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
