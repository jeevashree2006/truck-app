# Data Model (ER Diagram)

MongoDB is document-oriented; this ER diagram shows the logical entities and how they
reference each other. `loads` embed their `legs` (and each leg embeds its repeatable
`diesel` / `advance` money entries) for atomic reads/writes.

```mermaid
erDiagram
    USERS ||--o{ VEHICLES : owns
    USERS ||--o{ LOADS : owns
    USERS ||--o{ REPAIRS : owns
    USERS ||--o{ NOTIFICATIONS : receives
    VEHICLES ||--o{ LOADS : "runs"
    VEHICLES ||--o{ REPAIRS : "has"
    VEHICLES ||--|{ DOCUMENTS : "embeds"
    LOADS ||--|{ LEGS : "embeds"
    LEGS ||--o{ MONEY_ENTRY : "diesel + advance"

    USERS {
        ObjectId _id PK
        string name
        string email UK "unique sparse"
        string mobile UK "unique sparse"
        string language "en|ta|hi"
        string theme "light|dark|system"
        string[] push_tokens
        datetime created_at
    }

    VEHICLES {
        ObjectId _id PK
        string owner_id FK
        string registration_number
        string axle_type "single|multi"
        int length_feet
        string body_type "open|container|trailer|tanker|other"
        int age_years
        string chassis_number
        string make
        string model
        string status "empty|on_the_way|waiting_for_unload|maintenance"
        string active_load_id FK
        object documents "map<DocumentType, DocumentInfo>"
        datetime created_at
        datetime updated_at
    }

    DOCUMENTS {
        string type "ddc|rc|insurance|fitness|permit|national_permit|road_tax|puc"
        string number
        date issue_date
        date expiry_date
        string doc_url
    }

    LOADS {
        ObjectId _id PK
        string owner_id FK
        string vehicle_id FK
        string status "ongoing|completed|cancelled"
        date start_date
        date end_date
        string notes
        array legs "embedded LEGS[]"
        string accounts_image_url "kanakku sheet"
        float driver_balance
        datetime created_at
        datetime closed_at
    }

    LEGS {
        string loading_point
        string unloading_point
        float total_rent
        float commission
        float driver_salary
        float fastag
        array diesel "MONEY_ENTRY[]"
        array advance "MONEY_ENTRY[]"
    }

    MONEY_ENTRY {
        float amount
        string note
        date at
    }

    REPAIRS {
        ObjectId _id PK
        string owner_id FK
        string vehicle_id FK
        date date
        string description
        float amount
        string vendor
        int odometer_km
        datetime created_at
    }

    NOTIFICATIONS {
        ObjectId _id PK
        string owner_id FK
        string type "document_expiry|daily_summary|system"
        string title
        string body
        string vehicle_id FK
        bool read
        datetime created_at
    }

    OTPS {
        ObjectId _id PK
        string identifier "email or mobile"
        string code_hash "HMAC-SHA256"
        int attempts
        datetime expires_at "TTL index"
        datetime created_at
    }
```

## Derived / computed fields (not stored)

- **Document status** (`valid`/`expiring`/`expired`/`unknown`) + `days_to_expiry` + timeline `progress` — computed from `documents[*].expiry_date` vs a 30-day threshold.
- **Load totals** — `spend = diesel + commission + driver_salary + fastag`; `profit = total_rent − spend`; `expected_driver_balance = advance − (diesel + fastag)`.
- **Vehicle** `trips_count` + `total_profit` — aggregated from its completed loads.

## Indexes

| Collection | Index | Purpose |
|------------|-------|---------|
| users | `email` (unique, sparse), `mobile` (unique, sparse) | dual-identifier login |
| otps | `identifier`; `expires_at` (TTL) | lookup + auto-expiry |
| vehicles | `(owner_id, registration_number)`, `(owner_id, status)` | scoping + status filter |
| loads | `(owner_id, vehicle_id, created_at)`, `(owner_id, status)` | per-vehicle history + active loads |
| repairs | `(owner_id, vehicle_id, date)` | per-vehicle log |
| notifications | `(owner_id, created_at)` | feed |
```
