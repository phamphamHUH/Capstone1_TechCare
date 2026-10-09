export interface UnpaidRequests {
  record_type: "laboratory";
  lab_item_id: string;
  request_id: string;
  patient_id: string;
  patient_name: string;
  service_id: string;
  service_name: string;
  is_paid: boolean;
  created_by: string;
  created_at: string;
}
