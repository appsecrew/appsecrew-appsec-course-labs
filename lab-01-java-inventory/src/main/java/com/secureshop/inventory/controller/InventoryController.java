package com.secureshop.inventory.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;

/**
 * Inventory Controller - INTENTIONALLY VULNERABLE
 *
 * Vulnerabilities:
 * - SQL-003: Blind SQL injection via date range parameters in report generation
 * - Second-order SQL injection via notes field
 */
@Controller
@RequestMapping("/inventory")
public class InventoryController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping
    public String inventoryList(HttpSession session, Model model) {
        if (!Boolean.TRUE.equals(session.getAttribute("authenticated"))) {
            return "redirect:/auth/login";
        }
        try {
            List<Map<String, Object>> items = jdbcTemplate.queryForList(
                "SELECT p.id, p.name, p.category, p.quantity, p.price, " +
                "CASE WHEN p.quantity < 10 THEN 'CRITICAL' WHEN p.quantity < 20 THEN 'LOW' ELSE 'OK' END as stock_status " +
                "FROM products p ORDER BY p.quantity ASC"
            );
            model.addAttribute("items", items);
        } catch (Exception e) {
            model.addAttribute("error", "Database error: " + e.getMessage());
        }
        return "inventory/list";
    }

    /**
     * VULNERABLE: SQL-003 - Blind SQL injection in date-range report
     *
     * Attack examples:
     *   startDate=2024-01-01' AND SLEEP(5) --
     *   startDate=2024-01-01' AND 1=2 --  (returns no results if condition false)
     *   transactionType=' OR '1'='1
     */
    @GetMapping("/report")
    public String inventoryReport(
            @RequestParam(required = false, defaultValue = "2020-01-01") String startDate,
            @RequestParam(required = false, defaultValue = "2099-12-31") String endDate,
            @RequestParam(required = false, defaultValue = "")            String transactionType,
            HttpSession session,
            Model model) {

        if (!Boolean.TRUE.equals(session.getAttribute("authenticated"))) {
            return "redirect:/auth/login";
        }

        try {
            // VULNERABLE: Date and type parameters concatenated directly
            String sql = "SELECT it.id, p.name as product_name, it.quantity_change, " +
                         "it.transaction_type, it.notes, it.created_at, u.username " +
                         "FROM inventory_transactions it " +
                         "JOIN products p ON it.product_id = p.id " +
                         "LEFT JOIN users u ON it.user_id = u.id " +
                         "WHERE it.created_at >= '" + startDate + "' " +
                         "AND it.created_at <= '" + endDate + "'";

            if (!transactionType.isEmpty()) {
                // VULNERABLE: second injectable parameter
                sql += " AND it.transaction_type = '" + transactionType + "'";
            }
            sql += " ORDER BY it.created_at DESC";

            System.out.println("[INVENTORY REPORT SQL] " + sql);
            List<Map<String, Object>> report = jdbcTemplate.queryForList(sql);

            model.addAttribute("report",           report);
            model.addAttribute("startDate",        startDate);
            model.addAttribute("endDate",          endDate);
            model.addAttribute("transactionType",  transactionType);
            model.addAttribute("executedSql",      sql);  // VULNERABLE: exposes SQL

        } catch (Exception e) {
            model.addAttribute("error", "Report error: " + e.getMessage());
        }

        return "inventory/report";
    }

    /**
     * VULNERABLE: SQL injection in stock adjustment notes field
     */
    @PostMapping("/adjust")
    public String adjustStock(
            @RequestParam Integer productId,
            @RequestParam Integer quantityChange,
            @RequestParam String transactionType,
            @RequestParam(required = false, defaultValue = "") String notes,
            HttpSession session,
            Model model) {

        if (!Boolean.TRUE.equals(session.getAttribute("authenticated"))) {
            return "redirect:/auth/login";
        }

        try {
            Integer userId = (Integer) session.getAttribute("userId");

            // VULNERABLE: notes parameter injected without sanitization (second-order SQLi)
            String sql = "INSERT INTO inventory_transactions " +
                         "(product_id, quantity_change, transaction_type, notes, user_id) VALUES (" +
                         productId + ", " + quantityChange + ", '" + transactionType + "', '" + notes + "', " + userId + ")";

            System.out.println("[INVENTORY ADJUST SQL] " + sql);
            jdbcTemplate.update(sql);

            // Update product quantity
            String updateSql = "UPDATE products SET quantity = quantity + " + quantityChange +
                               " WHERE id = " + productId;
            jdbcTemplate.update(updateSql);

            model.addAttribute("success", "Stock adjusted successfully");
        } catch (Exception e) {
            model.addAttribute("error", "Adjustment error: " + e.getMessage());
        }

        return "redirect:/inventory";
    }
}
