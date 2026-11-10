export type LaboratoryRequestItem = {
  item_id: string;
  queue_id: string | null;
  status: string;
  processed_by: string | null;
  in_current_room: boolean;
  created_at: string;
  updated_at: string;
  service: {
    service_id: string;
    service_name: string;
    service_type: string;
    service_category: string | null;
    room: string;
  };
};

export type LaboratoryRequestDetail = {
  request: {
    request_id: string;
    consultation_record_id: string | null;
    requested_by: string;
    is_paid: boolean;
    is_priority: boolean;
    status: string;
    patient_id: string;
    first_name: string;
    last_name: string;
    middle_name: string | null;
    suffix: string | null;
    sex: string;
    email: string;
    contact_number: string;
    address: string;
    blood_type: string | null;
    birthdate: string;
    emergency_contact_name: string | null;
    emergency_contact: string | null;
    requested_at: string;
    updated_at: string;
  };
  items: LaboratoryRequestItem[];
};
