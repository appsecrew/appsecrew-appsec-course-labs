using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SecureBankingApp.Data;
using SecureBankingApp.Models;

var builder = WebApplication.CreateBuilder(args);

// Use SQLite for portability (no SQL Server needed)
var connectionString = "Data Source=securebank.db";

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(connectionString));

builder.Services.AddDatabaseDeveloperPageExceptionFilter();

builder.Services.AddDefaultIdentity<ApplicationUser>(options => 
{
    // VULNERABLE: Weak password requirements for testing
    options.SignIn.RequireConfirmedAccount = false;
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequiredLength = 6;
    options.Password.RequiredUniqueChars = 1;
})
.AddRoles<IdentityRole>()
.AddEntityFrameworkStores<ApplicationDbContext>();

builder.Services.AddControllersWithViews();

// VULNERABLE: Disable anti-forgery token validation globally
builder.Services.Configure<AntiforgeryOptions>(options =>
{
    options.SuppressXFrameOptionsHeader = true; // Allows framing for CSRF attacks
    options.Cookie.SameSite = SameSiteMode.None; // Allows cross-site requests
    options.Cookie.SecurePolicy = CookieSecurePolicy.None; // Allows HTTP cookies
});

// VULNERABLE: Overly permissive CORS policy
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseMigrationsEndPoint();
    app.UseDeveloperExceptionPage(); // VULNERABLE: Exposes detailed error information
}
else
{
    app.UseExceptionHandler("/Home/Error");
    // VULNERABLE: HTTPS redirection disabled for testing
    // app.UseHsts();
}

// VULNERABLE: HTTP allowed in production
// app.UseHttpsRedirection();

app.UseStaticFiles();

app.UseRouting();

// VULNERABLE: CORS before authentication
app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

// VULNERABLE: No anti-forgery token validation middleware

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Account}/{action=Login}/{id?}");

app.MapRazorPages();

// Seed database with test data
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        await SeedData.Initialize(services);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred seeding the database.");
    }
}

app.Run();

// Helper class to seed initial data
public static class SeedData
{
    public static async Task Initialize(IServiceProvider serviceProvider)
    {
        using var context = new ApplicationDbContext(
            serviceProvider.GetRequiredService<DbContextOptions<ApplicationDbContext>>());
        context.Database.EnsureCreated();

        var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        // Create roles
        string[] roleNames = { "Admin", "Customer" };
        foreach (var roleName in roleNames)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new IdentityRole(roleName));
            }
        }

        // Create admin user
        var adminEmail = "admin@securebank.com";
        var adminUser = await userManager.FindByEmailAsync(adminEmail);
        if (adminUser == null)
        {
            adminUser = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                FirstName = "System",
                LastName = "Administrator",
                DateOfBirth = new DateTime(1980, 1, 1),
                SSN = "123-45-6789",
                DailyTransferLimit = 50000,
                EmailConfirmed = true
            };
            await userManager.CreateAsync(adminUser, "Admin123!");
            await userManager.AddToRoleAsync(adminUser, "Admin");
        }

        // Create Alice (test customer 1)
        var aliceEmail = "alice@securebank.com";
        var aliceUser = await userManager.FindByEmailAsync(aliceEmail);
        if (aliceUser == null)
        {
            aliceUser = new ApplicationUser
            {
                UserName = aliceEmail, Email = aliceEmail,
                FirstName = "Alice", LastName = "Smith",
                DateOfBirth = new DateTime(1990, 3, 15),
                SSN = "111-22-3333", DailyTransferLimit = 5000, EmailConfirmed = true
            };
            await userManager.CreateAsync(aliceUser, "Alice123!");
            await userManager.AddToRoleAsync(aliceUser, "Customer");
        }

        // Create Bob (test customer 2)
        var bobEmail = "bob@securebank.com";
        var bobUser = await userManager.FindByEmailAsync(bobEmail);
        if (bobUser == null)
        {
            bobUser = new ApplicationUser
            {
                UserName = bobEmail, Email = bobEmail,
                FirstName = "Bob", LastName = "Jones",
                DateOfBirth = new DateTime(1985, 7, 22),
                SSN = "444-55-6666", DailyTransferLimit = 10000, EmailConfirmed = true
            };
            await userManager.CreateAsync(bobUser, "Bob123!");
            await userManager.AddToRoleAsync(bobUser, "Customer");
        }

        // Create legacy user account
        var userEmail = "user@securebank.com";
        var customerUser = await userManager.FindByEmailAsync(userEmail);
        if (customerUser == null)
        {
            customerUser = new ApplicationUser
            {
                UserName = userEmail, Email = userEmail,
                FirstName = "John", LastName = "Doe",
                DateOfBirth = new DateTime(1988, 5, 15),
                SSN = "987-65-4321", DailyTransferLimit = 5000, EmailConfirmed = true
            };
            await userManager.CreateAsync(customerUser, "User123!");
            await userManager.AddToRoleAsync(customerUser, "Customer");
        }

        // Create test accounts if they don't exist
        if (!context.BankAccounts.Any())
        {
            var accounts = new[]
            {
                new BankAccount { AccountNumber = "ADMIN001", UserId = adminUser.Id,    Balance = 100000, AccountType = "Checking", IsActive = true, CreatedDate = DateTime.UtcNow },
                new BankAccount { AccountNumber = "USER001",  UserId = customerUser.Id,  Balance = 2500,   AccountType = "Checking", IsActive = true, CreatedDate = DateTime.UtcNow },
                new BankAccount { AccountNumber = "ALICE001", UserId = aliceUser?.Id ?? adminUser.Id, Balance = 3500, AccountType = "Checking", IsActive = true, CreatedDate = DateTime.UtcNow },
                new BankAccount { AccountNumber = "ALICE002", UserId = aliceUser?.Id ?? adminUser.Id, Balance = 15000, AccountType = "Savings", IsActive = true, CreatedDate = DateTime.UtcNow },
                new BankAccount { AccountNumber = "BOB001",   UserId = bobUser?.Id ?? adminUser.Id,   Balance = 8750,  AccountType = "Checking", IsActive = true, CreatedDate = DateTime.UtcNow },
            };
            context.BankAccounts.AddRange(accounts);
            await context.SaveChangesAsync();
        }
    }
}
