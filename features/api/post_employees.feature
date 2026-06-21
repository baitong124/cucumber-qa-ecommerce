@api @employees @post
Feature: POST /api/v1/employees - create employee
  As an API consumer
  I want employee creation to succeed with valid data and fail clearly with invalid data
  So that data integrity and input validation are guaranteed

  # Contract VERIFIED live (camelCase fields, @NotBlank + @Size(3,30), @Email, optional dob).
  # POST 201 returns an EMPTY body, so creation is verified via GET list, not an echo.

  # ---- Requested cases ----

  @positive @smoke
  Scenario: API-P01 Create an employee with valid data returns 201
    When I create an employee with valid data
    Then the response status should be 201
    And the response body should be empty

  @negative @validation
  Scenario: API-P02 Invalid email format returns 400 with the email validation message
    When I create an employee with email "plainaddress"
    Then the response status should be 400
    And the validation error for field "email" should have the invalid-email message

  # ---- Required-field validation (mandatory messages, verified) ----

  @negative @validation
  Scenario Outline: API-P03/P04/P05 Missing a required field returns 400
    When I create an employee missing the "<field>" field
    Then the response status should be 400
    And the validation error for field "<field>" should have the mandatory message

    Examples:
      | field     |
      | firstName |
      | lastName  |
      | email     |

  @negative @validation
  Scenario: API-P06 Multiple invalid fields are all reported
    When I create an employee with all fields blank
    Then the response status should be 400
    And the validation errors should include fields "firstName, lastName, email"

  @negative @validation
  Scenario Outline: API-P07 Email format boundary values are classified correctly
    When I create an employee with email "<email>"
    Then the email "<email>" should be "<outcome>"

    Examples:
      | email                | outcome  |
      | plainaddress         | rejected |
      | @no-local.com        | rejected |
      | no-at-sign.com       | rejected |
      | spaces in@email.com  | rejected |
      | trailingdot@domain.  | rejected |
      | valid@example.co     | accepted |

  # ---- Name size constraint @Size(3,30) (verified) ----

  @negative @validation
  Scenario: API-P13a Name shorter than the minimum is rejected
    When I create an employee with first name "AB"
    Then the response status should be 400
    And the validation error for field "firstName" should have the size message

  @negative @validation
  Scenario: API-P13b Name longer than the maximum is rejected
    When I create an employee with a 1000-character first name
    Then the response status should be 400
    And the validation error for field "firstName" should have the size message

  # ---- dob (optional ISO date) ----

  @positive @validation
  Scenario: API-P16 dob is optional - omitting it still creates the employee
    When I create an employee with valid data without a dob
    Then the response status should be 201

  @negative @validation
  Scenario: API-P17 Invalid dob format is rejected
    When I create an employee with dob "not-a-date"
    Then the response status should be 400

  # ---- Malformed input & protocol ----

  @negative
  Scenario: API-P08 Malformed JSON body returns 400 (not 500)
    When I send a malformed JSON body to create an employee
    Then the response status should be 400

  @negative
  Scenario: API-P09 Empty JSON object returns 400
    When I create an employee with an empty JSON object
    Then the response status should be 400

  @negative
  Scenario: API-P10 Unsupported content type is rejected
    When I send a create request with content type "text/plain"
    Then the response status should be one of "400, 415"

  # Decided policy: email must be unique. A duplicate POST is rejected (409) and
  # no second record is created. If the current build still accepts duplicates,
  # this fails as a data-integrity defect — open a bug, do not relax the assertion.
  @negative @data-integrity @known-issue
  Scenario: API-P11 Duplicate email is rejected and no second record is created
    Given an employee already exists with a known email
    When I create another employee with the same email
    Then the response status should be 409
    And only one employee should exist with that email

  # Decided policy: unknown client fields are accepted (201) but never persisted,
  # and client-supplied values for server-owned fields (id) must not be honored
  # (mass-assignment guard).
  @positive @data-integrity
  Scenario: API-P12 Unknown and reserved fields from the client are not persisted
    When I create an employee with valid data plus an unknown field
    Then the response status should be 201
    And the created employee should not expose the unknown field
    When I create an employee with a forced "id"
    Then the response status should be 201
    And the stored id should not be the forced value

  @positive @data-integrity
  Scenario: API-P14 A created employee is persisted and retrievable
    When I create an employee with valid data
    Then the response status should be 201
    And the created employee should be retrievable from the list by email

  @negative
  Scenario: API-P15 Unsupported method on the collection is rejected
    When I send a "PATCH" request to the employees collection
    Then the response status should be one of "405, 404, 400"
