import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { cn } from "@/lib/utils.ts";
import { Eye, EyeOff } from "lucide-react";
import type { ChangeEvent, ComponentProps } from "react";
import type { CheckInField } from "./check-in.machine.ts";

interface CheckInViewProps {
  readonly email: string;
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
  email,
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
      className="grid min-h-screen place-items-center bg-[#f8f6f0] p-0 sm:p-[clamp(0.75rem,2vw,1.5rem)] text-[#37430f]"
      aria-labelledby="wedding-title"
    >
      <div className="floral-frame invitation-card relative overflow-hidden border-[6px] border-white bg-[#fffef9] px-[clamp(1.25rem,4vw,3.1rem)] py-[clamp(1.6rem,4vw,3rem)] shadow-[0_18px_58px_rgb(86_101_31_/_0.13)] flex items-center justify-center">
        <img className="florals-corner florals-corner-top-left" src="/florals.png" alt="" aria-hidden="true" />
        <img className="florals-corner florals-corner-top-right" src="/florals.png" alt="" aria-hidden="true" />
        <img className="florals-corner florals-corner-bottom-left" src="/florals.png" alt="" aria-hidden="true" />
        <img className="florals-corner florals-corner-bottom-right" src="/florals.png" alt="" aria-hidden="true" />
        <div className="absolute left-1/2 top-1/2 z-10 grid w-full max-w-[82cqi] min-w-0 -translate-x-1/2 -translate-y-1/2 gap-[clamp(1rem,5cqi,1.9rem)] text-center">
          <header className="grid gap-[clamp(0.3rem,1.6cqi,0.65rem)]">
            <h1 id="wedding-title" className="grid min-w-0 justify-items-center gap-[clamp(0.1rem,0.8cqi,0.35rem)] text-[#56651f]">
              <span className="font-serif uppercase text-[clamp(1.9rem,11cqi,3.5rem)] font-extralight leading-[0.95] tracking-[15%]">
                Kevin
              </span>
              <span className="font-script text-[clamp(1.5rem,7cqi,1.875rem)] font-normal leading-none tracking-normal text-[#7c8459] my-1">and</span>
              <span className="font-serif uppercase text-[clamp(1.9rem,11cqi,3.5rem)] font-extralight leading-[0.95] tracking-[15%]">
                Cherelynn
              </span>
            </h1>
            <p className="mx-auto font-sans tracking-[30%] text-[clamp(0.68rem,3cqi,0.9rem)] italic  text-[#56651f]/85 whitespace-pre-line mt-4">
              {`together with their families invite \n you to celebrate their wedding`}
            </p>
          </header>

          <form className="mx-auto grid w-full min-w-0 max-w-[64cqi] gap-[clamp(0.6rem,2.6cqi,1.05rem)] text-left" onSubmit={onFormSubmit}>
            <div className="grid min-w-0 grid-cols-2 gap-[clamp(0.5rem,2.6cqi,1rem)]">
              <label className="grid min-w-0 gap-[clamp(0.2rem,0.8cqi,0.4rem)]">
                <span className="text-[clamp(0.5rem,2cqi,0.66rem)] font-bold uppercase tracking-[0.18em] text-[#56651f]/80">First name</span>
                <Input className="h-[clamp(2.25rem,9cqi,2.75rem)] border-[#97a07c] bg-[#fffef9]/88 text-[#37430f] focus-visible:border-[#56651f]" autoComplete="given-name" required value={firstName} onChange={handleChange("firstName")} />
              </label>
              <label className="grid min-w-0 gap-[clamp(0.2rem,0.8cqi,0.4rem)]">
                <span className="text-[clamp(0.5rem,2cqi,0.66rem)] font-bold uppercase tracking-[0.18em] text-[#56651f]/80">Last name</span>
                <Input className="h-[clamp(2.25rem,9cqi,2.75rem)] border-[#97a07c] bg-[#fffef9]/88 text-[#37430f] focus-visible:border-[#56651f]" autoComplete="family-name" required value={lastName} onChange={handleChange("lastName")} />
              </label>
            </div>

            <label className="grid min-w-0 gap-[clamp(0.2rem,0.8cqi,0.4rem)]">
              <span className="text-[clamp(0.5rem,2cqi,0.66rem)] font-bold uppercase tracking-[0.18em] text-[#56651f]/80">Site password</span>
              <div className="relative min-w-0">
                <Input
                  className="h-[clamp(2.25rem,9cqi,2.75rem)] border-[#97a07c] bg-[#fffef9]/88 pr-11 text-[#37430f] focus-visible:border-[#56651f]"
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

            <label className="grid min-w-0 gap-[clamp(0.2rem,0.8cqi,0.4rem)]">
              <span className="text-[clamp(0.5rem,2cqi,0.66rem)] font-bold uppercase tracking-[0.18em] text-[#56651f]/80">Email</span>
              <Input className="h-[clamp(2.25rem,9cqi,2.75rem)] border-[#97a07c] bg-[#fffef9]/88 text-[#37430f] focus-visible:border-[#56651f]" autoComplete="email" required type="email" value={email} onChange={handleChange("email")} />
            </label>

            <Button className="mt-1 h-[clamp(2.5rem,10cqi,3rem)] w-full bg-[#56651f] text-[clamp(0.6rem,2.4cqi,0.78rem)] font-bold uppercase tracking-[0.2em] text-[#fffef9] hover:bg-[#465319]" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Checking in" : "Log in"}
            </Button>

            <p
              className={cn("min-h-4 text-center text-[clamp(0.62rem,2.4cqi,0.78rem)] font-bold tracking-[0.06em] text-[#56651f]/80", isError && "text-[#9f342d]")}
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

export { CheckInView };
export type { CheckInViewProps };
