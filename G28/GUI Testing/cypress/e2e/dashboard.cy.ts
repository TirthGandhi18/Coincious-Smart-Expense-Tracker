const EMAIL = "xyz@example.com";
const PASSWORD = "123456789";

const login = () => {
  cy.visit("/login");
  cy.get('input[placeholder="john@example.com"]').type(EMAIL);
  cy.get('input[placeholder="Enter your password"]').type(PASSWORD);
  cy.contains("button", "Sign In").click();
  cy.contains("h1", "Dashboard", { timeout: 15000 });
};

describe("Dashboard GUI", () => {
  beforeEach(() => {
    login();
  });

  it("loads the dashboard with header and add expense button", () => {
    cy.contains("h1", "Dashboard").should("be.visible");
    cy.contains("Welcome back! Here's your financial overview.").should("be.visible");
    cy.contains("button, a", "Add Expense").should("be.visible");
  });

  it("shows the top summary cards", () => {
    cy.contains("Total Expenses").should("be.visible");
    cy.contains("You Owe").should("be.visible");
    cy.contains("You Are Owed").should("be.visible");
    cy.contains("Monthly Savings").should("be.visible");
  });

  it("opens and closes the date range picker", () => {
    cy.get(".calendar-wrapper button[aria-label='Open date range picker']")
      .should("be.visible")
      .click();

    cy.contains("Select Date Range").should("be.visible");

    cy.contains("button", "Clear").click();
    cy.contains("button", "Apply").should("be.disabled");
    cy.contains("button", "✕").click();

    cy.contains("Select Date Range").should("not.exist");
  });

  it("opens and closes the savings goal modal", () => {
    cy.get('button[title="Set savings goal"]').click();
    cy.contains("Set Monthly Savings Goal").should("be.visible");
    cy.contains("button", "Cancel").click();
    cy.contains("Set Monthly Savings Goal").should("not.exist");
  });

  it("shows expense categories chart section", () => {
    cy.contains("Expense Categories").should("be.visible");
    cy.contains("Your spending breakdown").should("be.visible");
    cy.contains("button", "Current Month").should("be.visible");
  });

  it("shows budget card", () => {
    cy.contains("Monthly Budget").should("be.visible");
  });

  it("shows daily spend trend section", () => {
    cy.contains("Daily Spend Trend").scrollIntoView().should("exist");
  });
});
