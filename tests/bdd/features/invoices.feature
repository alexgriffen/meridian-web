Feature: Invoices
  As a billing operator
  I want to filter invoices and inspect their totals
  So that I can answer questions about what a customer owes

  Scenario: Filtering invoices by status
    Given I am on the "Invoices" tab
    And the invoice list shows 2 invoices
    When I filter invoices by status "paid"
    Then the invoice list shows 1 invoice
    And every invoice has status "paid"

  Scenario: Opening an invoice shows its breakdown
    Given I am on the "Invoices" tab
    When I open the invoice for "Acme Corp"
    Then the invoice drawer shows a subtotal of "$4,200.00"
    And the invoice drawer shows tax of "$346.50"
    And the invoice drawer shows a total of "$4,546.50"
