// cypress/e2e/darkmode.cy.ts

const TEST_EMAIL = "xyz@example.com";
const TEST_PASSWORD = "123456789";

function login() {
  cy.visit("/login");

  cy.get('input[placeholder="john@example.com"]').type(TEST_EMAIL);
  cy.get('input[placeholder="Enter your password"]').type(TEST_PASSWORD);

  cy.contains("button", "Sign In").click();

  cy.url().should("include", "/dashboard");
}

describe("Dark Mode Toggle GUI", () => {
  beforeEach(() => {
    login();
  });

  it("can toggle dark mode", () => {
    // Find the theme toggle icon (moon/sun)
    cy.get('button').filter(':has(svg)').first().click({ force: true });

    // Check dark class added
    cy.get("html").should("have.class", "dark");

    // Toggle back
    cy.get('button').filter(':has(svg)').first().click({ force: true });

    cy.get("html").should("not.have.class", "dark");
  });
});
