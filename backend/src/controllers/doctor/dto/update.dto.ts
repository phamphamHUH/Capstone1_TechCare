export namespace acceptConsultationQueue {
  export interface body {
    room: string;
  }

  export interface response {
    message: string;
    queue: Record<string, unknown>;
  }

  export interface error {
    message: string;
  }
}

export namespace completeConsultationQueueEntry {
  export interface body {
    room: string;
  }

  export interface response {
    message: string;
    queue: Record<string, unknown>;
    collected_item_count: number;
  }

  export interface error {
    message: string;
  }
}

export namespace cancelConsultationQueue {
  export interface body {
    room: string;
    reason: string;
  }

  export interface response {
    message: string;
    queue: Record<string, unknown>;
    consultations: Record<string, unknown>[];
  }

  export interface error {
    message: string;
  }
}

export namespace skipQueueEntry {
  export interface response {
    message: string;
    queue: Record<string, unknown>;
  }

  export interface error {
    message: string;
  }
}
