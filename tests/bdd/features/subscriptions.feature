Feature: Subscriptions
  As a billing operator
  I want to create subscriptions from the console
  So that new customers start being billed

  Scenario: Creating a subscription adds it to the list
    Given I am on the "Subscriptions" tab
    And the subscription list shows 2 subscriptions
    When I create a "plan_starter" subscription for "Acme Corp" with a 25% discount
    Then I see a confirmation that the subscription was created
    And the subscription list shows 3 subscriptions
