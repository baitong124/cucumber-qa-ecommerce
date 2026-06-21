@shipping
Feature: Step 3 - Shipping details validation
  As a shopper at checkout
  I want the order to submit only when all required fields are provided
  So that orders are never registered with incomplete shipping data

  # Required fields: Phone, Street, City, Country (native HTML5 validation).

  Background:
    Given the shopper has the required items in the cart and is on the shipping details form

  @positive @smoke
  Scenario: Submitting with all required fields registers the order
    When the shopper fills in all shipping fields with valid data
    And the shopper submits the order
    Then the order confirmation should be displayed

  @negative @validation
  Scenario Outline: Order is not submitted when a required field is missing
    When the shopper fills the shipping form but leaves "<missing>" empty
    And the shopper submits the order
    Then the order confirmation should not be displayed
    And the shipping details form should still be visible
    And the "<missing>" field should be invalid

    Examples:
      | missing |
      | phone   |
      | street  |
      | city    |

  # The country select has no `required` attribute, so native HTML5 validation
  # does not block submission when it is empty. Expected to FAIL until a
  # `required` attribute or JS guard is added to the country dropdown.
  @negative @validation @known-issue
  Scenario: Order is not submitted when country is missing
    When the shopper fills the shipping form but leaves "country" empty
    And the shopper submits the order
    Then the order confirmation should not be displayed
    And the shipping details form should still be visible
    And the "country" field should be invalid

  @negative @validation
  Scenario: Order is not submitted when all fields are empty
    When the shopper submits the order with an empty shipping form
    Then the order confirmation should not be displayed
    And the shipping details form should still be visible
    And the shipping form should be invalid

  # ---- Edge: data quality that native `required` does not catch ----

  # Native `required` treats spaces as a value, so a whitespace-only address
  # passes validation. Desired: reject blank data. Expected to FAIL until the
  # app trims/validates, so it is flagged as a known issue.
  @negative @known-issue
  Scenario: Whitespace-only fields should not be accepted as a valid address
    When the shopper fills every shipping field with only spaces
    And the shopper submits the order
    Then the order confirmation should not be displayed

  @edge
  Scenario: Phone number accepts non-numeric input (no format validation)
    When the shopper fills the shipping form with phone "abcde" and otherwise valid data
    And the shopper submits the order
    Then the order confirmation should be displayed
    And it should be recorded that the phone field has no format validation

  @edge @data-integrity
  Scenario: Very long field values are handled without a crash
    When the shopper fills the shipping form with a 500-character street
    And the shopper submits the order
    Then the order confirmation should be displayed

  @edge @security
  Scenario: Script payload in an address field is not executed
    When the shopper fills the street with a script payload and otherwise valid data
    And the shopper submits the order
    Then the order confirmation should be displayed
    And no browser dialog should have been triggered
