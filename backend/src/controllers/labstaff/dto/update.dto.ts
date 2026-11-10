export namespace acceptQueueEntry {
  export interface body {
    room?: string;
  }

  export interface response {
    message: string;
    queue: Record<string, unknown>;
  }

  export interface error {
    message: string;
  }
}

export namespace completeQueueEntry {
  export interface body {
    room?: string;
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

export namespace skipQueueEntry {
  export interface response {
    message: string;
    queue: Record<string, unknown>;
  }

  export interface error {
    message: string;
  }
}

export namespace cancelQueueEntry {
  export interface body {
    reason?: string;
  }

  export interface response {
    message: string;
    queue: Record<string, unknown>;
    reason: string;
    laboratory_items: Record<string, unknown>[];
  }

  export interface error {
    message: string;
  }
}

export namespace startLaboratoryAnalysis {
  export interface body {
    room?: string;
    item_ids?: string[];
  }

  export interface item {
    item_id: string;
    status: string;
    [key: string]: unknown;
  }

  export interface response {
    items: item[];
  }

  export interface error {
    message: string;
  }
}

export namespace releaseLaboratoryResult {
  export interface response {
    message: string;
    result: Record<string, unknown>;
  }

  export interface error {
    message: string;
  }
}
