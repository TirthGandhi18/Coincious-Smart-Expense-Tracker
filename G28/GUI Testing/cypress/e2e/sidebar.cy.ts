// cypress/e2e/sidebar.cy.ts

const TEST_EMAIL = "xyz@example.com";
const TEST_PASSWORD = "123456789";

function login() {
  cy.visit("/login");

  cy.get('input[placeholder="john@example.com"]').type(TEST_EMAIL);
  cy.get('input[placeholder="Enter your password"]').type(TEST_PASSWORD);

  cy.contains("button", "Sign In").click();

  cy.url().should("include", "/dashboard");
}

describe("Sidebar navigation GUI", () => {
  beforeEach(() => {
    login();
  });

  it("shows all main sidebar links", () => {
    cy.contains("Dashboard").should("be.visible");
    cy.contains("Groups").should("be.visible");
    cy.contains("AI Assistant").should("be.visible");
    cy.contains("Notifications").should("be.visible");
    cy.contains("Support").should("be.visible");
    cy.contains("Settings").should("be.visible");
    cy.contains("Sign out").should("be.visible");
  });

  it("allows user to sign out from sidebar", () => {
    cy.contains("Sign out").click();

    cy.url().should("include", "/login");
    cy.contains("Sign In").should("be.visible");
  });
});
