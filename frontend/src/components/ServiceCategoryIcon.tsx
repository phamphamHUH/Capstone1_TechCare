import React from "react";
import { Stethoscope, FlaskConical, type LucideProps } from "lucide-react";

export type ServiceCategoryGroup = "consultation" | "laboratory";

export interface ServiceLike {
  service_id?: string;
  service_type?: string | null;
  service_category?: string | null;
  category?: string | null;
  service_name?: string | null;
  room?: string | null;
}

export const SERVICE_CATEGORY_GROUPS = {
  CONSULTATION: "consultation",
  LABORATORY: "laboratory",
} as const;

export const SERVICE_CATEGORY_ICONS = {
  consultation: Stethoscope,
  laboratory: FlaskConical,
} as const;

/**
 * Category and type mappings strictly derived from the TechCare database schema,
 * migrations, and seed definitions (services table: service_type, service_category).
 */
const CONSULTATION_TYPES = new Set(["consultation"]);
const CONSULTATION_CATEGORIES = new Set([
  "consultation",
  "general medicine",
  "pediatrics",
]);

const LABORATORY_TYPES = new Set(["laboratory", "imaging"]);
const LABORATORY_CATEGORIES = new Set([
  "laboratory",
  "imaging",
  "clinical chemistry",
  "clinical microscopy",
  "hematology",
  "radiology",
  "blood chemistry",
  "enzymes",
  "electrolytes",
]);

/**
 * Resolves whether a service or category belongs to "consultation" or "laboratory"
 * using only the project's existing category data without guessing.
 * Returns null if the category is unverified or unclear.
 */
export function getServiceCategoryGroup(
  input?: ServiceLike | string | null,
): ServiceCategoryGroup | null {
  if (!input) return null;

  if (typeof input === "string") {
    const trimmed = input.trim().toLowerCase();
    if (CONSULTATION_TYPES.has(trimmed) || CONSULTATION_CATEGORIES.has(trimmed)) {
      return "consultation";
    }
    if (LABORATORY_TYPES.has(trimmed) || LABORATORY_CATEGORIES.has(trimmed)) {
      return "laboratory";
    }
    if (trimmed.includes("consultation")) return "consultation";
    if (trimmed.includes("laboratory") || trimmed.includes("lab ")) return "laboratory";
    return null;
  }

  // 1. Check explicit service_type first
  if (input.service_type) {
    const type = input.service_type.trim().toLowerCase();
    if (CONSULTATION_TYPES.has(type)) return "consultation";
    if (LABORATORY_TYPES.has(type)) return "laboratory";
  }

  // 2. Check service_category / category
  const category = (input.service_category || input.category)?.trim().toLowerCase();
  if (category) {
    if (CONSULTATION_CATEGORIES.has(category)) return "consultation";
    if (LABORATORY_CATEGORIES.has(category)) return "laboratory";
    if (category.includes("consultation")) return "consultation";
    if (category.includes("laboratory") || category.includes("lab ")) return "laboratory";
  }

  // 3. Check room if available
  if (input.room) {
    const room = input.room.trim().toLowerCase();
    if (room.includes("consultation")) return "consultation";
    if (room.includes("laboratory") || room.includes("lab")) return "laboratory";
  }

  return null;
}

/**
 * Returns the matching Lucide icon component (Stethoscope or FlaskConical),
 * or null if unverified.
 */
export function getServiceCategoryIcon(
  input?: ServiceLike | string | null,
): React.ComponentType<LucideProps> | null {
  const group = getServiceCategoryGroup(input);
  if (!group) return null;
  return SERVICE_CATEGORY_ICONS[group] ?? null;
}

export interface ServiceCategoryIconProps extends LucideProps {
  service?: ServiceLike | null;
  category?: string | null;
  serviceType?: string | null;
  serviceId?: string | null;
  services?: ServiceLike[] | null;
  fallback?: React.ReactNode;
}

/**
 * Reusable component to render the appropriate category icon (Consultation or Laboratory)
 * for a service based on verified project category data.
 */
export function ServiceCategoryIcon({
  service,
  category,
  serviceType,
  serviceId,
  services,
  fallback = null,
  ...lucideProps
}: ServiceCategoryIconProps) {
  let resolvedService = service;

  if (!resolvedService && serviceId && services && services.length > 0) {
    resolvedService = services.find((s) => s.service_id === serviceId) ?? null;
  }

  const input =
    resolvedService ??
    (category || serviceType
      ? {
          service_id: serviceId ?? undefined,
          service_category: category,
          service_type: serviceType,
        }
      : serviceId
        ? serviceId
        : null);

  const Icon = getServiceCategoryIcon(input);

  if (!Icon) {
    return <>{fallback}</>;
  }

  return <Icon {...lucideProps} />;
}

export default ServiceCategoryIcon;
