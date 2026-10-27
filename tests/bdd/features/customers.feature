Feature: Customer directory
  As a billing operator
  I want to search the customer directory
  So that I can find a customer quickly

  Scenario: Searching by name narrows the directory
    Given I am on the "Customers" tab
    And the directory lists 2 customers
    When I search customers for "globex"
    Then the directory lists 1 customer
    And the first row shows "Globex Industries"
    And the customer search API was called with "globex"
