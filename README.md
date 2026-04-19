<div align="center">

<img width="200" height="200" alt="blip-logo" src="https://github.com/user-attachments/assets/0e94f5fc-3428-4481-b470-83bd2db807e6" />

## blip. 
### (PWA) The fastest way to track wealth and settle social debt. No forms, just speed.

[![Vercel Build](https://img.shields.io/badge/Vercel-Deployed-c9F158?style=flat-square&logo=vercel)](https://blip-eta.vercel.app)
![Node Version](https://img.shields.io/badge/Node-24.x-black?style=flat-square&logo=node.js&logoColor=c9f158)
![Top Language](https://img.shields.io/github/languages/top/shashank-modi/Blip?style=flat-square&color=C9F158&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-black?style=flat-square)

[**View Live Demo**](https://blip-eta.vercel.app) • [**Report Bug**](https://github.com/shashank-modi/Blip/issues)

</div>

---

## About
The idea for **blip.** was to create a wealth-management application that could log expenses, add new income and also share expenses with friends and family members with a simple mechanism. 

Wealth Management or Expense Tracking is considered tedious to the time it takes for logging and adding expenses into complicated UI that takes the user some time to learn. The main objective was to create a simple design and user experience that it takes only **2 secs** for anyone to add a new expense. This might help in making people more conscious with their spending habits and track their expenses daily.

---

## Tracking Expense (NLP Demo)
**blip.** uses a custom Natural Language Processing (NLP) parser to turn human thoughts into financial data.

> **Input:** `blinkit 800`, tap Food and blip.
> 
> **Result:**
> - **Amount:** ₹800
> - **Category:** Food
> - **Date:** [Today's Date]
> - **Description:** "Blinkit"

<div align="center">
  <img width="400" alt="ScreenRecording_04-19-2026 15" src="https://github.com/user-attachments/assets/e94facaa-526f-4d7a-8a2a-89618f78c18e" />
</div>

---
## Visual Tour

<div align="center">

| Dashboard | Social Settlements | Smart Logging |
| :---: | :---: | :---: |
| <img src="https://github.com/user-attachments/assets/0634b9ce-f6bd-4750-aff1-629878d19993" width="200" /> | <img src="https://github.com/user-attachments/assets/02ab91f2-e426-4215-afb2-2d6567d68320" width="200" /> | <img src="https://github.com/user-attachments/assets/4e941531-03e5-47e8-bf55-efa9d4d80a32" width="200" /> |
| *Analytics & budget tracking* | *One-tap debt resolution* | *NLP card for adding expense* |

</div>

---

## Key Features

* **Progressive Web App (PWA):** Installable on iOS/Android for a native app feel with zero App Store friction.
* **Sub-second Logging:** A minimalist "Blip Card" designed for rapid entry.
* **Smart Social Settlements:** A complex settlement engine that manages debts within groups (up to 6+ members).
* **Wallet Sync Logic:** Unique "Accounting Direction" awareness. When you settle a debt, the app intelligently decides if it should hit your personal budget as an **Expense** (paying back) or **Income** (recovering funds).
* **Minimal Matte-Charcoal UI:** High-contrast, accessibility-focused design using our signature `#C9F158` (Lime) and `#202020` (Charcoal) palette.

---

## Tech Stack

- **Frontend:** [React.js](https://reactjs.org/) + [Framer Motion](https://www.framer.com/motion/) (Animations)
- **State:** React Context API + Custom Hooks
- **Backend:** [Node.js 24](https://nodejs.org/) + Express
- **Database:** [Neon](https://neon.tech/) (Serverless PostgreSQL)
- **Deployment:** [Vercel](https://vercel.com/) (CI/CD)

---

## Engineering Deep Dive

### The "Double-Counting" Problem
In traditional apps, logging a group dinner *and* the subsequent repayment often ruins your monthly budget data. 

**The blip. Solution:** We implemented **Direction-Aware Settlement**. When a user records a payment in a group, the system checks their `net_balance`:
- If `balance < 0` (User owes): Logged as an **Expense** (Wallet Outflow).
- If `balance > 0` (User is owed): Logged as **Income** (Wallet Recovery).

This ensures that "Social Recoveries" don't inflate your spending metrics, maintaining a true reflection of your net wealth.

---

### The Minimalism
We believe high-quality software is defined by the things you *don't* have to do.
* **Auto-Formatting:** Descriptions are automatically cleaned and capitalized for a professional-looking ledger.
* **Social Graph Simplicity:** Add friends instantly via phone number—no complex invite codes or username searches, just like WhatsApp.
* **Shopping to Spending:** Maintain a shopping list within the app. As you buy items, a single tap converts them into logged expenses, closing the loop between "Planning" and "Spending."
* **Scheduled Reminders:** Recurring bills (Rent, Subscriptions) are kept as scheduled tasks that remind you to log them, ensuring your "Burn Rate" is always accurate.

---
## Setup & Installation

1. **Clone the Repo**
   ```bash
   git clone [https://github.com/shashank-modi/Blip.git](https://github.com/shashank-modi/Blip.git)
   ```

2.  **Install Dependencies**

    ```bash
    npm install
    ```

3.  **Environment Variables**
    Create a `.env` file in the root:

    ```env
    VITE_API_URL=your_api_url
    DATABASE_URL=your_neon_db_url
    ```

4.  **Launch Development Server**

    ```bash
    npm run dev
    ```

---

## Security & Best Practices
Security Considerations and Best Practices at **blip**:

* **Data Integrity:** All financial transactions are ACID-compliant via PostgreSQL, ensuring no data loss during concurrent group updates.
* **Auth & Identity:** Secure session management via Google OAuth 2.0. No passwords are ever stored on our servers.
* **Privacy Controls:** The "Wallet Sync" toggle ensures users have 100% control over which social recoveries or payments impact their private personal budget.
* **API Security:** Protected routes and environment-variable-driven architecture to prevent credential leaks.

---

<div align="center">
Built with 🖤 by Shashank Modi
</div>
