const EMAIL = "xyz@example.com";
const PASSWORD = "123456789";

const loginOnce = () => {
  cy.session([EMAIL, PASSWORD], () => {
    cy.visit("/login");
    cy.get('input[placeholder="john@example.com"]').type(EMAIL);
    cy.get('input[placeholder="Enter your password"]').type(PASSWORD);
    cy.contains("button", "Sign In").click();
    cy.contains("h1", "Dashboard", { timeout: 15000 });
  });
};

describe("Groups Page", () => {
  beforeEach(() => {
    loginOnce();
    cy.visit("/groups");
  });

  it("loads the groups page without crashing", () => {
    cy.contains("Groups").should("be.visible");
    cy.contains("Manage your shared expense groups").should("be.visible");
    cy.contains("No groups yet").should("be.visible");
    cy.contains("Create Your First Group").should("be.visible");
  });

  it("shows Create Group button", () => {
    cy.contains("button", "Create Group").should("be.visible");
  });

  it("shows search input", () => {
    cy.get('input[placeholder="Search groups..."]').should("exist");
  });
});
