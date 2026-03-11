using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureBankingApp.Data;
using SecureBankingApp.Models;
using SecureBankingApp.Models.ViewModels;

namespace SecureBankingApp.Controllers;

[Authorize]
public class BillPaymentController : Controller
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ILogger<BillPaymentController> _logger;

    public BillPaymentController(ApplicationDbContext context, UserManager<ApplicationUser> userManager, ILogger<BillPaymentController> logger)
    {
        _context = context;
        _userManager = userManager;
        _logger = logger;
    }

    public async Task<IActionResult> Index()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return RedirectToAction("Login", "Account");

        var accounts = await _context.BankAccounts
            .Where(a => a.UserId == user.Id && a.IsActive)
            .ToListAsync();

        ViewBag.Accounts = accounts;
        return View();
    }

    // VULNERABLE: Missing [ValidateAntiForgeryToken] - CSRF possible
    [HttpPost]
    public async Task<IActionResult> Pay(BillPaymentViewModel model)
    {
        _logger.LogWarning("CSRF VULNERABILITY: Bill payment processed without anti-forgery token");

        if (!ModelState.IsValid)
        {
            var user2 = await _userManager.GetUserAsync(User);
            ViewBag.Accounts = await _context.BankAccounts
                .Where(a => a.UserId == user2!.Id && a.IsActive).ToListAsync();
            return View("Index", model);
        }

        var currentUser = await _userManager.GetUserAsync(User);
        if (currentUser == null) return RedirectToAction("Login", "Account");

        var account = await _context.BankAccounts
            .FirstOrDefaultAsync(a => a.AccountNumber == model.FromAccountNumber && a.UserId == currentUser.Id);

        if (account == null)
        {
            TempData["Error"] = "Account not found or not yours";
            return RedirectToAction("Index");
        }

        if (account.Balance < model.Amount)
        {
            TempData["Error"] = "Insufficient balance";
            return RedirectToAction("Index");
        }

        // SECURITY ISSUE: Process without CSRF validation
        account.Balance -= model.Amount;
        _context.Transactions.Add(new Transaction
        {
            FromAccountId = account.Id,
            ToAccountId = account.Id, // bill payment
            Amount = model.Amount,
            Description = $"Bill Payment: {model.BillerCode} - {model.Description}",
            TransactionDate = DateTime.UtcNow,
            Status = TransactionStatus.Completed,
            StatusMessage = "Bill payment processed"
        });
        await _context.SaveChangesAsync();

        _logger.LogInformation("CSRF ATTACK: Bill payment of {amount} to {biller}", model.Amount, model.BillerCode);
        TempData["Success"] = $"Payment of {model.Amount:C} to {model.BillerCode} completed";
        return RedirectToAction("Index", "Dashboard");
    }
}
