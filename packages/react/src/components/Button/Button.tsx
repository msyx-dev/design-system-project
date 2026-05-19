import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      className,
      style,
      onClick,
      ...rest
    },
    ref,
  ) => {
    const classes = [
      `btn-${variant}`,
      size !== "md" ? `btn-${size}` : null,
      loading ? "btn-loading" : null,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const computedStyle = fullWidth ? { width: "100%", ...style } : style;

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={classes}
        disabled={isDisabled}
        aria-busy={loading}
        aria-disabled={isDisabled}
        onClick={isDisabled ? undefined : onClick}
        style={computedStyle}
        {...rest}
      >
        {leftIcon && (
          <span className="btn-icon-left" data-testid="btn-icon-left">
            {leftIcon}
          </span>
        )}
        {children}
        {rightIcon && (
          <span className="btn-icon-right" data-testid="btn-icon-right">
            {rightIcon}
          </span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
