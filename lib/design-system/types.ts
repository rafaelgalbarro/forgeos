import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

/** Shared FHIS prop types */
export type FhisSize = "sm" | "md" | "lg";
export type FhisVariant = "primary" | "secondary" | "ghost" | "danger";
export type FhisStatus = "idle" | "active" | "success" | "warning" | "error" | "pending";

export interface FhisClassNameProps {
  className?: string;
}

export interface FhisChildrenProps {
  children?: ReactNode;
}

export interface FhisButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    FhisClassNameProps {
  variant?: FhisVariant;
  size?: FhisSize;
  loading?: boolean;
}

export interface FhisInputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    FhisClassNameProps {
  label?: string;
  hint?: string;
  error?: string;
}

export interface FhisCardProps extends HTMLAttributes<HTMLDivElement>, FhisClassNameProps {
  variant?: "default" | "elevated" | "ghost";
  padding?: FhisSize;
}
