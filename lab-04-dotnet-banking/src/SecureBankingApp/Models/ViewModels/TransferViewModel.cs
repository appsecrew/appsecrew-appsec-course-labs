using Microsoft.AspNetCore.Mvc.Rendering;
using System.ComponentModel.DataAnnotations;

namespace SecureBankingApp.Models.ViewModels;

public class TransferViewModel
{
    [Required(ErrorMessage = "Please select a source account")]
    [Display(Name = "From Account")]
    public string FromAccountNumber { get; set; } = string.Empty;

    [Required(ErrorMessage = "Please select a destination account")]
    [Display(Name = "To Account")]
    public string ToAccountNumber { get; set; } = string.Empty;

    [Required(ErrorMessage = "Please enter an amount")]
    [Range(0.01, 50000, ErrorMessage = "Amount must be between $0.01 and $50,000")]
    [DataType(DataType.Currency)]
    public decimal Amount { get; set; }

    [MaxLength(200, ErrorMessage = "Description cannot exceed 200 characters")]
    public string? Description { get; set; }

    // For dropdown population
    public List<SelectListItem> UserAccounts { get; set; } = new List<SelectListItem>();
    public List<SelectListItem> AllAccounts { get; set; } = new List<SelectListItem>();
}

public class ScheduleTransferViewModel
{
    [Required]
    public int FromAccountId { get; set; }

    [Required]
    public int ToAccountId { get; set; }

    [Required]
    [Range(0.01, 50000)]
    [DataType(DataType.Currency)]
    public decimal Amount { get; set; }

    [MaxLength(200)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [Display(Name = "Schedule Date")]
    [DataType(DataType.DateTime)]
    public DateTime ScheduledDate { get; set; } = DateTime.Now.AddDays(1);
}

public class ProfileUpdateViewModel
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Phone]
    [Display(Name = "Phone Number")]
    public string? PhoneNumber { get; set; }

    [Required]
    [Display(Name = "First Name")]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [Display(Name = "Last Name")]
    public string LastName { get; set; } = string.Empty;

    [Range(100, 50000)]
    [Display(Name = "Daily Transfer Limit")]
    [DataType(DataType.Currency)]
    public decimal DailyTransferLimit { get; set; }
}

public class ChangePasswordViewModel
{
    [Required]
    [DataType(DataType.Password)]
    [Display(Name = "Current Password")]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.Password)]
    [Display(Name = "New Password")]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.Password)]
    [Display(Name = "Confirm New Password")]
    [Compare("NewPassword", ErrorMessage = "Passwords do not match")]
    public string ConfirmPassword { get; set; } = string.Empty;
}
