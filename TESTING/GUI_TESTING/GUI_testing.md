# GUI Testing Documentation – Coincious Smart Expense Tracker

<br>

## 1. Introduction  
This document summarises the graphical user interface testing completed for the Coincious Smart Expense Tracker.  
The aim was to ensure that every visible component behaves correctly, loads consistently, and responds smoothly when interacted with.  
All tests were automated using Cypress and executed on the frontend.

<br><br>

## 2. Test Environment

### 2.1 Tools and Frameworks  
| Tool | Purpose |
|------|---------|
| Cypress 13 | Browser-based GUI automation |
| Node.js 18+ | Required for Cypress + Vite |
| React + Vite | Frontend framework |
| Supabase | Authentication + backend |
| GitHub.dev | Documentation platform |

<br>

### 2.2 Test User  
The following stable user was used for GUI testing:  
- **Email:** xyz@example.com  
- **Password:** 123456789  

<br><br>

## 3. Testing Strategy  
Our approach focused on validating the visible behaviour of the system, including:

- Page rendering  
- Navigation and routing  
- Form inputs  
- Buttons and interactions  
- Data display components  
- Modals  
- Charts  
- Date picker  
- Sidebar behaviour  
- Dark mode  
- Notification UI feedback  

Each major feature received a dedicated Cypress test file.

<br><br>

## 4. Directory Structure  

The GUI testing files are organised under the `TESTING/GUI_Testing` directory as shown below:

```text
TESTING/
└── GUI_Testing/
    ├── GUI_testing.md
    ├── cypress.config.ts
    └── cypress/
        ├── e2e/
        │   ├── add-expense.cy.ts
        │   ├── dashboard.cy.ts
        │   ├── darkmode.cy.ts
        │   ├── groups.cy.ts
        │   ├── home.cy.ts
        │   ├── login.cy.ts
        │   ├── notifications.cy.ts
        │   ├── settings.cy.ts
        │   └── sidebar.cy.ts
        ├── fixtures/
        │   └── example.json
        └── support/
            ├── commands.ts
            └── e2e.ts
```

<br><br>

## 5. Test Cases Overview

### 5.1 Login Page  
| Check | Result |
|-------|--------|
| Login page loads | ✔ Passed |
| Email and password inputs work | ✔ Passed |
| Invalid login shows error | ✔ Passed |
| Valid login redirects to dashboard | ✔ Passed |

<br>

### 5.2 Dashboard  
| Check | Result |
|-------|--------|
| Dashboard loads | ✔ Passed |
| Summary cards visible | ✔ Passed |
| Date picker opens/closes | ✔ Passed |
| Charts rendered | ✔ Passed |

<br>

### 5.3 Add Expense  
| Check | Result |
|-------|--------|
| Form loads | ✔ Passed |
| Category dropdown works | ✔ Passed |
| Inputs accept valid data | ✔ Passed |
| Submission succeeds | ✔ Passed |
| Success toast appears | ✔ Passed |

<br>

### 5.4 Sidebar Navigation  
| Check | Result |
|-------|--------|
| Sidebar links navigate correctly | ✔ Passed |
| Active highlight works | ✔ Passed |
| Sidebar behaviour consistent | ✔ Passed |

<br>

### 5.5 Groups Page  
| Check | Result |
|-------|--------|
| Groups page loads | ✔ Passed |
| No-group message visible | ✔ Passed |
| Group cards display when available | ✔ Passed |
| Buttons behave correctly | ✔ Passed |

<br>

### 5.6 Notifications Page  
| Check | Result |
|-------|--------|
| Notifications load | ✔ Passed |
| Empty-state message visible | ✔ Passed |

<br>

### 5.7 Settings Page  
| Check | Result |
|-------|--------|
| Settings page loads | ✔ Passed |
| Theme toggle works | ✔ Passed |

<br>

### 5.8 Home Page  
| Check | Result |
|-------|--------|
| Home loads | ✔ Passed |
| Navigation works | ✔ Passed |

<br>

### 5.9 Dark Mode  
| Check | Result |
|-------|--------|
| Dark mode toggles immediately | ✔ Passed |
| Correct theme class applied | ✔ Passed |
| UI updates without reload | ✔ Passed |

<br><br>

## 6. Issues Encountered & Fixes  

### 6.1 Login Redirect Loop  
Early tests got stuck on login.  
We resolved this by resetting sessions and using a stable test user.

<br>

### 6.2 Date Picker Behaviour  
Drag selection was incompatible with Cypress.  
We switched to click-based selection for reliability.

<br>

### 6.3 Theme Persistence  
Theme would reset on refresh.  
We explicitly set the theme before running each test.

<br><br>

## 7. Execution Summary  
| Metric | Result |
|--------|--------|
| GUI test files | 9 |
| Total tests | All executed |
| Pass rate | **100%** |
| Failures | 0 |
| Stability | High |

<br><br>
--