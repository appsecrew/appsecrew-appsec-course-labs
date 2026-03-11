package com.secureshop.inventory.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpSession;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

/**
 * Authentication Controller - INTENTIONALLY VULNERABLE
 * 
 * This controller contains multiple SQL injection vulnerabilities
 * for educational purposes. DO NOT use this code in production.
 * 
 * Vulnerabilities:
 * - SQL injection in login authentication
 * - Information disclosure through error messages
 * - Weak session management
 * 
 * @author AppSec Training Team
 */
@Controller
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * Display login page
     */
    @GetMapping("/login")
    public String loginPage() {
        return "auth/login";
    }

    /**
     * VULNERABLE: SQL Injection in Authentication
     * 
     * This method is intentionally vulnerable to SQL injection attacks.
     * User input is directly concatenated into the SQL query without
     * any validation or parameterization.
     * 
     * Attack examples:
     * - Username: admin' OR '1'='1' --
     * - Username: admin' UNION SELECT 1,2,3,4,5,6 --
     */
    @PostMapping("/login")
    public String authenticate(@RequestParam String username, 
                              @RequestParam String password, 
                              HttpSession session,
                              Model model) {
        try {
            // VULNERABLE: Direct SQL concatenation - allows SQL injection
            String sql = "SELECT id, username, email, role, enabled, last_login " +
                        "FROM users WHERE username = '" + username + 
                        "' AND password = '" + password + "'";
            
            System.out.println("Executing SQL: " + sql); // Debug output - security issue
            
            List<Map<String, Object>> users = jdbcTemplate.queryForList(sql);
            
            if (!users.isEmpty()) {
                Map<String, Object> user = users.get(0);
                
                // Check if user is enabled
                Boolean enabled = (Boolean) user.get("enabled");
                if (enabled == null || !enabled) {
                    model.addAttribute("error", "Account is disabled");
                    return "auth/login";
                }
                
                // Set session attributes - weak session management
                session.setAttribute("userId", user.get("id"));
                session.setAttribute("username", user.get("username"));
                session.setAttribute("role", user.get("role"));
                session.setAttribute("authenticated", true);
                
                // Update last login - another SQL injection opportunity
                updateLastLogin(username);
                
                return "redirect:/dashboard";
            } else {
                model.addAttribute("error", "Invalid username or password");
                return "auth/login";
            }
            
        } catch (Exception e) {
            // VULNERABLE: Information disclosure through error messages
            model.addAttribute("error", "Database error: " + e.getMessage());
            model.addAttribute("sqlState", getSQLState(e));
            model.addAttribute("errorCode", getErrorCode(e));
            
            // Log the full stack trace - information disclosure
            e.printStackTrace();
            
            return "auth/login";
        }
    }

    /**
     * VULNERABLE: Another SQL injection point in update query
     */
    private void updateLastLogin(String username) {
        try {
            // VULNERABLE: SQL injection in UPDATE statement
            String updateSql = "UPDATE users SET last_login = NOW() WHERE username = '" + username + "'";
            jdbcTemplate.update(updateSql);
        } catch (Exception e) {
            // Silently fail - but log the error for debugging
            System.err.println("Failed to update last login: " + e.getMessage());
        }
    }

    /**
     * VULNERABLE: User registration with SQL injection
     */
    @PostMapping("/register")
    public String register(@RequestParam String username,
                          @RequestParam String password,
                          @RequestParam String email,
                          Model model) {
        try {
            // Check if user already exists - vulnerable query
            String checkSql = "SELECT COUNT(*) FROM users WHERE username = '" + username + 
                              "' OR email = '" + email + "'";
            
            Integer count = jdbcTemplate.queryForObject(checkSql, Integer.class);
            
            if (count > 0) {
                model.addAttribute("error", "Username or email already exists");
                return "auth/register";
            }
            
            // VULNERABLE: SQL injection in INSERT statement
            String insertSql = "INSERT INTO users (username, password, email, role, enabled) VALUES ('" +
                              username + "', '" + password + "', '" + email + "', 'USER', true)";
            
            jdbcTemplate.update(insertSql);
            
            model.addAttribute("success", "Registration successful! Please login.");
            return "auth/login";
            
        } catch (Exception e) {
            // VULNERABLE: Detailed error information disclosure
            model.addAttribute("error", "Registration failed: " + e.getMessage());
            return "auth/register";
        }
    }

    /**
     * Display registration page
     */
    @GetMapping("/register")
    public String registerPage() {
        return "auth/register";
    }

    /**
     * VULNERABLE: Password reset with SQL injection
     */
    @PostMapping("/reset-password")
    public String resetPassword(@RequestParam String username,
                               @RequestParam String email,
                               Model model) {
        try {
            // VULNERABLE: SQL injection in password reset
            String sql = "SELECT id, username, email FROM users WHERE username = '" + 
                        username + "' AND email = '" + email + "'";
            
            List<Map<String, Object>> users = jdbcTemplate.queryForList(sql);
            
            if (!users.isEmpty()) {
                // Generate temporary password - weak implementation
                String tempPassword = "temp123";
                
                // VULNERABLE: SQL injection in password update
                String updateSql = "UPDATE users SET password = '" + tempPassword + 
                                  "' WHERE username = '" + username + "'";
                
                jdbcTemplate.update(updateSql);
                
                model.addAttribute("success", "Temporary password set to: " + tempPassword);
            } else {
                model.addAttribute("error", "User not found");
            }
            
        } catch (Exception e) {
            model.addAttribute("error", "Password reset failed: " + e.getMessage());
        }
        
        return "auth/reset-password";
    }

    /**
     * Display password reset page
     */
    @GetMapping("/reset-password")
    public String resetPasswordPage() {
        return "auth/reset-password";
    }

    /**
     * Logout functionality
     */
    @GetMapping("/logout")
    public String logout(HttpSession session) {
        // Weak session management - should invalidate session properly
        session.removeAttribute("userId");
        session.removeAttribute("username");
        session.removeAttribute("role");
        session.removeAttribute("authenticated");
        
        return "redirect:/auth/login?logout=true";
    }

    /**
     * VULNERABLE: Admin backdoor for testing
     * This endpoint allows direct SQL execution - extremely dangerous
     */
    @PostMapping("/admin/sql")
    @ResponseBody
    public String executeSQL(@RequestParam String query, HttpSession session) {
        // Weak authorization check
        if (!"ADMIN".equals(session.getAttribute("role"))) {
            return "Access denied";
        }
        
        try {
            // EXTREMELY VULNERABLE: Direct SQL execution
            List<Map<String, Object>> results = jdbcTemplate.queryForList(query);
            return results.toString();
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }

    /**
     * Helper method to extract SQL state from exception
     */
    private String getSQLState(Exception e) {
        if (e instanceof SQLException) {
            return ((SQLException) e).getSQLState();
        }
        return "Unknown";
    }

    /**
     * Helper method to extract error code from exception
     */
    private int getErrorCode(Exception e) {
        if (e instanceof SQLException) {
            return ((SQLException) e).getErrorCode();
        }
        return -1;
    }
}
