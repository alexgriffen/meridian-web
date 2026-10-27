Feature: Tenant scoping
  As an operator working across tenants
  I want every request to carry the tenant I selected
  So that I never see another tenant's data

  Scenario: Switching tenant re-scopes the console
    Given I am on the "Customers" tab
    And requests are scoped to tenant "A"
    When I switch to tenant "B"
    Then the customer directory is reloaded
    And requests are scoped to tenant "B"
