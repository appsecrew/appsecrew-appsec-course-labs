using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureBankingApp.Data;
using SecureBankingApp.Models;

namespace SecureBankingApp.Controllers;

[Authorize(Roles = "Admin")]
public class AdminController : Controller
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ILogger<AdminController> _logger;

    public AdminController(ApplicationDbContext context, UserManager<ApplicationUser> userManager, ILogger<AdminController> logger)
    {
        _context = context;
        _userManager = userManager;
        _logger = logger;
    }

    public async Task<IActionResult> Index()
    {
        var allUsers = await _userManager.Users.Include(u => u.BankAccounts).ToListAsync();
        var allAccounts = await _context.BankAccounts.Include(a => a.User).ToListAsync();
        ViewBag.AllUsers = allUsers;
        ViewBag.AllAccounts = allAccounts;
        return View();
    }

    // VULNERABLE: No [ValidateAntiForgeryToken] - susceptible to CSRF
    [HttpPost]
    public async Task<IActionResult> FreezeAccount(string accountId)
    {
        _logger.LogWarning("CSRF VULNERABILITY: FreezeAccount called without CSRF validation - accountId: {id}", accountId);

        var account = await _context.BankAccounts
            .FirstOrDefaultAsync(a => a.AccountNumber == accountId || a.Id.ToString() == accountId);

        if (account == null)
        {
            TempData["Error"] = "Account not found";
            return RedirectToAction("Index");
        }

        account.IsActive = false;
        await _context.SaveChangesAsync();

        _logger.LogInformation("CSRF ATTACK: Account {id} frozen via CSRF", accountId);
        TempData["Success"] = $"Account {accountId} has been frozen";
        return RedirectToAction("Index");
    }

    // VULNERABLE: No [ValidateAntiForgeryToken]
    [HttpPost]
    public async Task<IActionResult> AdjustBalance(string accountId, decimal amount, string reason)
    {
        _logger.LogWarning("CSRF VULNERABILITY: AdjustBalance called without validation");

        var account = await _context.BankAccounts
            .FirstOrDefaultAsync(a => a.AccountNumber == accountId);

        if (account == null)
        {
            TempData["Error"] = "Account not found";
            return RedirectToAction("Index");
        }

        account.Balance += amount;
        await _context.SaveChangesAsync();

        TempData["Success"] = $"Balance adjusted by {amount:C} for account {accountId}";
        return RedirectToAction("Index");
    }
}
