# Sprints

## Sprint 1: The plan, the design, and our first AI test

**Goal:** Our primary objective is to determine precisely what we're building, design the app's visual appearance, and test our core AI concept to ensure its feasibility.

**Key Activities:**

* **Figuring out what to build:**  
  * We'll decide on the "must-have" features for our first version.  
  * We'll gather feedback from real people by sending out our survey and discussing their money habits with a few friends.  
  * Based on that feedback, we'll write down our final list of project requirements.  
* **What the frontend team will do:**  
  * Create the tentative design and a prototype of the web app in Figma.  
* **What the backend & AI team will do:**  
  * They will build a simple server with api endpoints for basic AI categorisation that proves our AI categorisation idea works. This won't be a full working app, just a small terminal-side test program.  
  * They will share this script with the whole team. Everyone can then run it, test it under different situations, and see how accurate our AI is from day one.

---

## Sprint 2: The foundation \- User authentication

* **Goal:** To build a fully working login and sign-up system so users can securely access the app.  
* **Key Activities:**  
  * **Frontend team:** Build the login, sign-up, and password reset pages in code based on the Figma designs.  
  * **Backend team:** Set up Supabase for user authentication, set up basic API endpoints and ensure our main backend server is ready to identify logged-in users.

---

## Sprint 3: Core feature \- Personal expense tracking

* **Goal:** To allow a logged-in user to add, see, and manage their own personal expenses and view them in a simple chart.  
* **Key activities:**  
  * **Frontend team:** Build the main dashboard for listing expenses, the "Add expense" form, and the analytics page with a basic chart.  
  * **Backend team:** Create the API endpoints that allow for creating, reading, editing, and deleting personal expenses in the database. Formulate the basic script to show charts and analytics in Python.

---

## Sprint 4: Core feature \- Group & splitting logic

* **Goal:** By the end of this sprint, users will be able to create groups, invite their friends, and split a bill accurately.  
* **Key activities:**  
  * **Frontend team:** Build all the UI screens for managing groups, including the group dashboard that shows who owes whom.  
  * **Backend team:** Develop the server logic for managing group members and accurately calculating all balances whenever a new shared bill is added.

---

## Sprint 5: The "Smart" layer \- AI and PWA Features

* **Goal:** To integrate our core AI categorisation feature and make the web app feel like a real app by making it installable.  
* **Key Activities:**  
  * **Frontend team:** Connect the "Add expense" form to the AI endpoint to show smart category suggestions and showcase the financial advisor feature in the UI. Configure the project to be a Progressive Web App (PWA).  
  * **Backend & AI team:** Take the AI prototype from Sprint 1 and turn it into a live API endpoint, and also develop the required AI financial advisor, and devise the server logic for the AI saving planning and recommendation system that the frontend can communicate with.

---

## Sprint 6: The final push \- Integration and deployment

* **Goal:** The goal for this final sprint is for all teams to come together, merge all the features, conduct final testing, and launch a stable version of the application.  
* **Key activities (all teams collaborating):**   
  * **Feature integration:** We will connect all the independent parts of the app: personal tracking, group splitting, and the AI features, to ensure they work together seamlessly.  
  * **Final testing:** The entire team will dedicate time to testing every part of the live application, trying to find and fix any remaining bugs or user experience issues.  
  * **Deployment:** We will deploy the final, polished version of our app to a live server, ready for our final demonstration.  
  * **Documentation:** We will complete the final project report and user guide to wrap up the project.

