# Coinscious - User Stories
This document outlines the user stories for the Coinscious Smart Expense Tracker and Splitter application.

## User authentication and registration

### Front of card:
As a new user, I want to register using my email and password, but if I already have an account, I want to be easily guided to the login page.

### Back of card:
- The signup form must include fields for email, password, and confirm password.
- The system checks if the email already exists and, if so, displays an error: "Account already exists. Please log in," with a direct link to the login page.
- Successful signup creates an account and redirects the user to their dashboard.
- The form must include a clear link that says, "Already have an account? Login."

##

### Front of card:
As a registered user, I want to log in with my email and password so I can securely access my expense dashboard.

### Back of card:
- The login form includes fields for email and password.
- Credentials are validated against the database.
- If correct, the user is redirected to the dashboard; otherwise, an error message is shown.

##

### Front of card:
As any user, I want to sign up or log in instantly using my Google or Facebook account to avoid filling out forms.

### Back of card:
- The screen must show distinct "Continue with Google" and "Continue with Facebook" buttons.
- Clicking triggers the standard OAuth process with the chosen provider.
- On success, the system either logs in the existing user or creates a new account using their social profile information, then redirects them to the dashboard.

##

### Front of card:
As a user filling out any form with a password, I want to toggle the password's visibility so I can confirm I entered it correctly.

### Back of card:
- All password and "confirm password" fields must have an "eye" icon.
- By default, the password text is masked (dots or asterisks).
- Clicking the icon reveals the password in plain text; clicking again re-masks it.

##

### Front of card:
As a user who has forgotten my password, I want a simple and secure way to reset it so that I can regain access to my account.

### Back of card:
- The login form displays a "Forgot password?" link.
- Clicking the link takes the user to a page where they can enter their registered email.
- The system sends a time-sensitive password reset link to that email.
- Following the link allows the user to set a new password and log in.

##

### Front of card:
As a user filling out a form, I want instant and clear feedback on my inputs and helpful error messages if something goes wrong.

### Back of card:
- The system provides real-time validation for email formatting and password strength requirements as the user types.
- A clear "Passwords do not match" error is shown if the password fields are different.
- Specific, helpful error messages are shown for incorrect login credentials, server issues, or other problems.

##

### Front of card:
As a user, I want the option to stay logged in and access my data in real-time from multiple devices.

### Back of card:
- A "Remember me" checkbox on the login form will maintain the user's session after the app is closed.
- The system supports concurrent logins, and any data changes (like a new expense) will sync in real-time across all active devices.
- A user can view and manage their active sessions from their account settings.

##

### Front of card:
As a security-conscious user, I want the option to enable two-factor authentication (2FA) to add an extra layer of protection to my account.

### Back of card:
- Users can enable 2FA in their account settings via an authenticator app.
- When 2FA is enabled, the login process will require a time-sensitive code after the password has been verified.

---


## Personal Expenses

### Front of card:
As a user, I want to add an expense with details so I can maintain a complete record of my spending.

### Back of card:
- Must allow entry of amount, category, date, payment mode, and optional notes.
- The expense should appear instantly in the transaction history.
- Prevents saving if the amount is invalid.
- Supports quick-add for frequent expenses.
- If offline, expenses must be stored locally and synced later.

##

### Front of card:
As a user, I want to delete expenses so that I can correct mistakes or remove old entries.

### Back of card:
- Must allow deletion from history.
- The system must confirm before deletion.
- Once deleted, the expense is removed from reports.
- Deleted entries can be undone briefly.

##

### Front of card:
As a user, I want to edit the details of an expense I've already logged, so that I can correct any mistakes or update information without having to delete and re-enter the entire transaction.

### Back of card:
- The user must be able to access an "Edit" option from the transaction history list or the detailed expense view.
- Clicking "Edit" must open a pre-filled form with all the existing expense details.
- The user can change any of the fields in the form.
- Upon saving, the changes must be instantly reflected in the transaction history and all related reports or charts.
- The system must re-validate the new information before saving.
- There must be a clear "Cancel" button to discard any changes and return to the previous screen.

##

### Front of card:
As a user, I want to track money I owe or money owed to me so I can settle balances easily.

### Back of card:
- Must allow tagging expenses as 'paid by me' or 'shared'.
- The system automatically calculates balances.
- Shows clear labels such as 'You owe X' or 'Y owes you'.
- Allows manual settlement once payment is made.
- Sends optional reminders for pending settlements.

##

### Front of card:
As a user, I want to categorise expenses so that I can see where my money goes.

### Back of card:
- Must provide predefined categories.
- Allows custom categories.
- Categories must be editable or deletable.
- Expenses must be filterable by category.
- Categories should be colour-coded for visualisation.

##

### Front of card:
As a user, I want to see summaries and graphs so that I can track patterns in my spending.

### Back of card:
- Must provide bar, pie, or line charts.
- Allows filtering by category or date.
- Graphs update dynamically.
- Exports insights into reports.
- Highlights unusual spikes in spending.

##

### Front of card:
As a user, I want to see how much I saved each month so I can track progress toward my goals.

### Back of card:
- Must compare income vs expenses.
- If no income, allow setting a budget baseline.
- Shows savings as a number and a percentage.
- Highlights months with negative savings.
- Displays trend over past months.

##

### Front of card:
As a user, I want to check my total spending over time so that I can reflect on my habits.

### Back of card:
- Must display cumulative total.
- Allows filtering by time range.
- Updates dynamically as expenses change.
- Supports breakdown by category over history.

##

### Front of card:
As a user, I want to view my most recent expenses so that I don’t lose track of new entries.

### Back of card:
- Must display at least the last 5–10 entries.
- Each entry shows date, amount, category, and notes.
- Clicking a transaction shows full details.
- Must allow swipe actions like delete or edit.

