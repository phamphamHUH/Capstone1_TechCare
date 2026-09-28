export interface FormTemplate {
    form_id: string;
    form_name: string;
    form_description?: string;
    service_id: string;
    status: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    components: BuilderComponent[];
}

export type ComponentType =
  | "text_field"
  | "number_field"
  | "checkbox"
  | "date_field"
  | "table"
  | "section_header"
  | "static_text"
  | "line_divider"
  | "image";

export type FieldWidth = "1/4" | "1/3" | "1/2" | "FULL";
export type TextAlignment = "left" | "center" | "right";
export type TemplateStatus = "Draft" | "Published" | "Archived";

export interface ValidationRules {
  required?: boolean;
  inputType?: string;
  minValue?: number | string;
  maxValue?: number | string;
  decimalPlaces?: number | string;
  minLength?: number | string;
  maxLength?: number | string;
  allowedPattern?: string;
  earliestDate?: string;
  latestDate?: string;
  minSelections?: number | string;
  maxSelections?: number | string;
  refLow?: number | string;
  refNormal?: number | string;
  refHigh?: number | string;
  flagLabels?: {
    low?: string;
    normal?: string;
    high?: string;
  };
  customMessage?: string;
  tableRules?: {
    minRows?: number | string;
    maxRows?: number | string;
    requiredColumns?: string[];
  };
}

export interface TableColumn {
  id: string;
  header: string;
  type: "text" | "number" | "date";
  width?: string;
}

export interface ComponentSettings {
  placeholder?: string;
  defaultValue?: string;
  unit?: string;
  referenceRange?: string;
  required?: boolean;
  showInPreview?: boolean;
  width?: FieldWidth;
  alignment?: TextAlignment;
  inputStyle?: string;
  checkboxOptions?: string[];
  staticText?: string;
  sectionHeader?: string;
  dividerStyle?: "solid" | "dashed" | "dotted";
  tableColumns?: TableColumn[];
  imageUrl?: string;
  imageAlt?: string;
  numberFormat?: string;
}

export interface BuilderComponent {
  id: string;
  type: ComponentType;
  label: string;
  fieldKey: string;
  order: number;
  settings: ComponentSettings;
  validation: ValidationRules;
}

export function dbComponentToBuilderComponent(row: any): BuilderComponent {
  return {
    id: row.form_component_id,
    type: row.type_id as ComponentType,
    label: row.label,
    fieldKey: row.field_key,
    order: row.display_order,
    settings: row.settings ?? {},
    validation: row.validation ?? {},
  };
}