// cypress/e2e/login.cy.ts

// ⚠️ Put a real account or demo credentials here
const TEST_EMAIL = "xyz@example.com";
const TEST_PASSWORD = "123456789";

describe("Login Page GUI", () => {
  it("shows login form elements", () => {
    cy.visit("/login");

    cy.get('input[placeholder="john@example.com"]').should("be.visible");
    cy.get('input[placeholder="Enter your password"]').should("be.visible");
    cy.contains("button", "Sign In").should("be.visible");
    cy.contains("button", "Continue with Google").should("be.visible");
  });

  it("logs in successfully with valid credentials", () => {
    cy.visit("/login");

    cy.get('input[placeholder="john@example.com"]').type(TEST_EMAIL);
    cy.get('input[placeholder="Enter your password"]').type(TEST_PASSWORD);

    cy.contains("button", "Sign In").click();

    cy.url().should("include", "/dashboard");
    cy.contains("Dashboard").should("be.visible");
  });
});
