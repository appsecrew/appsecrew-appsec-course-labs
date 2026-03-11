using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace SecureBankingApp.Models;

public class ApplicationUser : IdentityUser
{
    [Required]
    [MaxLength(50)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.Date)]
    public DateTime DateOfBirth { get; set; }

    [Required]
    [MaxLength(11)]
    [Display(Name = "Social Security Number")]
    public string SSN { get; set; } = string.Empty;

    [Required]
    [Display(Name = "Daily Transfer Limit")]
    [DataType(DataType.Currency)]
    public decimal DailyTransferLimit { get; set; } = 5000;

    [Display(Name = "Full Name")]
    public string FullName => $"{FirstName} {LastName}";

    // Navigation properties
    public virtual ICollection<BankAccount> BankAccounts { get; set; } = new List<BankAccount>();
}
