@api @employees @get
Feature: GET /api/v1/employees/{id} - fetch employee by id
  As an API consumer
  I want to retrieve an existing employee and get a clear 404 for a missing one
  So that clients can rely on predictable read behavior

  # ---- Requested cases ----

  @positive @smoke
  Scenario: API-G01 Existing id returns 200 with the employee
    Given an employee exists
    When I get the employee by its id
    Then the response status should be 200
    And the response body should contain a generated "id"

  @negative @smoke
  Scenario: API-G02 Non-existing id returns 404 with the not-found message
    When I get the employee with id "99999999"
    Then the response status should be 404
    And the response message should be the not-found message for id "99999999"

  # ---- Recommended: input handling ----

  @negative @validation
  Scenario: API-G03 Non-numeric id is rejected as a bad request
    When I get the employee with id "abc"
    Then the response status should be one of "400, 404"

  @negative @validation
  Scenario Outline: API-G04 Boundary ids are handled predictably
    When I get the employee with id "<id>"
    Then the response status should be one of "<statuses>"

    Examples:
      | id  | statuses      |
      | 0   | 404, 400      |
      | -1  | 404, 400      |

  @negative
  Scenario: API-G05 Id beyond Long range does not cause a server error
    When I get the employee with id "99999999999999999999"
    Then the response status should be one of "400, 404"

  # ---- Recommended: contract & integrity ----

  @positive @contract
  Scenario: API-G06 Existing employee response has the expected schema
    Given an employee exists
    When I get the employee by its id
    Then the response status should be 200
    And the response content type should be JSON
    And the response body should have fields "id, firstName, lastName, email, dob"

  @positive @data-integrity @smoke
  Scenario: API-G07 Create then read returns consistent data (round-trip)
    Given I create an employee with valid data
    And I resolve the created employee id from the list
    When I get the employee by its id
    Then the response status should be 200
    And the fetched employee should match the created employee

  @positive @performance
  Scenario: API-G08 Read responds within the SLA
    Given an employee exists
    When I get the employee by its id
    Then the response status should be 200
    And the response time should be within the configured SLA
