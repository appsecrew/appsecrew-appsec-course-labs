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
 * Product Controller - INTENTIONALLY VULNERABLE
 *
 * Vulnerabilities:
 * - SQL-002: Error-based SQL injection in product search (name/category parameters concatenated directly)
 * - SQL-004: UNION-based injection possible via search
 * - Information disclosure via verbose error messages
 */
@Controller
@RequestMapping("/products")
public class ProductController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping
    public String listProducts(HttpSession session, Model model) {
        if (!Boolean.TRUE.equals(session.getAttribute("authenticated"))) {
            return "redirect:/auth/login";
        }
        try {
            List<Map<String, Object>> products = jdbcTemplate.queryForList(
                "SELECT p.*, s.name as supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id ORDER BY p.name"
            );
            model.addAttribute("products", products);
        } catch (Exception e) {
            model.addAttribute("error", "Database error: " + e.getMessage());
        }
        return "product/list";
    }

    /**
     * VULNERABLE: SQL-002 - Direct concatenation of search parameters
     *
     * Attack examples:
     *   ?q=' OR '1'='1        → returns all products
     *   ?q=' UNION SELECT id,username,password,email,role,quantity,supplier_id,created_at FROM users --
     *   ?category=' OR '1'='1
     */
    @GetMapping("/search")
    public String searchProducts(@RequestParam(required = false, defaultValue = "") String q,
                                 @RequestParam(required = false, defaultValue = "") String category,
                                 HttpSession session,
                                 Model model) {
        if (!Boolean.TRUE.equals(session.getAttribute("authenticated"))) {
            return "redirect:/auth/login";
        }

        List<Map<String, Object>> products = new ArrayList<>();
        String errorMessage = null;
        String executedSql  = null;

        try {
            // VULNERABLE: Direct SQL concatenation - allows SQL injection
            String sql;
            if (!category.isEmpty()) {
                sql = "SELECT p.*, s.name as supplier_name FROM products p " +
                      "LEFT JOIN suppliers s ON p.supplier_id = s.id " +
                      "WHERE p.category = '" + category + "'";
            } else {
                sql = "SELECT p.*, s.name as supplier_name FROM products p " +
                      "LEFT JOIN suppliers s ON p.supplier_id = s.id " +
                      "WHERE p.name LIKE '%" + q + "%' OR p.description LIKE '%" + q + "%'";
            }

            executedSql = sql;
            System.out.println("[PRODUCT SEARCH SQL] " + sql);
            products = jdbcTemplate.queryForList(sql);

        } catch (Exception e) {
            // VULNERABLE: Full error message with SQL details returned to user
            errorMessage = "Database error: " + e.getMessage();
            System.err.println("[PRODUCT SEARCH ERROR] " + e.getMessage());
        }

        model.addAttribute("products",     products);
        model.addAttribute("query",        q);
        model.addAttribute("category",     category);
        model.addAttribute("error",        errorMessage);
        model.addAttribute("executedSql",  executedSql);  // VULNERABLE: exposes SQL to user
        return "product/search";
    }

    @GetMapping("/{id}")
    public String productDetail(@PathVariable Integer id, HttpSession session, Model model) {
        if (!Boolean.TRUE.equals(session.getAttribute("authenticated"))) {
            return "redirect:/auth/login";
        }
        try {
            // VULNERABLE: ID injected without validation (integer, but still shown as example)
            String sql = "SELECT p.*, s.name as supplier_name, s.contact_email as supplier_email " +
                         "FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id " +
                         "WHERE p.id = " + id;
            System.out.println("[PRODUCT DETAIL SQL] " + sql);
            List<Map<String, Object>> results = jdbcTemplate.queryForList(sql);
            if (results.isEmpty()) {
                model.addAttribute("error", "Product not found (ID=" + id + ")");
            } else {
                model.addAttribute("product", results.get(0));
                // Transaction history for this product
                var history = jdbcTemplate.queryForList(
                    "SELECT it.*, u.username FROM inventory_transactions it " +
                    "LEFT JOIN users u ON it.user_id = u.id " +
                    "WHERE it.product_id = " + id + " ORDER BY it.created_at DESC LIMIT 10"
                );
                model.addAttribute("history", history);
            }
        } catch (Exception e) {
            model.addAttribute("error", "Database error: " + e.getMessage());
        }
        return "product/detail";
    }
}
