using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecureBankingApp.Models;

public class Transaction
{
    public int Id { get; set; }

    [Required]
    [Display(Name = "From Account")]
    public int FromAccountId { get; set; }

    [Required]
    [Display(Name = "To Account")]
    public int ToAccountId { get; set; }

    [Required]
    [DataType(DataType.Currency)]
    [Column(TypeName = "decimal(18,2)")]
    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
    public decimal Amount { get; set; }

    [MaxLength(200)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [Display(Name = "Transaction Date")]
    [DataType(DataType.DateTime)]
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;

    [Required]
    public TransactionStatus Status { get; set; } = TransactionStatus.Pending;

    [MaxLength(500)]
    [Display(Name = "Status Message")]
    public string StatusMessage { get; set; } = string.Empty;

    // Navigation properties
    public virtual BankAccount? FromAccount { get; set; }
    public virtual BankAccount? ToAccount { get; set; }
}

public enum TransactionStatus
{
    Pending,
    Completed,
    Failed,
    Cancelled
}
