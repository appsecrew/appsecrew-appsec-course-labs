using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using SecureBankingApp.Data;
using SecureBankingApp.Models;
using SecureBankingApp.Models.ViewModels;

namespace SecureBankingApp.Controllers;

[Authorize]
public class TransferController : Controller
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ILogger<TransferController> _logger;

    public TransferController(
        ApplicationDbContext context, 
        UserManager<ApplicationUser> userManager,
        ILogger<TransferController> logger)
    {
        _context = context;
        _userManager = userManager;
        _logger = logger;
    }

    public async Task<IActionResult> Index()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
            return RedirectToAction("Login", "Account");

        var userAccounts = await _context.BankAccounts
            .Where(a => a.UserId == user.Id && a.IsActive)
            .ToListAsync();

        var allAccounts = await _context.BankAccounts
            .Where(a => a.IsActive)
            .Include(a => a.User)
            .ToListAsync();

        var model = new TransferViewModel
        {
            UserAccounts = userAccounts.Select(a => new SelectListItem
            {
                Value = a.AccountNumber,
                Text = $"{a.AccountNumber} - {a.AccountType} (${a.Balance:N2})"
            }).ToList(),
            AllAccounts = allAccounts.Select(a => new SelectListItem
            {
                Value = a.AccountNumber,
                Text = $"{a.AccountNumber} - {a.User?.FullName} ({a.AccountType})"
            }).ToList()
        };

        return View(model);
    }

    // VULNERABLE: Missing [ValidateAntiForgeryToken] attribute
    [HttpPost]
    public async Task<IActionResult> Send(TransferViewModel model)
    {
        _logger.LogWarning("CSRF VULNERABILITY: Transfer initiated without anti-forgery token validation");
        _logger.LogInformation($"Transfer request: {model.Amount:C} from {model.FromAccountNumber} to {model.ToAccountNumber}");

        if (!ModelState.IsValid)
        {
            await PopulateAccountDropdowns(model);
            return View("Index", model);
        }

        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            TempData["Error"] = "User not found";
            return RedirectToAction("Index");
        }

        // Find source and destination accounts
        var fromAccount = await _context.BankAccounts
            .FirstOrDefaultAsync(a => a.AccountNumber == model.FromAccountNumber);

        var toAccount = await _context.BankAccounts
            .FirstOrDefaultAsync(a => a.AccountNumber == model.ToAccountNumber);

        if (fromAccount == null || toAccount == null)
        {
            TempData["Error"] = "Invalid account numbers";
            await PopulateAccountDropdowns(model);
            return View("Index", model);
        }

        // VULNERABLE: Only basic authorization check, no CSRF protection
        if (fromAccount.UserId != user.Id)
        {
            _logger.LogWarning($"Unauthorized transfer attempt by user {user.Email} from account {fromAccount.AccountNumber}");
            TempData["Error"] = "You can only transfer from your own accounts";
            await PopulateAccountDropdowns(model);
            return View("Index", model);
        }

        // Check daily transfer limit
        var today = DateTime.UtcNow.Date;
        var dailyTransfers = await _context.Transactions
            .Where(t => t.FromAccountId == fromAccount.Id && 
                       t.TransactionDate.Date == today &&
                       t.Status == TransactionStatus.Completed)
            .SumAsync(t => t.Amount);

        if (dailyTransfers + model.Amount > user.DailyTransferLimit)
        {
            TempData["Error"] = $"Transfer exceeds daily limit of {user.DailyTransferLimit:C}";
            await PopulateAccountDropdowns(model);
            return View("Index", model);
        }

        // Check sufficient balance
        if (fromAccount.Balance < model.Amount)
        {
            TempData["Error"] = "Insufficient balance";
            await PopulateAccountDropdowns(model);
            return View("Index", model);
        }

        // SECURITY ISSUE: Process transfer without CSRF validation
        try
        {
            // Create transaction record
            var transaction = new Transaction
            {
                FromAccountId = fromAccount.Id,
                ToAccountId = toAccount.Id,
                Amount = model.Amount,
                Description = model.Description ?? "Money transfer",
                TransactionDate = DateTime.UtcNow,
                Status = TransactionStatus.Completed,
                StatusMessage = "Transfer completed successfully"
            };

            // Update account balances
            fromAccount.Balance -= model.Amount;
            toAccount.Balance += model.Amount;

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"CSRF ATTACK SUCCESSFUL: Transfer of {model.Amount:C} completed from {model.FromAccountNumber} to {model.ToAccountNumber}");

            TempData["Success"] = $"Successfully transferred {model.Amount:C} to account {model.ToAccountNumber}";
            return RedirectToAction("History");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Transfer failed");
            TempData["Error"] = "Transfer failed. Please try again.";
            await PopulateAccountDropdowns(model);
            return View("Index", model);
        }
    }

    // VULNERABLE: Schedule transfer without CSRF protection
    [HttpPost]
    public async Task<IActionResult> Schedule(ScheduleTransferViewModel model)
    {
        _logger.LogWarning("CSRF VULNERABILITY: Scheduled transfer without anti-forgery token validation");

        if (!ModelState.IsValid)
        {
            TempData["Error"] = "Invalid schedule transfer data";
            return RedirectToAction("Index");
        }

        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return RedirectToAction("Login", "Account");
        }

        // SECURITY ISSUE: No CSRF protection for scheduled transfers
        var transaction = new Transaction
        {
            FromAccountId = model.FromAccountId,
            ToAccountId = model.ToAccountId,
            Amount = model.Amount,
            Description = $"Scheduled: {model.Description}",
            TransactionDate = model.ScheduledDate,
            Status = TransactionStatus.Pending,
            StatusMessage = "Scheduled for future processing"
        };

        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"CSRF ATTACK: Scheduled transfer created for {model.Amount:C} on {model.ScheduledDate}");

        TempData["Success"] = "Transfer scheduled successfully";
        return RedirectToAction("History");
    }

    public async Task<IActionResult> History()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
            return RedirectToAction("Login", "Account");

        var userAccountIds = await _context.BankAccounts
            .Where(a => a.UserId == user.Id)
            .Select(a => a.Id)
            .ToListAsync();

        var transactions = await _context.Transactions
            .Where(t => userAccountIds.Contains(t.FromAccountId) || userAccountIds.Contains(t.ToAccountId))
            .Include(t => t.FromAccount)
            .Include(t => t.ToAccount)
            .OrderByDescending(t => t.TransactionDate)
            .Take(50)
            .ToListAsync();

        return View(transactions);
    }

    // VULNERABLE: Quick transfer endpoint for mobile/API usage
    [HttpPost]
    public async Task<IActionResult> QuickTransfer(decimal amount, string toAccount)
    {
        _logger.LogWarning("CSRF VULNERABILITY: Quick transfer without protection");

        var user = await _userManager.GetUserAsync(User);
        if (user == null)
            return Json(new { success = false, message = "Unauthorized" });

        var fromAccount = await _context.BankAccounts
            .Where(a => a.UserId == user.Id && a.IsActive)
            .FirstOrDefaultAsync();

        var destinationAccount = await _context.BankAccounts
            .FirstOrDefaultAsync(a => a.AccountNumber == toAccount);

        if (fromAccount == null || destinationAccount == null)
            return Json(new { success = false, message = "Invalid accounts" });

        if (fromAccount.Balance < amount)
            return Json(new { success = false, message = "Insufficient balance" });

        // SECURITY ISSUE: No CSRF validation for JSON endpoint
        fromAccount.Balance -= amount;
        destinationAccount.Balance += amount;

        var transaction = new Transaction
        {
            FromAccountId = fromAccount.Id,
            ToAccountId = destinationAccount.Id,
            Amount = amount,
            Description = "Quick transfer",
            Status = TransactionStatus.Completed
        };

        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"CSRF ATTACK: Quick transfer of {amount:C} to {toAccount}");

        return Json(new { 
            success = true, 
            message = $"Transferred {amount:C} successfully",
            newBalance = fromAccount.Balance
        });
    }

    private async Task PopulateAccountDropdowns(TransferViewModel model)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user != null)
        {
            var userAccounts = await _context.BankAccounts
                .Where(a => a.UserId == user.Id && a.IsActive)
                .ToListAsync();

            var allAccounts = await _context.BankAccounts
                .Where(a => a.IsActive)
                .Include(a => a.User)
                .ToListAsync();

            model.UserAccounts = userAccounts.Select(a => new SelectListItem
            {
                Value = a.AccountNumber,
                Text = $"{a.AccountNumber} - {a.AccountType} (${a.Balance:N2})"
            }).ToList();

            model.AllAccounts = allAccounts.Select(a => new SelectListItem
            {
                Value = a.AccountNumber,
                Text = $"{a.AccountNumber} - {a.User?.FullName} ({a.AccountType})"
            }).ToList();
        }
    }
}
