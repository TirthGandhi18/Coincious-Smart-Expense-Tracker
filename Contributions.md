# 🚀 Project Contribution Breakdown

Since this project was highly collaborative, every member played a significant role in the development flow, whether directly through coding or indirectly through planning and testing.

Below is the detailed breakdown of the team structure and individual contributions.

---

## 👥 Team Members & Roles

| Role | Name | Enrollment No. | GitHub Profile |
| :--- | :--- | :--- | :--- |
| **Team Lead, Full Stack Dev, DB Dev, Deployment & Tester** | **Tirth Kaushal Gandhi** | `202301413` | [Tirthgandhi05](https://github.com/Tirthgandhi05) / [TirthGandhi18](https://github.com/TirthGandhi18) |
| **Backend Dev, DB Dev, AI Engineer & Tester** | **Karthik** | `202301407` | [karthikraman30](https://github.com/karthikraman30) / [karthik300106](https://github.com/karthik300106) |
| **Backend Dev, DB Dev & QA Engineer** | **Tanish Patel** | `202301411` | [Tanishkumar-Patel](https://github.com/Tanishkumar-Patel) |
| **Frontend Developer & Tester** | **Aum Patel** | `202301448` | [aum9049](https://github.com/aum9049) |
| **Frontend Developer & Tester** | **Darshit Ramani** | `202301404` | [ramani3311](https://github.com/ramani3311) |
| **Frontend Developer & Tester** | **Kirtan Chauhan** | `202301409` | [KirtanChauhan-47](https://github.com/KirtanChauhan-47) |
| **UI/UX Designer, Backend Dev & Tester** | **Ashka Pathak** | `202301270` | [AshkaPathak](https://github.com/AshkaPathak) |
| **Frontend, Backend Dev & QA Tester** | **Ruchir Joshi** | `202301410` | [Ruchir966](https://github.com/Ruchir966) |
| **Frontend Developer & Documentation** | **Pratik** | `202301435` | [Pratik1435](https://github.com/Pratik1435) |
| **Backend Developer** | **Rujal** | `202301277` | [Rujal-Jiyani-78](https://github.com/Rujal-Jiyani-78) |

---

## 📝 Task Distribution

### 🔹 Project Management & Planning
* **Sprint Formulation & Planning**: **Tirth K Gandhi**, **Tanish**, **Darshit**
* **Epic Formulation**: **Ashka**, **Ruchir**, **Darshit**
* **Elicitation Techniques (Brainstorming & Docs)**: **Tanish**, **Tirth K Gandhi**, **Ashka**
* **Meeting Minutes (MOMs)**: **Ashka**, **Aum**
* **Mid-Evaluation Documentation**: **Pratik**

### 🔹 Research & Analysis
* **Gathering User Stories**: **Ashka**, **Kirtan**, **Ruchir**, **Pratik**
* **Identifying FRs and NFRs**: **Tirth K Gandhi**, **Kirtan**, **Ruchir**, **Karthik**, **Tanish**
* **Survey Form Creation**: **Aum**, **Tirth K Gandhi**
* **Target Audience Interviews**: **Kirtan**, **Ruchir**, **Rujal**
* **Contextual Analysis**: **Tanish**, **Kirtan**
* **Research on OCR & Text-to-Speech Models**: **Karthik**
* **Survey Analysis**: **Rujal**

### 🔹 Design & Prototyping
* **Concept Poster & Chart Work**: **Ashka**
* **Initial Submission Documentation**: **Rujal**, **Karthik**
* **Basic Frontend Website Prototype**: **Aum**, **Darshit**, **Ashka**

### 🔹 Development & Implementation (Early Phase)
* **AI Categorization Model Prototype**: **Tirth K Gandhi**, **Karthik**, **Tanish**
* **Coding Landing & Login Pages**: **Aum**, **Darshit**
* **Readme File Documentation**: **Karthik**

---

## 🛠️ Detailed Technical Implementation & Feature Breakdown

### 1. System Architecture & Backend Infrastructure
* **Database Engineering:** Designed the full PostgreSQL schema on Supabase. This included creating tables, setting up Row Level Security (RLS) policies, and writing database functions and triggers. (**Tirth K Gandhi**, **Karthik**, **Tanish**)
* **Backend Initialization:** Set up the Flask server and created the main connection between the React frontend and the Python backend. (**Karthik**)
* **MVC Architecture Update:** Refactored the code to follow the Model-View-Controller pattern, making the project easier to scale and maintain. (**Tirth K Gandhi**)
* **Data Performance:** Added indexing and better data access methods to Supabase to speed up the app. (**Tirth K Gandhi**)

### 2. Authentication & User Management
* **Auth System Setup:** Configured Supabase Auth for Google and Email/Password logins and set up backend security rules. (**Tirth K Gandhi**, **Karthik**, **Tanish**)
* **Frontend Auth Integration:** Connected the login system to the client-side application. (**Tanish**)
* **Account Recovery & Verification:**
    * Built the "Forgot Password" feature, fixed email routing, and configured SMTP. (**Rujal**, **Tirth K Gandhi**)
    * Added verification for user registration and secure account deletion. (**Rujal**, **Ruchir**)

### 3. Frontend Architecture & Development
* **UI/UX Implementation:** Built the responsive layout and core visual components for the Dashboard, Profile, and Expense pages. (**Darshit**, **Aum**, **Pratik**, **Ruchir**, **Kirtan**)
* **Routing, Navigation & Auth Management:** Configured application routing for seamless page transitions and configured the core Auth Hook. (**Pratik**, **Ruchir**, **Kirtan**)

### 4. Artificial Intelligence & Advanced Modules
* **AI Categorization Engine:**
    * Built the first version of the AI model and logic. (**Tirth K Gandhi**, **Karthik**)
    * Connected the categorization logic to Supabase and the frontend, allowing the AI to learn from individual user habits. (**Tirth K Gandhi**)
* **Receipt Scanning System:**
    * Built the prototype for the OCR/Vision model. (**Karthik**)
    * Created the API endpoint, handled image processing, and built the drag-and-drop scanning UI. (**Tirth K Gandhi**)
* **AI Financial Advisor:**
    * Designed the chat interface for the AI Assistant. (**Kirtan**)
    * Built the full-stack Chatbot feature, including the backend logic and prompt engineering. (**Karthik**, **Tirth K Gandhi**)

### 5. Core Application Features
* **UI/UX Implementation:** Built the main interface for the Dashboard, Profile, Groups, and Add Expense pages. (**Darshit**, **Aum**, **Pratik**, **Ruchir**)
* **Personal Expense Module:** Created the full Create, Read, Update, Delete (CRUD) flow for personal expenses and connected the backend to the UI. (**Tirth K Gandhi**, **Ashka**)
* **Group Expense Management:** Built the logic for creating groups, splitting expenses between members, and calculating balances. (**Tanish**, **Karthik**)
* **Dashboard Analytics:**
    * Built the backend endpoint to send data for visualization. (**Tanish**, **Ashka**)
    * Created frontend charts for Total Expense, Group analytics, Budget Management, and Goals. (**Tirth K Gandhi**, **Tanish**)
    * Built the Budget feature frontend and Monthly Analytics graphs. (**Kirtan**)
* **Profile & Settings:**
    * Connected the backend for profile management and secure avatar image uploads. (**Tirth K Gandhi**)
    * Built the Application Settings page and Data Export feature. (**Darshit**, **Tirth K Gandhi**)

### 6. Utilities & Enhancements
* **Notifications System:** Designed the database tables for alerts and built the backend triggers and frontend UI for notifications. (**Tanish**, **Kirtan**)
* **Expense Calendar:** Added a calendar view to show daily expenses, fetching data from Supabase. (**Darshit**, **Aum**, **Rujal**)
* **Recurring Expenses:** Built the logic and interface for handling repeating transactions. (**Kirtan**, **Ruchir**)
* **Support & Landing Pages:** Designed and coded the Landing Page, Support Section, and Group Detail views. (**Aum**, **Pratik**)

### 7. Quality Assurance, Testing & Deployment
* **Non-Functional Testing:** Checked performance, volume handling, stress limits, and code readability. (**Tirth K Gandhi**)
* **Reliability Testing:** Tested the system's security, ease of use, and reliability. (**Tanish**)
* **GUI & Visual Testing:** Checked the interface for consistency and responsiveness across devices. (**Ashka**)
* **Unit & Mutation Testing:** Tested individual components to ensure the logic holds up under changes. (**Karthik**, **Darshit**, **Rujal**)
* **System Testing:** Tested the complete application flow from start to finish. (**Kirtan**, **Ruchir**)
* **Deployment:** Managed the final deployment of the full-stack application to the production server. (**Tirth K Gandhi**)

### 8. Final Documentation & Wrap-Up
* **Sprint Formulation:** (**Darshit**, **Tanish**, **Karthik**, **Tirth K Gandhi**)
* **Graphical & Design Document Analysis:** (**Darshit**, **Aum**, **Kirtan**, **Ruchir**)
* **Working Prototype Recording:** (**Ashka**, **Rujal**)
* **PPT Formulation:** (**Aum**, **Pratik**)
