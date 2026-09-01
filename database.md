# Database Tables & Data: `raz_ai`

> Generated on: 8/29/2026, 3:17:18 PM

## Table: `audit_logs`

### Schema

| Column | Data Type | Nullable |
| --- | --- | --- |
| id | integer | NO |
| recovery_case_id | integer | NO |
| event_type | character varying | NO |
| message | text | NO |
| metadata | jsonb | NO |
| created_at | timestamp with time zone | NO |

### Data Preview (Showing 25 of 726 rows)

| id | recovery_case_id | event_type | message | metadata | created_at |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | case_created | Revenue risk case created. | {"case_type":"failed_payment","amount_at_risk":"50000.00"} | 2026-08-24T09:38:20.157Z |
| 2 | 1 | risk_detected | Revenue at risk detected from PostgreSQL. | {} | 2026-08-24T09:38:20.157Z |
| 3 | 1 | diagnosis_generated | The payment appears to have encountered a temporary processing failure. | {"diagnosis":"The payment appears to have encountered a temporary processing failure.","root_cause":"temporary_failure"} | 2026-08-24T09:38:25.152Z |
| 4 | 1 | intervention_recommended | A temporary processing issue can be retried. | {"reason":"A temporary processing issue can be retried.","recommended_action":"retry_payment"} | 2026-08-24T09:38:25.152Z |
| 5 | 1 | policy_approved | The action is within the configured recovery policy. | {"action":"retry_payment","reason":"The action is within the configured recovery policy.","allowed":true,"escalate":false} | 2026-08-24T09:38:32.989Z |
| 6 | 1 | recovery_action_executed | Simulated recovery action executed. | {"status":"failed","message":"Simulated recovery failed.","simulated":true} | 2026-08-24T09:38:32.989Z |
| 7 | 1 | recovery_failed | Simulated recovery failed. | {} | 2026-08-24T09:38:32.989Z |
| 8 | 1 | policy_approved | The action is within the configured recovery policy. | {"action":"retry_payment","reason":"The action is within the configured recovery policy.","allowed":true,"escalate":false} | 2026-08-24T09:38:33.032Z |
| 9 | 1 | recovery_action_executed | Simulated recovery action executed. | {"status":"failed","message":"Simulated recovery failed.","simulated":true} | 2026-08-24T09:38:33.032Z |
| 10 | 1 | recovery_failed | Simulated recovery failed. | {} | 2026-08-24T09:38:33.032Z |
| 11 | 1 | policy_approved | The action is within the configured recovery policy. | {"action":"retry_payment","reason":"The action is within the configured recovery policy.","allowed":true,"escalate":false} | 2026-08-24T09:38:33.040Z |
| 12 | 1 | recovery_action_executed | Simulated recovery action executed. | {"status":"failed","message":"Simulated recovery failed.","simulated":true} | 2026-08-24T09:38:33.040Z |
| 13 | 1 | recovery_failed | Simulated recovery failed. | {} | 2026-08-24T09:38:33.040Z |
| 14 | 1 | policy_rejected | Maximum payment retry limit reached. | {"action":"retry_payment","reason":"Maximum payment retry limit reached.","allowed":false,"escalate":true} | 2026-08-24T09:38:33.043Z |
| 15 | 1 | recovery_action_executed | Recovery action was blocked by policy. | {"status":"blocked","message":"Maximum payment retry limit reached.","simulated":true} | 2026-08-24T09:38:33.043Z |
| 16 | 1 | case_escalated | Maximum payment retry limit reached. | {} | 2026-08-24T09:38:33.043Z |
| 17 | 2 | case_created | Revenue risk case created. | {"case_type":"failed_payment","amount_at_risk":"499.00"} | 2026-08-24T09:39:55.503Z |
| 18 | 2 | risk_detected | Revenue at risk detected from PostgreSQL. | {} | 2026-08-24T09:39:55.503Z |
| 19 | 2 | diagnosis_generated | The stored payment method is invalid. | {"diagnosis":"The stored payment method is invalid.","root_cause":"invalid_payment_method"} | 2026-08-24T09:39:55.553Z |
| 20 | 2 | intervention_recommended | The stored payment method must be replaced. | {"reason":"The stored payment method must be replaced.","recommended_action":"request_payment_method_update"} | 2026-08-24T09:39:55.553Z |
| 21 | 2 | policy_approved | The action is within the configured recovery policy. | {"action":"request_payment_method_update","reason":"The action is within the configured recovery policy.","allowed":true,"escalate":false} | 2026-08-24T09:39:55.557Z |
| 22 | 2 | recovery_action_executed | Simulated recovery action executed. | {"status":"succeeded","message":"Simulated recovery succeeded.","simulated":true} | 2026-08-24T09:39:55.557Z |
| 23 | 2 | recovery_succeeded | Simulated recovery succeeded. | {} | 2026-08-24T09:39:55.557Z |
| 24 | 3 | case_created | Revenue risk case created. | {"case_type":"overdue_invoice","amount_at_risk":"499.00"} | 2026-08-24T09:39:55.560Z |
| 25 | 3 | risk_detected | Revenue at risk detected from PostgreSQL. | {} | 2026-08-24T09:39:55.560Z |