##

### Front of card:
As a user, I want budget alerts so I can be notified when I am nearing or exceeding my spending limit.

### Back of card:
- Must allow setting monthly or category budgets.
- Alerts at 75, 90, and 100 per cent.
- Alerts via push notifications or in-app messages.
- Must allow adjusting thresholds.
- Visual warnings must be displayed.

##

### Front of card:
As a user, I want recurring expenses to be managed automatically so that I don’t need to add them manually each time.

### Back of card:
- Must allow marking an expense as recurring (daily, weekly, monthly).
- Recurring expenses are added automatically to the history.
- Notification must be sent before adding a recurring expense.
- Must allow pausing or cancelling recurring expenses.

##

### Front of card:
As a user, I want to export my expenses for a specific time period to a CSV file, so that I can share and view the expenses in one place together

### Back of card:
- The user must be able to select a date range for the export
- The generated file must be in a valid .csv format that opens correctly in standard spreadsheet software.
- The CSV file must contain a header row with clear column titles
- Only the expenses that fall within the selected date range are included in the export.
- If there are no expenses in the selected period, the system displays a friendly message instead of generating an empty file.

---

## Group Expenses

### Front of card:
As a user, I want to create groups and invite members so that we can manage shared expenses.

### Back of card:
- Must allow group creation with name and description.
- Members can be invited via email, phone, or link.
- Users can accept or decline invitations.
- Must support joining via link or code.
- Group admin can remove members.

##

### Front of card:
As a group member, I want to add shared expenses so that everyone’s contributions are visible.

### Back of card:
- Must allow entry of amount, payer, participants, and category.
- By default, it is split equally among all members.
- Appears instantly in the group transaction list.
- Invalid entries must be blocked.
- Must allow attaching notes or receipts.

##

### Front of card:
As a group member, I want to split costs unequally so that amounts reflect real spending.

### Back of card:
- Must allow manual split by percentages or fixed amounts or even by parts.
- The system must validate totals.
- Supports mixed contributions.
- Displays how much each member owes.

##

### Front of card:
As a group member, I want to view balances so that we can settle easily.

### Back of card:
- The system must auto-calculate balances.
- Balances are shown in simple terms.
- Allows marking balances as settled.
- Supports partial settlements.
- Updates balance dynamically.

##

### Front of card:
As a group member, I want to receive notifications when expenses are updated so that I always stay informed.

### Back of card:
- Must notify when a new expense is added.
- Notify when expense is edited or deleted.
- Send reminders for settlements.
- Allow toggling notifications per group.

---

## Parental Mode

### Front of card:
As a parent, I want to monitor my child’s account so that I can guide their spending.

### Back of card:
- Must allow linking child accounts with email or ID.
- Parents can view all child transactions.
- The system generates alerts for limits set by parents.
- Parents can see categorised reports of the child's expenses.
- Parents are notified of unusual transactions.
- Linking requires consent from both parent and child.

##

### Front of card:
As a parent, I want to set spending limits so that I can teach responsible usage.

### Back of card:
- Must allow setting weekly or monthly caps.
- Parents can apply category restrictions.
- The system alerts the parent and child at 75, 90, and 100 per cent.
- Transactions over limits are blocked or flagged.
- Attempts to bypass are logged and notified.
- Parents can edit or remove restrictions anytime.

---

## AI Features

### Front of card:
As a user, I want to chat with an AI assistant so that I can quickly get answers about my expenses.

### Back of card:
- An AI chatbot is integrated into the app for expense-related queries
- Respond to questions like “How much did I spend on food last week?”
- Displays text answers and shows fallback suggestions if it cannot answer.

##

### Front of card:
As a user, I want AI-based insights so that I can understand and improve my spending habits.

### Back of card:
- AI generates personalised suggestions based on expense history
- Provides graphical insights alongside text explanations
- Highlights overspending trends in specific categories

##

### Front of card:
As a user, I want to set goals with AI assistance so that I can stick to my budget.

### Back of card:
- AI recommends realistic budget goals based on spending patterns
- Tracks progress and sends timely reminders
- Notifies me if I exceed the budget and congratulates me on achieving goals

##

### Front of card:
As a user adding an expense, I want the AI to intelligently suggest a category based on my description so that I can save time and keep my records consistent.

### Back of card:
- The AI must analyse the transaction description in real-time to suggest the most likely expense category.
- The user must always have the final choice to accept the AI's suggestion or manually select a different category.

##

### Front of card:
As a user, I want the AI to handle my queries in natural language so that I don’t need to click through menus.

### Back of card:
- Supports NLP for free-form expense questions
- Provides context-aware responses for accurate results
- Handles queries like expense breakdowns or category comparisons

  ---

## Non-Functional Stories

### Front of card:
As a user, I want the app to open quickly and feel responsive so that I don’t get frustrated waiting.

### Back of card:
- The system must launch and display the main dashboard within a few seconds.
- Navigating between main screens (e.g., Dashboard, Transactions, Reports) must be smooth.
- Scrolling through long lists, such as transaction history, must remain fluid and responsive.

##

### Front of card:
As a user, I want my account to stay private so that nobody else can see my money details.

### Back of Card:
- All user passwords and data must be stored securely.
- All transfers must be encrypted in order to prevent any sensitive information from being exposed.
- The system must offer optional two-factor authentication (2FA) for users who want an extra layer of security

##

### Front of card:
As a user, I want the app to always work when I open it so that I can rely on it anytime.

### Back of card:
- The system must handle network or server issues by displaying a friendly error message with a retry option, rather than crashing.
- Unsaved progress in forms, such as a partially entered expense, must be stored temporarily to prevent data loss from an interruption.
