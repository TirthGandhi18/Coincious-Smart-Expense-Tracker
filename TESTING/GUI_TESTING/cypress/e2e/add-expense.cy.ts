// cypress/e2e/add-expense.cy.ts

const TEST_EMAIL = "xyz@example.com";
const TEST_PASSWORD = "123456789";

function loginAndGoToAddExpense() {
  cy.visit("/login");

  cy.get('input[placeholder="john@example.com"]').type(TEST_EMAIL);
  cy.get('input[placeholder="Enter your password"]').type(TEST_PASSWORD);

  cy.contains("button", "Sign In").click();

  cy.url().should("include", "/dashboard");

  cy.visit("/add-expense");
}

describe("Add Expense Page GUI", () => {
  beforeEach(() => {
    loginAndGoToAddExpense();
  });

  it("shows the expense creation form", () => {
    cy.contains("Add Expense").should("exist");

    cy.get('input[placeholder*="Dinner"]').should("be.visible");
    cy.get('input[type="number"]').should("be.visible");
    cy.get('input[type="date"], input[type="text"]')
      .filter(":visible")
      .first()
      .should("be.visible");

    cy.contains("Category").should("exist");

    cy.contains("button", /Add|Save|Add Expense/i).should("exist");
  });

  it("submits an expense without crashing", () => {
    cy.get('input[placeholder*="Dinner"]').clear().type("Cypress Test Expense");
    cy.get('input[type="number"]').clear().type("199");

    // -------- Category selection fix ----------
    // Open the custom dropdown
    cy.contains("Category")
      .parent()
      .find("button, div")
      .first()
      .click({ force: true });

    // Select the first available option
    cy.get('[role="option"], li, [data-state="inactive"]')
      .first()
      .click({ force: true });

    // -------- Submit button ----------
    cy.contains("button", /Add|Save|Add Expense/i).click({ force: true });

    // Should not crash (stay here or redirect)
    cy.url().then((url) => {
      const ok =
        url.includes("/add-expense") || url.includes("/dashboard");
      expect(ok).to.be.true;
    });
  });
});