---

## Table: `checkout_events`

### Schema

| Column | Data Type | Nullable |
| --- | --- | --- |
| id | integer | NO |
| customer_id | integer | NO |
| session_id | character varying | NO |
| amount | numeric | NO |
| status | character varying | NO |
| abandonment_reason | character varying | YES |
| started_at | timestamp with time zone | NO |
| completed_at | timestamp with time zone | YES |
| updated_at | timestamp with time zone | NO |

### Data Preview (Showing 5 of 5 rows)

| id | customer_id | session_id | amount | status | abandonment_reason | started_at | completed_at | updated_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | test-session-1 | 1500.00 | abandoned | payment_friction | 2026-08-28T12:30:03.176Z | *NULL* | 2026-08-28T12:30:03.210Z |
| 2 | 1 | test_scenario_a_1787920453524 | 1999.00 | completed | *NULL* | 2026-08-28T12:34:13.656Z | 2026-08-28T12:34:13.680Z | 2026-08-28T12:34:13.680Z |
| 3 | 1 | test_scenario_b_1787920476859 | 4500.00 | abandoned | payment_friction | 2026-08-28T12:34:36.964Z | *NULL* | 2026-08-28T12:34:36.983Z |
| 4 | 1 | test_b_full_1787920751432 | 7500.00 | abandoned | price_concern | 2026-08-28T12:39:11.591Z | *NULL* | 2026-08-28T12:39:11.622Z |
| 5 | 1 | test_a_verify_1787920790455 | 2999.00 | completed | *NULL* | 2026-08-28T12:39:50.569Z | 2026-08-28T12:39:50.601Z | 2026-08-28T12:39:50.601Z |

---

## Table: `customers`

### Schema

| Column | Data Type | Nullable |
| --- | --- | --- |
| id | integer | NO |
| name | character varying | NO |
| email | character varying | NO |
| phone | character varying | NO |
| customer_type | character varying | NO |
| created_at | timestamp with time zone | NO |

### Data Preview (Showing 25 of 100 rows)

