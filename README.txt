NIZFARA DIGITAL STORE — MANUAL PAYMENT REVIEW

This build uses manual payment confirmation for UPI 8078191161@fam.
Customer flow:
1. Customer selects a digital product and enters email.
2. Server creates an order.
3. Customer pays the exact amount to the displayed UPI ID.
4. Customer clicks “I HAVE COMPLETED THE PAYMENT”.
5. Server emails the admin mailbox (ADMIN_EMAIL) with secure YES/NO review links.
6. YES marks the order paid and emails the PDF(s) to the customer.
7. NO marks the order not confirmed and emails the customer a polite notice.

IMPORTANT:
- This does NOT automatically verify UPI payments. The admin must check the receiving account first.
- Do not put a Gmail password in the website. Use a Gmail App Password for SMTP.
- Set a long random ADMIN_SECRET. Do not share the admin review links publicly.
- Keep /courses protected when deploying behind a server; this Node app serves PDFs only as email attachments after approval.

SETUP:
1. Install Node.js 18+.
2. Run: npm install
3. Copy .env.example to .env and fill SMTP_APP_PASSWORD and ADMIN_SECRET.
4. Optional: set PUBLIC_BASE_URL to your deployed HTTPS URL (e.g. https://nizfara.co).
5. Run: npm start
6. Open http://localhost:3000

EMAILS:
Customer support: nizfara.co@gmail.com
Admin/payment review: shihabadamamar34@gmail.com

For production, deploy the Node server on a service that supports environment variables and HTTPS. A custom domain can point to that server.


TROUBLESHOOTING — "Failed to fetch"
If you open public/index.html directly from a phone's file manager/Chrome (a content:// or file:// address), the browser cannot call the Node.js backend. That is why the old build showed "Failed to fetch".
For real payment-review orders and automatic emails, run/deploy the Node server and open the resulting HTTPS website URL. Do not open index.html directly.
