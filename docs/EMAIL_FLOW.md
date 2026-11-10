# Email Flow Diagrams

Diagrams of how TechCare sends emails. For the full written guide, see [EMAIL.md](EMAIL.md).

## 1. Overview: how every email is sent

```mermaid
flowchart TD
    A["Trigger<br/>(add user, add patient, change email,<br/>resend, forgot password)"] --> B{"Which helper?"}

    B -->|Employee confirmation| C["sendUserVerificationEmail(userId)"]
    B -->|Patient verification| D["sendPatientVerificationEmail(patientId)"]
    B -->|Password reset| E["forgotPassword controller"]
    B -->|Any other patient email| F["sendEmailToPatient(patientId, createEmail)"]

    C --> T["createToken()<br/>raw token + SHA-256 hash"]
    D --> T
    E --> T
    T --> DB[("Save hash + expiry in DB<br/>users / patients")]
    DB --> TPL["Build email from<br/>emailTemplates.ts<br/>(link has raw token)"]

    F --> V{"Patient<br/>is_verified?"}
    V -->|No| SKIP["Skip: return false<br/>(no email sent)"]
    V -->|Yes| TPL2["Build email with createEmail()"]

    TPL --> S["sendEmail()"]
    TPL2 --> S

    S --> K{"BREVO_API_KEY and<br/>EMAIL_FROM set?"}
    K -->|No, local dev| LOG["Print To / Subject / Link<br/>to backend console"]
    K -->|Yes| API["POST https://api.brevo.com/v3/smtp/email"]
    API --> OK{"Response ok?"}
    OK -->|Yes| SENT["Email delivered<br/>return true"]
    OK -->|No / network error| ERR["Log SEND EMAIL ERROR<br/>return false<br/>(staff press Resend)"]
```

## 2. Email verification (employees and patients)

```mermaid
sequenceDiagram
    actor Staff as Admin / Front desk
    participant API as Backend
    participant DB as Neon Postgres
    participant Brevo
    actor Person as Employee / Patient
    participant FE as Frontend /verify-email

    Staff->>API: Add user (admin) or add patient (front desk)
    API->>DB: INSERT with is_verified = FALSE
    API->>API: createToken()
    API->>DB: Save verify_token hash, expires in 48h
    API->>Brevo: sendEmail (confirmation link)
    Brevo-->>Person: Email with /verify-email?token=...

    Person->>FE: Open link, press Confirm
    FE->>API: POST /api/auth/verify-email { token }
    API->>API: hashToken(token)
    API->>DB: Find matching, unexpired verify_token
    alt Valid
        API->>DB: is_verified = TRUE, clear token
        API-->>FE: Success
        Note over Person: Employee can now log in.<br/>Patient banner disappears and<br/>clinic emails are allowed.
    else Invalid, used, or expired
        API-->>FE: "This link is invalid, already used, or expired"
        Note over Staff,Person: Press Resend to get a new link
    end
```

## 3. Employee login before verification

```mermaid
flowchart LR
    L["POST /api/auth/login"] --> U{"Employee<br/>is_verified?"}
    U -->|No| R["403: Please confirm your email first"]
    U -->|Yes| OK["Login continues normally"]
    P["Patient login"] --> PO["Always allowed<br/>(portal shows verify banner)"]
```

## 4. Forgot password (employees only)

```mermaid
sequenceDiagram
    actor Emp as Employee
    participant FE as Frontend
    participant API as Backend
    participant DB as Neon Postgres
    participant Brevo

    Emp->>FE: Login page, "Forgot password?"
    FE->>API: POST /api/auth/forgot-password { email }
    API->>DB: Find active, verified employee
    alt Found
        API->>API: createToken()
        API->>DB: Save reset_token hash, expires in 30 min
        API->>Brevo: sendEmail (reset link)
        Brevo-->>Emp: Email with /reset-password?token=...
    else Not found / patient / unverified
        Note over API: Send nothing
    end
    API-->>FE: Same generic message either way

    Emp->>FE: Open link, enter new password (min 8 chars)
    FE->>API: POST /api/auth/reset-password { token, password }
    API->>DB: Match hash, check expiry
    API->>DB: Update password, clear reset_token (single use)
    API-->>FE: Success, go to login
```

## 5. Front desk changes a patient's email

```mermaid
flowchart TD
    A["updatePatient with new email"] --> B{"Patient already<br/>verified?"}
    B -->|Yes| C["Keep current email<br/>Store new one in pending_email"]
    B -->|No| D["Replace email directly"]
    C --> E["sendPatientVerificationEmail()<br/>sends to pending_email"]
    D --> F["sendPatientVerificationEmail()<br/>sends to new email"]
    E --> G{"Patient clicks link?"}
    G -->|Yes| H["email = pending_email<br/>pending_email cleared"]
    G -->|Not yet| I["Clinic emails still go<br/>to the old address"]
    F --> J{"Patient clicks link?"}
    J -->|Yes| K["is_verified = TRUE"]
    J -->|Not yet| L["Patient gets no clinic emails"]
```

## 6. Who can trigger an email

```mermaid
flowchart LR
    subgraph Admin
        A1["Add employee"]
        A2["Resend confirmation<br/>POST /api/admin/users/:user_id/verification-email"]
    end
    subgraph FrontDesk["Front desk"]
        F1["Register patient"]
        F2["Change patient email"]
        F3["Resend verification<br/>POST /api/fdstaff/patients/:patient_id/verification-email"]
    end
    subgraph Patient
        P1["Banner: Send verification link<br/>POST /api/patient/verification-email"]
    end
    subgraph Public
        X1["Forgot password<br/>POST /api/auth/forgot-password"]
    end

    A1 --> UV["sendUserVerificationEmail"]
    A2 --> UV
    F1 --> PV["sendPatientVerificationEmail"]
    F2 --> PV
    F3 --> PV
    P1 --> PV
    X1 --> RS["Reset email"]

    UV --> SE["sendEmail -> Brevo"]
    PV --> SE
    RS --> SE
```
