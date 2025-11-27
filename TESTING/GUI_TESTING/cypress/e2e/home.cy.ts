// cypress/e2e/home.cy.ts

describe("Landing Page GUI", () => {
  it("shows the marketing hero section", () => {
    cy.visit("/");

    cy.contains("Smart Expense").should("be.visible");
    cy.contains("Manage your money").should("be.visible");
    cy.contains("Create Account Now").should("be.visible");
    cy.contains("Watch Demo").should("be.visible");
  });

  it("allows navigating to login from navbar", () => {
    cy.visit("/");

    cy.contains("Login").click();

    cy.url().should("include", "/login");
    cy.contains("Sign In").should("be.visible");
  });
});
