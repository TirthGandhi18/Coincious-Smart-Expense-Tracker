// cypress/e2e/settings.cy.ts

const TEST_EMAIL = "xyz@example.com";
const TEST_PASSWORD = "123456789";

function login() {
  cy.visit("/login");

  cy.get('input[placeholder="john@example.com"]').type(TEST_EMAIL);
  cy.get('input[placeholder="Enter your password"]').type(TEST_PASSWORD);

  cy.contains("button", "Sign In").click();

  cy.url().should("include", "/dashboard");
}

describe("Settings Page GUI", () => {
  beforeEach(() => {
    login();
    cy.contains("Settings").click({ force: true });
  });

  it("loads the settings page without crashing", () => {
    cy.url().should("include", "/settings");

    // Main heading
    cy.contains("Settings").should("be.visible");

    // Appearance section
    cy.contains("Appearance").should("be.visible");
    cy.contains("Dark Mode").should("be.visible");

    // Privacy section
    cy.contains("Privacy & Security").should("be.visible");
    cy.contains("Data Sharing").should("exist");

    // App management
    cy.contains("App Management").should("be.visible");

    // Save button
    cy.contains("Save All Changes").should("be.visible");
  });
});
