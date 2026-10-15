import { AlertDialog as Primitive } from "@base-ui/react/alert-dialog";
import { cn } from "@/lib/utils.ts";

export const AlertDialog = Primitive.Root;
export const AlertDialogTitle = Primitive.Title;
export const AlertDialogDescription = Primitive.Description;
export const AlertDialogCancel = Primitive.Close;

export function AlertDialogContent({ className, children, ...props }: Primitive.Popup.Props) {
  return <Primitive.Portal>
    <Primitive.Backdrop className="fixed inset-0 z-50 bg-black/20" />
    <Primitive.Popup className={cn("fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg bg-popover p-6 text-popover-foreground shadow-lg", className)} {...props}>{children}</Primitive.Popup>
  </Primitive.Portal>;
}
