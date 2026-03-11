using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecureBankingApp.Models;

public class BankAccount
{
    public int Id { get; set; }

    [Required]
    [MaxLength(20)]
    [Display(Name = "Account Number")]
    public string AccountNumber { get; set; } = string.Empty;

    [Required]
    [Display(Name = "User")]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.Currency)]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Balance { get; set; }

    [Required]
    [MaxLength(50)]
    [Display(Name = "Account Type")]
    public string AccountType { get; set; } = string.Empty;

    [Display(Name = "Active")]
    public bool IsActive { get; set; } = true;

    [Display(Name = "Created Date")]
    [DataType(DataType.DateTime)]
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual ApplicationUser? User { get; set; }
    public virtual ICollection<Transaction> FromTransactions { get; set; } = new List<Transaction>();
    public virtual ICollection<Transaction> ToTransactions { get; set; } = new List<Transaction>();
}
