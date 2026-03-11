package com.secureshop.inventory.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import javax.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.Map;

@Controller
public class HomeController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/")
    public String root(HttpSession session) {
        if (Boolean.TRUE.equals(session.getAttribute("authenticated"))) {
            return "redirect:/dashboard";
        }
        return "redirect:/auth/login";
    }

    @GetMapping("/dashboard")
    public String dashboard(HttpSession session, Model model) {
        if (!Boolean.TRUE.equals(session.getAttribute("authenticated"))) {
            return "redirect:/auth/login";
        }

        // Gather dashboard stats
        try {
            Integer productCount  = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM products", Integer.class);
            Integer supplierCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM suppliers WHERE is_active = TRUE", Integer.class);
            Integer userCount     = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users WHERE enabled = TRUE", Integer.class);
            Integer lowStockCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM products WHERE quantity < 20", Integer.class);

            model.addAttribute("productCount",  productCount);
            model.addAttribute("supplierCount", supplierCount);
            model.addAttribute("userCount",     userCount);
            model.addAttribute("lowStockCount", lowStockCount);

            // Recent transactions
            var recentTransactions = jdbcTemplate.queryForList(
                "SELECT it.id, p.name as product_name, it.quantity_change, it.transaction_type, it.notes, it.created_at " +
                "FROM inventory_transactions it JOIN products p ON it.product_id = p.id " +
                "ORDER BY it.created_at DESC LIMIT 5"
            );
            model.addAttribute("recentTransactions", recentTransactions);

        } catch (Exception e) {
            // VULNERABLE: expose DB errors
            model.addAttribute("dbError", e.getMessage());
        }

        model.addAttribute("username", session.getAttribute("username"));
        model.addAttribute("role",     session.getAttribute("role"));
        return "dashboard";
    }

    @GetMapping("/lab-guide")
    public String labGuide(Model model) {
        return "lab-guide";
    }
}
