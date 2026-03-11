using System.ComponentModel.DataAnnotations;

namespace SecureBankingApp.Models.ViewModels;

public class BillPaymentViewModel
{
    [Required]
    public string FromAccountNumber { get; set; } = string.Empty;

    [Required]
    [Display(Name = "Biller Code")]
    public string BillerCode { get; set; } = string.Empty;

    [Required]
    [Range(0.01, 100000)]
    [DataType(DataType.Currency)]
    public decimal Amount { get; set; }

    public string Description { get; set; } = string.Empty;
}

public class ScheduleTransferViewModel
{
    public int FromAccountId { get; set; }
    public int ToAccountId { get; set; }

    [Required]
    [Range(0.01, 1000000)]
    [DataType(DataType.Currency)]
    public decimal Amount { get; set; }

    public string Description { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.Date)]
    public DateTime ScheduledDate { get; set; } = DateTime.UtcNow.AddDays(1);
}
