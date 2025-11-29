// cypress/e2e/notifications.cy.ts

const TEST_EMAIL = "xyz@example.com";      // <-- put the same email you used in other specs
const TEST_PASSWORD = "123456789";       // <-- same password as other specs

function login() {
  cy.visit("/login");

  cy.get('input[placeholder="john@example.com"]').type(TEST_EMAIL);
  cy.get('input[placeholder="Enter your password"]').type(TEST_PASSWORD);

  cy.contains("button", "Sign In").click();

  // This works in your other specs, so it should be fine here too
  cy.url().should("include", "/dashboard");
}

describe("Notifications Page", () => {
  beforeEach(() => {
    login();

    // Open Notifications from sidebar
    cy.contains("Notifications").click();
    cy.url().should("include", "/notifications");
  });

  it("loads the notifications page without crashing", () => {
    // Main heading + subtitle
    cy.contains("Notifications").should("be.visible");
    cy.contains("All caught up!").should("be.visible");

    // Tabs: All / Unread / Action Required
    cy.contains("All").should("exist");
    cy.contains("Unread").should("exist");
    cy.contains("Action Required").should("exist");

    // Either empty state OR at least one notification card
    cy.get("body").then(($body) => {
      if ($body.text().match(/No notifications/i)) {
        cy.contains(/No notifications/i).should("be.visible");
      } else {
        // Your UI shows cards like "Payment Received"
        cy.contains("Payment Received").should("exist");
      }
    });
  });

  it("switches between All, Unread, and Action Required tabs", () => {
    // Start on All
    cy.contains("All").click();
    cy.contains("Notifications").should("be.visible");

    // Unread
    cy.contains("Unread").click();
    cy.contains("Notifications").should("be.visible");

    // Action Required
    cy.contains("Action Required").click();
    cy.contains("Notifications").should("be.visible");

    // Back to All
    cy.contains("All").click();
    cy.contains("Notifications").should("be.visible");
  });
});
