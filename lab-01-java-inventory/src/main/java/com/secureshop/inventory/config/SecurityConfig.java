package com.secureshop.inventory.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Security Configuration - INTENTIONALLY WEAK
 *
 * This configuration has multiple intentional security flaws for training:
 * - CSRF disabled globally
 * - Frame options disabled (clickjacking risk)
 * - XSS protection disabled
 * - All URLs permitted without authentication (rely on session checks in controllers)
 * - HTTP-only cookies disabled
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // VULNERABLE: CSRF disabled - allows cross-site request forgery attacks
            .csrf(AbstractHttpConfigurer::disable)

            // VULNERABLE: Disable security headers
            .headers(headers -> headers
                .frameOptions(HeadersConfigurer.FrameOptionsConfig::disable)   // allows framing/clickjacking
                .contentTypeOptions(AbstractHttpConfigurer::disable)             // allows MIME sniffing
                .xssProtection(AbstractHttpConfigurer::disable)                  // no XSS header
            )

            // VULNERABLE: All paths accessible without Spring Security authentication
            // Authorization is checked manually (and poorly) in controllers
            .authorizeHttpRequests(auth -> auth
                .antMatchers("/**").permitAll()
            );

        return http.build();
    }
}
