import { useId, type ReactNode } from "react";
import { get, useFormContext, type FieldValues, type Path } from "react-hook-form";
import { cn } from "@/lib/utils";

/**
 * Plain, large, native form controls: they work well on low-end phones, with screen readers
 * and with the phone's own date and select pickers.
 */

const control =
  "w-full min-h-12 rounded-md border border-input bg-surface px-3.5 py-2.5 text-base text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-navy focus-visible:ring-2 focus-visible:ring-navy/25 aria-[invalid=true]:border-destructive";

function useFieldError(name: string) {
  const {
    formState: { errors },
  } = useFormContext();
  const err = get(errors, name) as { message?: string } | undefined;
  return err?.message;
}

export function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  optionalText = "(optional)",
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  /** Shown instead of the star when the answer may not exist, e.g. "(if you have one)". */
  optionalText?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <label htmlFor={id} className="font-display text-[15px] font-semibold leading-snug">
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            {" "}*
          </span>
        ) : (
          <span className="font-sans text-sm font-normal text-muted-foreground"> {optionalText}</span>
        )}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

type Common<T extends FieldValues> = {
  name: Path<T>;
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  optionalText?: string;
  className?: string;
};

export function TextField<T extends FieldValues>({
  name,
  label,
  hint,
  required,
  optionalText,
  className,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  uppercase,
  max,
}: Common<T> & {
  type?: "text" | "email" | "tel" | "date" | "number";
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  placeholder?: string;
  uppercase?: boolean;
  max?: string;
}) {
  const id = useId();
  const { register } = useFormContext<T>();
  const error = useFieldError(name);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} optionalText={optionalText} className={className}>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        max={max}
        min={type === "number" ? 0 : undefined}
        aria-invalid={!!error}
        aria-describedby={[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined}
        className={cn(control, uppercase && "uppercase placeholder:normal-case")}
        {...register(name)}
      />
    </FieldShell>
  );
}

export function TextAreaField<T extends FieldValues>({
  name,
  label,
  hint,
  required,
  className,
  rows = 3,
}: Common<T> & { rows?: number }) {
  const id = useId();
  const { register } = useFormContext<T>();
  const error = useFieldError(name);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={!!error}
        aria-describedby={[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined}
        className={cn(control, "min-h-24 resize-y")}
        {...register(name)}
      />
    </FieldShell>
  );
}

export function SelectField<T extends FieldValues>({
  name,
  label,
  hint,
  required,
  className,
  options,
  placeholder = "Choose...",
}: Common<T> & { options: readonly string[]; placeholder?: string }) {
  const id = useId();
  const { register } = useFormContext<T>();
  const error = useFieldError(name);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <select
        id={id}
        aria-invalid={!!error}
        className={cn(control, "appearance-auto pr-8")}
        defaultValue=""
        {...register(name, { setValueAs: (v) => (v === "" ? undefined : v) })}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/** Large tappable radio buttons. */
export function ChoiceField<T extends FieldValues>({
  name,
  label,
  hint,
  required = true,
  className,
  options,
  columns,
}: Common<T> & { options: readonly { value: string; label: string }[]; columns?: string }) {
  const id = useId();
  const { register } = useFormContext<T>();
  const error = useFieldError(name);
  return (
    <fieldset className={cn("grid gap-1.5", className)} aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-1.5 font-display text-[15px] font-semibold leading-snug">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            {" "}*
          </span>
        )}
      </legend>
      {hint && <p className="-mt-1 mb-1 text-sm text-muted-foreground">{hint}</p>}
      <div className={cn("grid gap-2", columns ?? "grid-cols-2 sm:flex sm:flex-wrap")}>
        {options.map((o) => (
          <label
            key={o.value}
            className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-md border border-input bg-surface px-3.5 py-2 text-base has-[:checked]:border-navy has-[:checked]:bg-navy/5 has-[:checked]:font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-navy/30"
          >
            <input type="radio" value={o.value} className="h-5 w-5 accent-[var(--navy)]" {...register(name)} />
            {o.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function YesNoField<T extends FieldValues>(props: Common<T>) {
  return (
    <ChoiceField
      {...props}
      columns="grid-cols-2 sm:flex"
      options={[
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ]}
    />
  );
}

export function CheckField<T extends FieldValues>({
  name,
  label,
  className,
}: {
  name: Path<T>;
  label: ReactNode;
  className?: string;
}) {
  const id = useId();
  const { register } = useFormContext<T>();
  const error = useFieldError(name);
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label
        htmlFor={id}
        className="flex cursor-pointer items-start gap-3 rounded-md border border-input bg-surface p-4 text-base leading-snug has-[:checked]:border-navy has-[:checked]:bg-navy/5"
      >
        <input id={id} type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--navy)]" aria-invalid={!!error} {...register(name)} />
        <span>{label}</span>
      </label>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** A tick box with an optional date beside it, as in the Health Record. */
export function TickDateField<T extends FieldValues>({ name, label }: { name: string; label: string }) {
  const id = useId();
  const { register, watch } = useFormContext<T>();
  const ticked = watch(`${name}.ticked` as Path<T>);
  const error = useFieldError(`${name}.date`);
  return (
    <div className="grid gap-1">
    <div
      className={cn(
        "grid grid-cols-[1fr_8.5rem] items-center gap-2 rounded-md border border-input bg-surface p-2 pl-3.5 has-[:checked]:border-navy",
        error && "border-destructive has-[:checked]:border-destructive",
      )}
    >
      <label htmlFor={id} className="flex min-h-10 cursor-pointer items-center gap-2.5 text-base">
        <input id={id} type="checkbox" className="h-5 w-5 accent-[var(--navy)]" {...register(`${name}.ticked` as Path<T>)} />
        {label}
      </label>
      <input
        aria-label={`${label}: date or year`}
        placeholder="Date or year"
        readOnly={!ticked}
        tabIndex={ticked ? 0 : -1}
        aria-invalid={!!error}
        className={cn(control, "min-h-10 px-2.5 py-1.5 text-sm read-only:opacity-40")}
        {...register(`${name}.date` as Path<T>)}
      />
    </div>
    {error && (
      <p role="alert" className="text-sm font-medium text-destructive">
        {label}: {error.toLowerCase()}
      </p>
    )}
    </div>
  );
}
