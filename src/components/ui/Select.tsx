import * as React from "react";
import { isValidElement, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import * as SelectPrimitive from "@radix-ui/react-select";

// Create a Context for `indicatorPosition` and `indicator` control
const SelectContext = React.createContext<{
  indicatorPosition: "left" | "right";
  indicatorVisibility: boolean;
  indicator: ReactNode;
}>({ indicatorPosition: "left", indicator: null, indicatorVisibility: true });

// Root Component
const Select = ({
  indicatorPosition = "left",
  indicatorVisibility = true,
  indicator,
  ...props
}: {
  indicatorPosition?: "left" | "right";
  indicatorVisibility?: boolean;
  indicator?: ReactNode;
} & React.ComponentProps<typeof SelectPrimitive.Root>) => {
  return (
    <SelectContext.Provider
      value={{ indicatorPosition, indicatorVisibility, indicator }}
    >
      <SelectPrimitive.Root {...props} />
    </SelectContext.Provider>
  );
};

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex w-full items-center justify-between rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary shadow-2xs outline-none transition-all",
        "hover:bg-surface-hover hover:border-border-strong focus:border-border-strong focus:ring-2 focus:ring-accent/20 cursor-pointer",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[&>span]:line-clamp-1",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 text-text-primary opacity-60 -me-0.5 shrink-0" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronUp className="h-4 w-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "relative z-100 max-h-72 min-w-32 overflow-hidden rounded-lg border border-border bg-surface-elevated/98 shadow-2xl backdrop-blur-md text-text-primary",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1.5 data-[side=left]:-translate-x-1.5",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1.5",
            position === "popper" &&
              "h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width)",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn(
        "py-1.5 ps-8 pe-2 text-xs text-icon-muted font-medium",
        className,
      )}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  const { indicatorPosition, indicatorVisibility, indicator } =
    React.useContext(SelectContext);

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 text-xs font-medium outline-hidden text-text-primary",
        "hover:bg-surface-hover data-highlighted:bg-surface-hover data-[state=checked]:font-semibold data-[state=checked]:text-text-primary",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        indicatorPosition === "left" ? "ps-7 pe-2" : "pe-7 ps-2",
        className,
      )}
      {...props}
    >
      {indicatorVisibility &&
        (indicator && isValidElement(indicator) ? (
          indicator
        ) : (
          <span
            className={cn(
              "absolute flex h-3.5 w-3.5 items-center justify-center",
              indicatorPosition === "left" ? "inset-s-1.5" : "inset-e-1.5",
            )}
          >
            <SelectPrimitive.ItemIndicator>
              <Check className="h-3.5 w-3.5 text-text-primary" />
            </SelectPrimitive.ItemIndicator>
          </span>
        ))}
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1.5 my-1.5 h-px bg-border", className)}
      {...props}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
