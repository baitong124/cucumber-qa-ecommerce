@confirmation
Feature: Step 4 - Order confirmation address display
  As a shopper who completed checkout
  I want the confirmation to show my address correctly
  So that I can trust the order will ship to the right place

  # Address must render as: "Street, City - Country".

  Background:
    Given the shopper has placed an order with valid shipping details

  @positive @smoke
  Scenario: Confirmation shows the address in "Street, City - Country" format
    Then the confirmation address should be displayed as "Street, City - Country"

  @positive
  Scenario: Confirmation shows the correct order total
    Then the confirmation order total should equal 419.95

  # ---- Edge: country whose dropdown value differs from its label (KNOWN ISSUE) ----
  # Verified live: selecting "United Arab Emirates" echoes the misspelled option
  # value "United Arab Erimates". Desired: the confirmation shows the human label.
  # Expected to FAIL until the app displays the label instead of the raw value.
  @edge @known-issue
  Scenario: Country with a mismatched option value should display its label
    Given the shopper places an order shipping to the mismatched-value country
    Then the confirmation country should be the human-readable label

  @edge
  Scenario: A comma inside the street does not break the address format
    Given the shopper places an order with a comma in the street
    Then the confirmation address should match the submitted "Street, City - Country"

  @edge @session
  Scenario: Refreshing the confirmation page does not preserve the order state
    When the shopper refreshes the page
    Then the order confirmation should not be displayed
