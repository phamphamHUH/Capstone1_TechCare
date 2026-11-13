import type { login } from "./post.dto.js";

export namespace getMyAccount {
  export interface response {
    accountType: login.accountType;
    user: login.account;
  }

  export interface error {
    message: string;
  }
}
