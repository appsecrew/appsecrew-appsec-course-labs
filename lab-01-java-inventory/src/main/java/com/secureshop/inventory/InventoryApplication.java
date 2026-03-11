package com.secureshop.inventory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main Spring Boot Application Class for Inventory Service
 *
 * WARNING: This application contains intentional security vulnerabilities
 * for educational purposes. DO NOT use in production environments.
 *
 * Vulnerabilities included:
 * - SQL Injection in authentication and search functionality
 * - Information disclosure through error messages
 * - Insufficient authorization controls
 * - Weak session management
 *
 * @author AppSec Training Team
 * @version 1.0.0
 */
@SpringBootApplication
public class InventoryApplication {

    public static void main(String[] args) {
        // Print startup banner with security warning
        printSecurityWarning();
        
        SpringApplication.run(InventoryApplication.class, args);
    }
    
    /**
     * Print security warning banner on startup
     */
    private static void printSecurityWarning() {
        System.out.println("╔══════════════════════════════════════════════════════════════╗");
        System.out.println("║                    SECURITY WARNING                         ║");
        System.out.println("║                                                              ║");
        System.out.println("║  This application contains INTENTIONAL security             ║");
        System.out.println("║  vulnerabilities for educational purposes.                  ║");
        System.out.println("║                                                              ║");
        System.out.println("║  DO NOT deploy this application in production!              ║");
        System.out.println("║                                                              ║");
        System.out.println("║  Vulnerabilities included:                                  ║");
        System.out.println("║  • SQL Injection                                            ║");
        System.out.println("║  • Information Disclosure                                   ║");
        System.out.println("║  • Authorization Bypass                                     ║");
        System.out.println("║  • Weak Session Management                                  ║");
        System.out.println("║                                                              ║");
        System.out.println("║  Use only for security training and testing purposes.      ║");
        System.out.println("╚══════════════════════════════════════════════════════════════╝");
        System.out.println();
    }
}