| id | name | email | phone | customer_type | created_at |
| --- | --- | --- | --- | --- | --- |
| 1 | Test Customer 1 | test.customer.1@example.test | +91-90000-00001 | business | 2026-08-24T09:36:15.771Z |
| 2 | Test Customer 2 | test.customer.2@example.test | +91-90000-00002 | enterprise | 2026-08-24T09:36:15.771Z |
| 3 | Test Customer 3 | test.customer.3@example.test | +91-90000-00003 | individual | 2026-08-24T09:36:15.771Z |
| 4 | Test Customer 4 | test.customer.4@example.test | +91-90000-00004 | business | 2026-08-24T09:36:15.771Z |
| 5 | Test Customer 5 | test.customer.5@example.test | +91-90000-00005 | enterprise | 2026-08-24T09:36:15.771Z |
| 6 | Test Customer 6 | test.customer.6@example.test | +91-90000-00006 | individual | 2026-08-24T09:36:15.771Z |
| 7 | Test Customer 7 | test.customer.7@example.test | +91-90000-00007 | business | 2026-08-24T09:36:15.771Z |
| 8 | Test Customer 8 | test.customer.8@example.test | +91-90000-00008 | enterprise | 2026-08-24T09:36:15.771Z |
| 9 | Test Customer 9 | test.customer.9@example.test | +91-90000-00009 | individual | 2026-08-24T09:36:15.771Z |
| 10 | Test Customer 10 | test.customer.10@example.test | +91-90000-00010 | business | 2026-08-24T09:36:15.771Z |
| 11 | Test Customer 11 | test.customer.11@example.test | +91-90000-00011 | enterprise | 2026-08-24T09:36:15.771Z |
| 12 | Test Customer 12 | test.customer.12@example.test | +91-90000-00012 | individual | 2026-08-24T09:36:15.771Z |
| 13 | Test Customer 13 | test.customer.13@example.test | +91-90000-00013 | business | 2026-08-24T09:36:15.771Z |
| 14 | Test Customer 14 | test.customer.14@example.test | +91-90000-00014 | enterprise | 2026-08-24T09:36:15.771Z |
| 15 | Test Customer 15 | test.customer.15@example.test | +91-90000-00015 | individual | 2026-08-24T09:36:15.771Z |
| 16 | Test Customer 16 | test.customer.16@example.test | +91-90000-00016 | business | 2026-08-24T09:36:15.771Z |
| 17 | Test Customer 17 | test.customer.17@example.test | +91-90000-00017 | enterprise | 2026-08-24T09:36:15.771Z |
| 18 | Test Customer 18 | test.customer.18@example.test | +91-90000-00018 | individual | 2026-08-24T09:36:15.771Z |
| 19 | Test Customer 19 | test.customer.19@example.test | +91-90000-00019 | business | 2026-08-24T09:36:15.771Z |
| 20 | Test Customer 20 | test.customer.20@example.test | +91-90000-00020 | enterprise | 2026-08-24T09:36:15.771Z |
| 21 | Test Customer 21 | test.customer.21@example.test | +91-90000-00021 | individual | 2026-08-24T09:36:15.771Z |
| 22 | Test Customer 22 | test.customer.22@example.test | +91-90000-00022 | business | 2026-08-24T09:36:15.771Z |
| 23 | Test Customer 23 | test.customer.23@example.test | +91-90000-00023 | enterprise | 2026-08-24T09:36:15.771Z |
| 24 | Test Customer 24 | test.customer.24@example.test | +91-90000-00024 | individual | 2026-08-24T09:36:15.771Z |
| 25 | Test Customer 25 | test.customer.25@example.test | +91-90000-00025 | business | 2026-08-24T09:36:15.771Z |

---

## Table: `invoices`

### Schema

| Column | Data Type | Nullable |
| --- | --- | --- |
| id | integer | NO |
| customer_id | integer | NO |
| amount | numeric | NO |
| due_date | date | NO |
| status | character varying | NO |
| created_at | timestamp with time zone | NO |
| issue_date | date | YES |
| updated_at | timestamp with time zone | YES |

### Data Preview (Showing 25 of 102 rows)

| id | customer_id | amount | due_date | status | created_at | issue_date | updated_at |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 9999.00 | 2026-08-22T18:30:00.000Z | paid | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 2 | 2 | 25000.00 | 2026-08-21T18:30:00.000Z | paid | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 4 | 4 | 499.00 | 2026-08-18T18:30:00.000Z | overdue | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 5 | 5 | 999.00 | 2026-08-18T18:30:00.000Z | paid | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 6 | 6 | 1499.00 | 2026-08-17T18:30:00.000Z | paid | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 7 | 7 | 2499.00 | 2026-08-16T18:30:00.000Z | paid | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 8 | 8 | 4999.00 | 2026-09-01T18:30:00.000Z | pending | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 9 | 9 | 9999.00 | 2026-08-13T18:30:00.000Z | overdue | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 10 | 10 | 25000.00 | 2026-08-13T18:30:00.000Z | paid | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 11 | 11 | 50000.00 | 2026-08-12T18:30:00.000Z | paid | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 12 | 12 | 499.00 | 2026-08-11T18:30:00.000Z | paid | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 13 | 13 | 999.00 | 2026-09-06T18:30:00.000Z | pending | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 14 | 14 | 1499.00 | 2026-08-08T18:30:00.000Z | overdue | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 15 | 15 | 2499.00 | 2026-08-23T18:30:00.000Z | paid | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 16 | 16 | 4999.00 | 2026-08-22T18:30:00.000Z | paid | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 17 | 17 | 9999.00 | 2026-08-21T18:30:00.000Z | paid | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 18 | 18 | 25000.00 | 2026-09-11T18:30:00.000Z | pending | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 19 | 19 | 50000.00 | 2026-08-03T18:30:00.000Z | overdue | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 20 | 20 | 499.00 | 2026-08-18T18:30:00.000Z | paid | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 21 | 21 | 999.00 | 2026-08-17T18:30:00.000Z | paid | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 22 | 22 | 1499.00 | 2026-08-16T18:30:00.000Z | paid | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 24 | 24 | 4999.00 | 2026-07-29T18:30:00.000Z | overdue | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 25 | 25 | 9999.00 | 2026-08-13T18:30:00.000Z | paid | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 26 | 26 | 25000.00 | 2026-08-12T18:30:00.000Z | paid | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |
| 27 | 27 | 50000.00 | 2026-08-11T18:30:00.000Z | paid | 2026-08-24T09:36:15.771Z | 2026-08-27T18:30:00.000Z | 2026-08-28T12:50:49.852Z |

