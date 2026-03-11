package com.secureshop.inventory.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpSession;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Supplier Controller - INTENTIONALLY VULNERABLE
 *
 * Vulnerabilities:
 * - SQL-004: UNION-based SQL injection in supplier lookup
 */
@Controller
@RequestMapping("/suppliers")
public class SupplierController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping
    public String supplierList(HttpSession session, Model model) {
        if (!Boolean.TRUE.equals(session.getAttribute("authenticated"))) {
            return "redirect:/auth/login";
        }
        try {
            List<Map<String, Object>> suppliers = jdbcTemplate.queryForList(
                "SELECT * FROM suppliers WHERE is_active = TRUE ORDER BY name"
            );
            model.addAttribute("suppliers", suppliers);
        } catch (Exception e) {
            model.addAttribute("error", "Database error: " + e.getMessage());
        }
        return "supplier/list";
    }

    /**
     * VULNERABLE: SQL-004 - UNION-based injection in supplier lookup
     *
     * Attack examples:
     *   ?q=' UNION SELECT id,username,password,email,role,phone,address,is_active,created_at FROM users --
     *   ?q=' UNION SELECT 1,2,3,4,5,6,7,8,9 --  (column count enumeration)
     *   ?q='; DROP TABLE suppliers; --
     */
    @GetMapping("/search")
    public String searchSuppliers(
            @RequestParam(required = false, defaultValue = "") String q,
            HttpSession session,
            Model model) {

        if (!Boolean.TRUE.equals(session.getAttribute("authenticated"))) {
            return "redirect:/auth/login";
        }

        List<Map<String, Object>> suppliers = new ArrayList<>();
        String errorMessage = null;
        String executedSql  = null;

        try {
            // VULNERABLE: direct string concatenation allows UNION injection
            String sql = "SELECT id, name, contact_email, phone, address, is_active, created_at " +
                         "FROM suppliers WHERE name LIKE '%" + q + "%' OR contact_email LIKE '%" + q + "%'";

            executedSql = sql;
            System.out.println("[SUPPLIER SEARCH SQL] " + sql);
            suppliers = jdbcTemplate.queryForList(sql);

        } catch (Exception e) {
            // VULNERABLE: expose full DB error
            errorMessage = "Database error: " + e.getMessage();
            System.err.println("[SUPPLIER SEARCH ERROR] " + e.getMessage());
        }

        model.addAttribute("suppliers",   suppliers);
        model.addAttribute("query",       q);
        model.addAttribute("error",       errorMessage);
        model.addAttribute("executedSql", executedSql);
        return "supplier/list";
    }
}
