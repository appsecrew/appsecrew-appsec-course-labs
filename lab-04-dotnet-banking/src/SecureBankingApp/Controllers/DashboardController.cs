using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureBankingApp.Data;
using SecureBankingApp.Models;

namespace SecureBankingApp.Controllers;

[Authorize]
public class DashboardController : Controller
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public DashboardController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task<IActionResult> Index()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return RedirectToAction("Login", "Account");

        var accounts = await _context.BankAccounts
            .Where(a => a.UserId == user.Id && a.IsActive)
            .ToListAsync();

        var accountIds = accounts.Select(a => a.Id).ToList();
        var recentTx = await _context.Transactions
            .Where(t => accountIds.Contains(t.FromAccountId) || accountIds.Contains(t.ToAccountId))
            .Include(t => t.FromAccount)
            .Include(t => t.ToAccount)
            .OrderByDescending(t => t.TransactionDate)
            .Take(5)
            .ToListAsync();

        ViewBag.User = user;
        ViewBag.Accounts = accounts;
        ViewBag.RecentTransactions = recentTx;
        ViewBag.TotalBalance = accounts.Sum(a => a.Balance);

        return View();
    }
}
