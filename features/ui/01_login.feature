@login
Feature: Step 1 - Login to the Shop
  As a registered shopper
  I want to log in with valid credentials
  So that I can access the shopping cart and place orders

  # Risk: auth gate to the whole revenue flow. Failure here blocks every downstream step.

  Background:
    Given the shopper is on the login page

  @positive @smoke
  Scenario: Successful login reveals the shopping cart
    When the shopper logs in with valid credentials
    Then the shopping cart should be displayed

  @negative
  Scenario: Login is rejected with a wrong password
    When the shopper logs in with an incorrect password
    Then the shopping cart should not be displayed
    And the login form should still be visible

  @negative
  Scenario: Login is rejected for an unknown user
    When the shopper logs in with an unknown email
    Then the shopping cart should not be displayed
    And the login form should still be visible

  @negative @validation @known-issue
  Scenario: Empty credentials are blocked by field validation
    When the shopper submits the login form with empty credentials
    Then the email field should be invalid
    And the shopping cart should not be displayed

  @negative @validation @known-issue
  Scenario: Only the password is empty - password field is invalid
    When the shopper logs in with email "admin@admin.com" and password ""
    Then the password field should be invalid
    And the shopping cart should not be displayed

  @negative @validation @known-issue
  Scenario: Only the email is empty - email field is invalid
    When the shopper logs in with email "" and password "admin123"
    Then the email field should be invalid
    And the shopping cart should not be displayed

  @negative @edge
  Scenario: Password is case-sensitive
    When the shopper logs in with email "admin@admin.com" and password "Admin123"
    Then the shopping cart should not be displayed
    And the login form should still be visible

  @negative @edge
  Scenario: Surrounding whitespace in the password is not trimmed into a match
    When the shopper logs in with email "admin@admin.com" and password "admin123 "
    Then the shopping cart should not be displayed
    And the login form should still be visible

  @negative @security
  Scenario: Script payload in the email is rejected as an invalid email
    When the shopper logs in with email "<script>alert(1)</script>" and password "admin123"
    Then the email field should be invalid
    And the shopping cart should not be displayed

  @edge @session
  Scenario: Session does not persist across a page refresh
    When the shopper logs in with valid credentials
    And the shopper refreshes the page
    Then the login form should still be visible
