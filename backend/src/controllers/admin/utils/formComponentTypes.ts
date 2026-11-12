import { sql } from "../../../config/db.js";

// Register the builder's field types in the same transaction as the template.
// Existing registry entries and their settings are preserved.
export function registerFormComponentTypes() {
  return sql`
    INSERT INTO form_component_types (type_id, type_name, data_type)
    VALUES
      ('text_field', 'Text Field', 'text'),
      ('number_field', 'Number Field', 'number'),
      ('checkbox', 'Checkbox', 'text'),
      ('date_field', 'Date Field', 'date'),
      ('table', 'Table', 'JSON'),
      ('section_header', 'Section Header', 'none'),
      ('static_text', 'Static Text', 'text'),
      ('line_divider', 'Divider', 'none'),
      ('image', 'Image', 'text')
    ON CONFLICT (type_id) DO NOTHING
  `;
}