---

## Table: `recovery_cases`

### Schema

| Column | Data Type | Nullable |
| --- | --- | --- |
| id | integer | NO |
| customer_id | integer | NO |
| transaction_id | integer | YES |
| invoice_id | integer | YES |
| amount_at_risk | numeric | NO |
| case_type | character varying | NO |
| status | character varying | NO |
| diagnosis_code | character varying | YES |
| diagnosis | text | YES |
| recommended_action | character varying | YES |
| policy_allowed | boolean | YES |
| policy_reason | text | YES |
| retry_count | integer | NO |
| reminder_count | integer | NO |
| amount_recovered | numeric | NO |
| last_action | character varying | YES |
| last_action_status | character varying | YES |
| created_at | timestamp with time zone | NO |
| updated_at | timestamp with time zone | NO |
| risk_level | character varying | YES |
| ai_analysis | jsonb | YES |
| checkout_event_id | integer | YES |

### Data Preview (Showing 25 of 25 rows)

| id | customer_id | transaction_id | invoice_id | amount_at_risk | case_type | status | diagnosis_code | diagnosis | recommended_action | policy_allowed | policy_reason | retry_count | reminder_count | amount_recovered | last_action | last_action_status | created_at | updated_at | risk_level | ai_analysis | checkout_event_id |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 11 | 36 | 36 | *NULL* | 25000.00 | failed_payment | open | insufficient_funds | Analysis based on insufficient_funds, 3 previous failed payments, and 0 recorded retries. | retry_payment_later | true | The action is within the configured recovery policy. | 0 | 0 | 0.00 | *NULL* | *NULL* | 2026-08-24T11:15:31.327Z | 2026-08-24T11:15:31.866Z | high | {"reason":"Analysis based on insufficient_funds, 3 previous failed payments, and 0 recorded retries.","risk_level":"high","root_cause":"insufficient_funds","recommended_action":"retry_payment_later"} | *NULL* |
| 13 | 16 | 16 | *NULL* | 1499.00 | failed_payment | recovered | insufficient_funds | Analysis based on insufficient_funds, 3 previous failed payments, and 0 recorded retries. | retry_payment_later | true | The action is within the configured recovery policy. | 0 | 0 | 1499.00 | retry_payment_later | succeeded | 2026-08-24T11:19:43.522Z | 2026-08-25T10:25:14.537Z | high | {"reason":"Analysis based on insufficient_funds, 3 previous failed payments, and 0 recorded retries.","risk_level":"high","root_cause":"insufficient_funds","recommended_action":"retry_payment_later"} | *NULL* |
| 2 | 14 | 14 | *NULL* | 499.00 | failed_payment | recovered | invalid_payment_method | The stored payment method is invalid. | request_payment_method_update | true | The action is within the configured recovery policy. | 0 | 0 | 499.00 | request_payment_method_update | succeeded | 2026-08-24T09:39:55.503Z | 2026-08-24T09:39:55.557Z | *NULL* | *NULL* | *NULL* |
| 3 | 4 | *NULL* | 4 | 499.00 | overdue_invoice | recovered | overdue_invoice | The invoice has passed its due date and payment has not been received. | send_payment_reminder | true | The action is within the configured recovery policy. | 0 | 1 | 499.00 | send_payment_reminder | succeeded | 2026-08-24T09:39:55.560Z | 2026-08-24T09:39:55.569Z | *NULL* | *NULL* | *NULL* |
| 4 | 15 | 15 | *NULL* | 999.00 | failed_payment | recovered | expired_card | Analysis based on expired_card, 3 previous failed payments, and 0 recorded retries. | request_payment_method_update | true | The action is within the configured recovery policy. | 0 | 0 | 999.00 | request_payment_method_update | succeeded | 2026-08-24T09:57:05.617Z | 2026-08-24T09:58:00.218Z | high | {"reason":"Analysis based on expired_card, 3 previous failed payments, and 0 recorded retries.","risk_level":"high","root_cause":"expired_card","recommended_action":"request_payment_method_update"} | *NULL* |
| 6 | 14 | 14 | *NULL* | 499.00 | failed_payment | recovered | invalid_payment_method | The stored payment method is invalid. | request_payment_method_update | true | The action is within the configured recovery policy. | 0 | 0 | 499.00 | request_payment_method_update | succeeded | 2026-08-24T10:21:50.969Z | 2026-08-24T10:21:57.840Z | *NULL* | *NULL* | *NULL* |
| 8 | 15 | 15 | *NULL* | 999.00 | failed_payment | recovered | expired_card | The payment failed due to an expired card, with three prior failed attempts and no retries recorded. The card is no longer valid, so the transaction cannot succeed until a new payment method is provided. | request_payment_method_update | true | The action is within the configured recovery policy. | 0 | 0 | 999.00 | request_payment_method_update | succeeded | 2026-08-24T10:31:52.209Z | 2026-08-25T10:43:41.085Z | high | {"reason":"The payment failed due to an expired card, with three prior failed attempts and no retries recorded. The card is no longer valid, so the transaction cannot succeed until a new payment method is provided.","strategy":"Send a secure email or in-app notification to the customer requesting an updated payment method. Offer assistance via customer support if needed. Once a new method is received, reattempt the payment manually or through the payment gateway, ensuring compliance with PCI requirements.","risk_level":"high","root_cause":"expired_card","safe_to_retry":false,"recommended_action":"request_payment_method_update","escalation_required":false} | *NULL* |
| 10 | 33 | 33 | *NULL* | 2499.00 | failed_payment | failed | temporary_failure | Analysis based on temporary_failure, 3 previous failed payments, and 0 recorded retries. | retry_payment | true | The action is within the configured recovery policy. | 1 | 0 | 0.00 | retry_payment | failed | 2026-08-24T11:12:32.348Z | 2026-08-24T11:13:03.098Z | high | {"reason":"Analysis based on temporary_failure, 3 previous failed payments, and 0 recorded retries.","risk_level":"high","root_cause":"temporary_failure","recommended_action":"retry_payment"} | *NULL* |
| 9 | 17 | 17 | *NULL* | 2499.00 | failed_payment | recovered | bank_declined | Analysis based on bank_declined, 3 previous failed payments, and 0 recorded retries. | request_payment_method_update | true | The action is within the configured recovery policy. | 0 | 0 | 2499.00 | request_payment_method_update | succeeded | 2026-08-24T10:55:25.271Z | 2026-08-24T11:13:06.486Z | high | {"reason":"Analysis based on bank_declined, 3 previous failed payments, and 0 recorded retries.","risk_level":"high","root_cause":"bank_declined","recommended_action":"request_payment_method_update"} | *NULL* |
| 5 | 17 | 17 | *NULL* | 2499.00 | failed_payment | recovered | bank_declined | Analysis based on bank_declined, 3 previous failed payments, and 0 recorded retries. | request_payment_method_update | true | The action is within the configured recovery policy. | 0 | 0 | 7497.00 | request_payment_method_update | succeeded | 2026-08-24T09:58:40.046Z | 2026-08-25T10:20:52.818Z | high | {"reason":"Analysis based on bank_declined, 3 previous failed payments, and 0 recorded retries.","risk_level":"high","root_cause":"bank_declined","recommended_action":"request_payment_method_update"} | *NULL* |
| 1 | 13 | 13 | *NULL* | 50000.00 | failed_payment | escalated | temporary_failure | Temporary failure after 3 retries, retry limit reached. | retry_payment | false | Maximum payment retry limit reached. | 3 | 0 | 0.00 | retry_payment | blocked | 2026-08-24T09:38:20.157Z | 2026-08-28T12:59:49.223Z | high | {"reason":"Temporary failure after 3 retries, retry limit reached.","strategy":"retry_payment","confidence":0.85,"risk_level":"high","root_cause":"temporary_failure","safe_to_retry":true,"recommended_action":"retry_payment","escalation_required":false} | *NULL* |
| 12 | 54 | 54 | *NULL* | 499.00 | failed_payment | open | invalid_payment_method | Analysis based on invalid_payment_method, 3 previous failed payments, and 0 recorded retries. | request_payment_method_update | true | The action is within the configured recovery policy. | 0 | 0 | 0.00 | *NULL* | *NULL* | 2026-08-24T11:15:41.685Z | 2026-08-24T11:15:42.102Z | high | {"reason":"Analysis based on invalid_payment_method, 3 previous failed payments, and 0 recorded retries.","risk_level":"high","root_cause":"invalid_payment_method","recommended_action":"request_payment_method_update"} | *NULL* |
| 14 | 16 | 16 | *NULL* | 1499.00 | failed_payment | recovered | *NULL* | *NULL* | *NULL* | true | The action is within the configured recovery policy. | 0 | 0 | 1499.00 | retry_payment_later | succeeded | 2026-08-25T10:43:41.122Z | 2026-08-25T10:43:42.147Z | *NULL* | *NULL* | *NULL* |
| 15 | 17 | 17 | *NULL* | 2499.00 | failed_payment | recovered | *NULL* | *NULL* | *NULL* | true | The action is within the configured recovery policy. | 0 | 0 | 2499.00 | request_payment_method_update | succeeded | 2026-08-25T10:43:42.182Z | 2026-08-25T10:43:43.178Z | *NULL* | *NULL* | *NULL* |
| 7 | 14 | 14 | *NULL* | 499.00 | failed_payment | recovered | invalid_payment_method | Payment method is invalid, with 3 prior failed attempts and no retries recorded, indicating a persistent issue that cannot be resolved by a simple retry. | request_payment_method_update | true | The action is within the configured recovery policy. | 0 | 0 | 499.00 | request_payment_method_update | succeeded | 2026-08-24T10:24:50.378Z | 2026-08-25T10:43:44.776Z | high | {"reason":"Payment method is invalid, with 3 prior failed attempts and no retries recorded, indicating a persistent issue that cannot be resolved by a simple retry.","strategy":"Contact the customer to update their payment method, verify the new method’s validity, and then attempt the payment once the update is confirmed. No immediate retry should be performed until the method is updated.","risk_level":"high","root_cause":"invalid_payment_method","safe_to_retry":false,"recommended_action":"request_payment_method_update","escalation_required":false} | *NULL* |
| 22 | 1 | *NULL* | *NULL* | 4500.00 | checkout_abandonment | open | *NULL* | *NULL* | *NULL* | *NULL* | *NULL* | 0 | 0 | 0.00 | *NULL* | *NULL* | 2026-08-28T12:38:41.841Z | 2026-08-28T12:38:41.841Z | *NULL* | *NULL* | 3 |
| 16 | 15 | 15 | *NULL* | 999.00 | failed_payment | recovered | expired_card | The payment failed because the card has expired. | request_payment_method_update | true | The action is within the configured recovery policy. | 0 | 0 | 999.00 | request_payment_method_update | succeeded | 2026-08-25T10:44:06.909Z | 2026-08-25T10:47:02.550Z | high | {"reason":"The payment failed because the card has expired.","strategy":"request_payment_method_update","confidence":0.9,"risk_level":"high","root_cause":"expired_card","safe_to_retry":false,"recommended_action":"request_payment_method_update","escalation_required":false} | *NULL* |
| 17 | 16 | 16 | *NULL* | 1499.00 | failed_payment | recovered | insufficient_funds | Insufficient funds on the payment method with multiple failed attempts | request_payment_method_update | true | The action is within the configured recovery policy. | 0 | 0 | 1499.00 | request_payment_method_update | succeeded | 2026-08-25T10:44:07.814Z | 2026-08-25T10:47:03.339Z | high | {"reason":"Insufficient funds on the payment method with multiple failed attempts","strategy":"request_payment_method_update","confidence":0.9,"risk_level":"high","root_cause":"insufficient_funds","safe_to_retry":true,"recommended_action":"request_payment_method_update","escalation_required":false} | *NULL* |
| 18 | 17 | 17 | *NULL* | 2499.00 | failed_payment | failed | bank_declined | Bank declined the transaction. | retry_payment | true | The action is within the configured recovery policy. | 1 | 0 | 0.00 | retry_payment | failed | 2026-08-25T10:44:08.939Z | 2026-08-25T10:47:03.747Z | high | {"reason":"Bank declined the transaction.","strategy":"retry_payment","confidence":0.9,"risk_level":"high","root_cause":"bank_declined","safe_to_retry":false,"recommended_action":"retry_payment","escalation_required":false} | *NULL* |
| 19 | 14 | 14 | *NULL* | 499.00 | failed_payment | recovered | invalid_payment_method | The payment failed due to an invalid payment method, and the customer has multiple prior failures, indicating a high risk of non-payment. | request_payment_method_update | true | The action is within the configured recovery policy. | 0 | 0 | 499.00 | request_payment_method_update | succeeded | 2026-08-25T10:44:13.517Z | 2026-08-25T10:47:04.997Z | high | {"reason":"The payment failed due to an invalid payment method, and the customer has multiple prior failures, indicating a high risk of non-payment.","strategy":"request_payment_method_update","confidence":0.9,"risk_level":"high","root_cause":"invalid_payment_method","safe_to_retry":false,"recommended_action":"request_payment_method_update","escalation_required":false} | *NULL* |
| 23 | 1 | *NULL* | *NULL* | 7500.00 | checkout_abandonment | recovered | price_concern | Customer abandoned checkout due to price concern | send_checkout_recovery | true | The action is within the configured recovery policy. | 0 | 1 | 7500.00 | send_checkout_recovery | succeeded | 2026-08-28T12:39:11.653Z | 2026-08-28T12:39:12.899Z | high | {"reason":"Customer abandoned checkout due to price concern","strategy":"send_checkout_recovery","confidence":0.85,"risk_level":"high","root_cause":"price_concern","safe_to_retry":false,"recommended_action":"send_checkout_recovery","escalation_required":false} | 4 |
| 27 | 79 | *NULL* | 79 | 2499.00 | overdue_invoice | open | overdue_invoice | Invoice overdue by 39 days, high risk of non-payment | send_invoice_notification | false | High-value or extremely overdue revenue requires human approval. | 0 | 0 | 0.00 | *NULL* | *NULL* | 2026-08-28T16:15:09.522Z | 2026-08-28T16:15:10.944Z | high | {"reason":"Invoice overdue by 39 days, high risk of non-payment","strategy":"send_invoice_notification","confidence":0.9,"risk_level":"high","root_cause":"overdue_invoice","safe_to_retry":false,"recommended_action":"send_invoice_notification","escalation_required":true} | *NULL* |
| 24 | 14 | 14 | *NULL* | 499.00 | failed_payment | recovered | invalid_payment_method | The payment failed due to an invalid payment method, and the customer has multiple prior failures, indicating a high risk of non-payment. | request_payment_method_update | true | The action is within the configured recovery policy. | 0 | 0 | 499.00 | request_payment_method_update | succeeded | 2026-08-28T12:40:50.088Z | 2026-08-28T12:40:51.112Z | high | {"reason":"The payment failed due to an invalid payment method, and the customer has multiple prior failures, indicating a high risk of non-payment.","strategy":"request_payment_method_update","confidence":0.9,"risk_level":"high","root_cause":"invalid_payment_method","safe_to_retry":false,"recommended_action":"request_payment_method_update","escalation_required":false} | *NULL* |
| 25 | 1 | *NULL* | 102 | 150000.00 | overdue_invoice | recovered | overdue_invoice | Invoice overdue by 15 days with a high amount at risk | send_invoice_notification | true | The action is within the configured recovery policy. | 0 | 1 | 150000.00 | send_invoice_notification | succeeded | 2026-08-28T12:56:39.242Z | 2026-08-28T12:56:40.327Z | high | {"reason":"Invoice overdue by 15 days with a high amount at risk","strategy":"send_invoice_notification","confidence":0.85,"risk_level":"high","root_cause":"overdue_invoice","safe_to_retry":false,"recommended_action":"send_invoice_notification","escalation_required":false} | *NULL* |
| 26 | 1 | *NULL* | 102 | 150000.00 | overdue_invoice | open | overdue_invoice | Invoice overdue by 15 days with high amount | send_invoice_notification | true | The action is within the configured recovery policy. | 0 | 0 | 0.00 | *NULL* | *NULL* | 2026-08-28T16:13:36.339Z | 2026-08-28T16:13:37.868Z | high | {"reason":"Invoice overdue by 15 days with high amount","strategy":"send_invoice_notification","confidence":0.85,"risk_level":"high","root_cause":"overdue_invoice","safe_to_retry":false,"recommended_action":"send_invoice_notification","escalation_required":false} | *NULL* |

