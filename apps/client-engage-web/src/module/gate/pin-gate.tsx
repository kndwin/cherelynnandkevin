import { Button } from "@/components/ui/button.tsx";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp.tsx";
import { type ReactNode, useEffect, useState } from "react";

const entrancePin = "0226";
const storageKey = "cherelynnandkevin:entrance-unlocked";

type PinGateProps = {
  readonly children: ReactNode;
};

export const PinGate = ({ children }: PinGateProps) => {
  const [isUnlocked, setIsUnlocked] = useState(() => globalThis.localStorage?.getItem(storageKey) === "true");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("Enter the four-number PIN.");

  useEffect(() => {
    if (pin.length !== entrancePin.length) {
      return;
    }

    if (pin === entrancePin) {
      globalThis.localStorage?.setItem(storageKey, "true");
      setIsUnlocked(true);
      return;
    }

    setMessage("That PIN is not quite right.");
    setPin("");
  }, [pin]);

  if (isUnlocked) {
    return children;
  }

  return (
    <main className="box-border grid min-h-svh place-items-center p-[clamp(1rem,6vw,2rem)]">
      <section
        className="grid w-full max-w-md justify-items-center gap-4 rounded-[clamp(22px,6vw,32px)] border border-[color-mix(in_oklch,var(--purple-7),transparent_42%)] bg-[color-mix(in_oklch,var(--card),transparent_8%)] p-[clamp(1rem,6vw,1.5rem)] text-center shadow-[0_28px_90px_color-mix(in_oklch,var(--purple-11),transparent_86%)]"
        aria-labelledby="gate-title"
      >
        <p className="m-0 mb-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--purple-11)]">Cherelynn & Kevin</p>
        <h1 className="m-0 font-heading text-[clamp(2rem,10vw,3.8rem)] leading-[0.95] tracking-tight" id="gate-title">
          A little doorway
        </h1>
        <p className="m-0 text-muted-foreground">Four numbers unlock the game.</p>

        <InputOTP
          aria-label="Entrance PIN"
          autoFocus
          containerClassName="mt-1 justify-center"
          inputMode="numeric"
          maxLength={4}
          pattern="[0-9]*"
          value={pin}
          onChange={(value) => {
            setPin(value.replace(/\D/g, ""));
            setMessage("Enter the four-number PIN.");
          }}
        >
          <InputOTPGroup>
            {Array.from({ length: 4 }, (_, index) => (
              <InputOTPSlot
                className="size-[clamp(3.15rem,15vw,4rem)] border-[color-mix(in_oklch,var(--purple-7),transparent_10%)] bg-[color-mix(in_oklch,var(--purple-2),white_46%)] text-xl font-black text-[var(--purple-12)]"
                index={index}
                key={index}
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <p className="m-0 min-h-5 font-extrabold text-[var(--purple-12)]" role="status" aria-live="polite">
          {message}
        </p>
        <Button type="button" variant="secondary" onClick={() => setPin("")}>Clear</Button>
      </section>
    </main>
  );
};
