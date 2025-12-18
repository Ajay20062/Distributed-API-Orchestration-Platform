# TODO: Fix Sign-In Functionality

## Tasks
- [x] Update login endpoint in server.js to authenticate against the users table in the database instead of hardcoded credentials
- [ ] Test the login functionality to ensure it works with registered users

## Notes
- The signup endpoint already stores users in the database, but login was hardcoded to 'admin'/'password'
- Passwords are stored in plain text (not recommended for production)
- After updating, verify that login works for users created via signup
