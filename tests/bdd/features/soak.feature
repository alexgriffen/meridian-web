@long
Feature: Long-running console session
  As a billing operator who leaves the console open all day
  I want the invoices tab to keep refreshing on its own
  So that what I see is never stale

  # Runs for SOAK_MINUTES (default 16). Excluded from `test:bdd`; run it with
  # `test:soak`. Set SOAK_HANG=1 to stall the API halfway so the test hangs
  # until its timeout kills it.
  Scenario: The invoices tab stays fresh through a long session
    Given I am on the "Invoices" tab
    And the invoice list shows 2 invoices
    When I leave the invoices tab open for the soak duration
    Then the invoice list kept refreshing without errors
