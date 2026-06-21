@cart
Feature: Step 2 - Select items and validate cart total
  As a shopper
  I want item quantities and the cart total to be calculated correctly
  So that I am charged the right amount

  # Highest business risk: pricing/calculation. Total must equal sum(price x quantity).

  Background:
    Given the shopper is logged in and on the shopping cart

  @positive @smoke
  Scenario: Add the required items with correct quantities
    When the shopper adds "Dior J'adore" with quantity 2
    And the shopper adds "Gucci Bloom Eau de" with quantity 3
    Then the cart should contain 2 distinct items
    And the quantity of "Dior J'adore" should be 2
    And the quantity of "Gucci Bloom Eau de" should be 3

  @positive
  Scenario Outline: Line total equals unit price multiplied by quantity
    When the shopper adds "<item>" with quantity <qty>
    Then the line total for "<item>" should equal price times quantity

    Examples:
      | item               | qty |
      | Dior J'adore       | 2   |
      | Gucci Bloom Eau de | 3   |

  @positive @smoke
  Scenario: Cart grand total equals the sum of all line totals
    When the shopper adds "Dior J'adore" with quantity 2
    And the shopper adds "Gucci Bloom Eau de" with quantity 3
    Then the cart total should equal 419.95
    And the cart total should equal the sum of all line totals

  @positive
  Scenario: Updating a quantity recalculates the total live
    When the shopper adds "Dior J'adore" with quantity 2
    Then the cart total should equal 179.98
    When the shopper changes the quantity of "Dior J'adore" to 3
    Then the cart total should equal 269.97

  @edge
  Scenario: Large quantity is calculated without overflow or rounding error
    When the shopper adds "Gucci Bloom Eau de" with quantity 100
    Then the cart total should equal 7999.00

  @positive
  Scenario: Proceeding to checkout navigates to shipping details
    When the shopper adds "Dior J'adore" with quantity 2
    And the shopper adds "Gucci Bloom Eau de" with quantity 3
    And the shopper proceeds to checkout
    Then the shipping details form should be displayed

  # ---- Negative / edge: quantity boundaries (calculation integrity) ----

  @edge @validation
  Scenario Outline: Boundary/invalid quantities never produce an invalid total
    When the shopper adds "Dior J'adore" with quantity 1
    And the shopper changes the quantity of "Dior J'adore" to "<qty>"
    Then the cart total should be a valid non-negative number

    Examples:
      | qty | note                        |
      | 0   | zero quantity               |
      | -1  | negative quantity           |
      |     | empty / cleared field       |
      | abc | non-numeric text            |

  @edge @validation @known-issue
  Scenario Outline: Decimal quantity is rejected and the cart is unchanged
    When the shopper adds "Dior J'adore" with quantity 1
    And the shopper changes the quantity of "Dior J'adore" to "<qty>"
    Then the quantity of "Dior J'adore" should be 1
    And the cart total should equal 89.99

    Examples:
      | qty | note                 |
      | 1.5 | half unit            |
      | 2.9 | rounds down, not up  |
      | 0.1 | fraction below 1     |

  @edge
  Scenario: Adding the same product twice is handled consistently
    When the shopper adds "Dior J'adore" with quantity 1
    And the shopper adds "Dior J'adore" with quantity 1
    Then the cart behavior for a duplicate add should be recorded
    And the cart total should be a valid non-negative number

  @negative @state
  Scenario: Removing an item recalculates the total
    When the shopper adds "Dior J'adore" with quantity 2
    And the shopper adds "Gucci Bloom Eau de" with quantity 3
    And the shopper removes "Dior J'adore" from the cart
    Then the cart should contain 1 distinct items
    And the cart total should equal 239.97

  # ---- Negative: empty-cart checkout (KNOWN ISSUE) ----
  # Observed: the app navigates to the shipping form with an empty cart ($0).
  # Desired: checkout should be blocked. This scenario asserts the desired
  # behavior and is therefore expected to FAIL until the guard is added.
  @negative @known-issue
  Scenario: Checkout should be blocked when the cart is empty
    When the shopper proceeds to checkout
    Then the shipping details form should not be displayed