---

## Table: `transactions`

### Schema

| Column | Data Type | Nullable |
| --- | --- | --- |
| id | integer | NO |
| customer_id | integer | NO |
| amount | numeric | NO |
| status | character varying | NO |
| failure_reason | character varying | YES |
| transaction_type | character varying | NO |
| created_at | timestamp with time zone | NO |

### Data Preview (Showing 25 of 300 rows)

| id | customer_id | amount | status | failure_reason | transaction_type | created_at |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 2499.00 | success | *NULL* | renewal | 2026-08-24T09:36:15.771Z |
| 2 | 2 | 4999.00 | success | *NULL* | subscription | 2026-08-24T09:36:15.771Z |
| 3 | 3 | 9999.00 | success | *NULL* | one_time | 2026-08-24T09:36:15.771Z |
| 4 | 4 | 25000.00 | success | *NULL* | renewal | 2026-08-24T09:36:15.771Z |
| 5 | 5 | 50000.00 | success | *NULL* | subscription | 2026-08-24T09:36:15.771Z |
| 6 | 6 | 499.00 | success | *NULL* | one_time | 2026-08-24T09:36:15.771Z |
| 7 | 7 | 999.00 | success | *NULL* | renewal | 2026-08-24T09:36:15.771Z |
| 8 | 8 | 1499.00 | success | *NULL* | subscription | 2026-08-24T09:36:15.771Z |
| 9 | 9 | 2499.00 | success | *NULL* | one_time | 2026-08-24T09:36:15.771Z |
| 10 | 10 | 4999.00 | success | *NULL* | renewal | 2026-08-24T09:36:15.771Z |
| 11 | 11 | 9999.00 | success | *NULL* | subscription | 2026-08-24T09:36:15.771Z |
| 12 | 12 | 25000.00 | success | *NULL* | one_time | 2026-08-24T09:36:15.771Z |
| 13 | 13 | 50000.00 | failed | temporary_failure | renewal | 2026-08-24T09:36:15.771Z |
| 14 | 14 | 499.00 | failed | invalid_payment_method | subscription | 2026-08-24T09:36:15.771Z |
| 15 | 15 | 999.00 | failed | expired_card | one_time | 2026-08-24T09:36:15.771Z |
| 16 | 16 | 1499.00 | failed | insufficient_funds | renewal | 2026-08-24T09:36:15.771Z |
| 17 | 17 | 2499.00 | failed | bank_declined | subscription | 2026-08-24T09:36:15.771Z |
| 18 | 18 | 4999.00 | pending | *NULL* | one_time | 2026-08-24T09:36:15.771Z |
| 19 | 19 | 9999.00 | pending | *NULL* | renewal | 2026-08-24T09:36:15.771Z |
| 20 | 20 | 25000.00 | pending | *NULL* | subscription | 2026-08-24T09:36:15.771Z |
| 21 | 21 | 50000.00 | success | *NULL* | one_time | 2026-08-24T09:36:15.771Z |
| 22 | 22 | 499.00 | success | *NULL* | renewal | 2026-08-24T09:36:15.771Z |
| 23 | 23 | 999.00 | success | *NULL* | subscription | 2026-08-24T09:36:15.771Z |
| 24 | 24 | 1499.00 | success | *NULL* | one_time | 2026-08-24T09:36:15.771Z |
| 25 | 25 | 2499.00 | success | *NULL* | renewal | 2026-08-24T09:36:15.771Z |

---

