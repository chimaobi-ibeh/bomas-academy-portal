import { Toaster as Sonner } from "sonner";
import { CheckCircle2, CircleAlert, Info, TriangleAlert, LoaderCircle } from "@/components/icons";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const tile = "flex h-9 w-9 items-center justify-center rounded-md [&_svg]:size-5";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: (
          <span className={`${tile} bg-success-soft text-success`}>
            <CheckCircle2 />
          </span>
        ),
        error: (
          <span className={`${tile} bg-danger-soft text-destructive`}>
            <CircleAlert />
          </span>
        ),
        warning: (
          <span className={`${tile} bg-warning-soft text-warning`}>
            <TriangleAlert />
          </span>
        ),
        info: (
          <span className={`${tile} bg-secondary text-navy`}>
            <Info />
          </span>
        ),
        loading: (
          <span className={`${tile} bg-secondary text-navy`}>
            <LoaderCircle className="animate-spin" />
          </span>
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast !gap-3 !rounded-lg !border !border-border !bg-surface !p-3 !text-foreground !shadow-[0_16px_40px_-20px_oklch(0.22_0.09_264/0.4)] !font-sans",
          title: "!font-display !text-sm !font-semibold",
          description: "!text-[13px] !text-muted-foreground",
          icon: "!m-0 !h-9 !w-9",
          actionButton: "!rounded-md !bg-primary !font-display !text-primary-foreground",
          cancelButton: "!rounded-md !bg-muted !font-display !text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
