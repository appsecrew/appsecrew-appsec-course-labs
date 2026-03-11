# Interview Questions - Java Inventory Service (SQL Injection Lab)

## Overview
This document contains interview-style questions based on the Java Inventory Service lab, covering SQL injection vulnerabilities, secure coding practices, and application security concepts. These questions are designed to test both theoretical knowledge and practical experience.

## SQL Injection Fundamentals

### Q1: What is SQL injection and how does it occur?
**Expected Answer:**
SQL injection is a code injection technique where malicious SQL statements are inserted into application entry points. It occurs when:
- User input is directly concatenated into SQL queries
- Input validation is insufficient or missing
- Parameterized queries are not used
- Special characters are not properly escaped

**Follow-up:** Can you provide an example of vulnerable code?

### Q2: Explain the different types of SQL injection attacks.
**Expected Answer:**
1. **Error-based**: Exploits database error messages to extract information
2. **Union-based**: Uses UNION operator to combine malicious queries with legitimate ones
3. **Boolean-based blind**: Infers information based on true/false responses
4. **Time-based blind**: Uses time delays to extract data
5. **Second-order**: Stored input is later used in vulnerable queries

**Follow-up:** Which type would be most effective against this inventory application?

### Q3: How would you test for SQL injection vulnerabilities?
**Expected Answer:**
1. **Manual testing**: Insert special characters (', ", ;, --, /*) into input fields
2. **Error analysis**: Look for database error messages
3. **Boolean testing**: Test conditions that return true/false
4. **Time-based testing**: Use SLEEP() or WAITFOR DELAY functions
5. **Automated tools**: SQLMap, Burp Suite, OWASP ZAP
6. **Code review**: Examine source code for vulnerable patterns

**Follow-up:** What would be your testing approach for the login functionality?

## Vulnerability Analysis

### Q4: In the provided code, identify the SQL injection vulnerability in the authentication method.
**Code Reference:**
```java
String sql = "SELECT * FROM users WHERE username = '" + 
             username + "' AND password = '" + password + "'";
```

**Expected Answer:**
- Direct string concatenation creates vulnerability
- No input validation or sanitization
- User input directly inserted into SQL query
- Allows authentication bypass with payloads like `admin' OR '1'='1' --`

**Follow-up:** How would you exploit this to gain admin access?

### Q5: What is the business impact of the SQL injection vulnerabilities in this application?
**Expected Answer:**
1. **Confidentiality**: Unauthorized access to sensitive data (user credentials, inventory data)
2. **Integrity**: Potential data modification or deletion
3. **Availability**: Database performance degradation or denial of service
4. **Compliance**: Violation of data protection regulations
5. **Reputation**: Loss of customer trust and business reputation
6. **Financial**: Potential fines, legal costs, and business losses

**Follow-up:** How would you prioritize these vulnerabilities for remediation?

## Secure Coding Practices

### Q6: How would you fix the SQL injection vulnerability in the authentication method?
**Expected Answer:**
```java
// Use parameterized queries
String sql = "SELECT * FROM users WHERE username = ? AND password = ?";
PreparedStatement stmt = connection.prepareStatement(sql);
stmt.setString(1, username);
stmt.setString(2, hashPassword(password));
ResultSet rs = stmt.executeQuery();
```

Additional measures:
- Input validation and sanitization
- Use stored procedures
- Implement proper error handling
- Apply principle of least privilege for database users

**Follow-up:** What are the advantages of parameterized queries over string concatenation?

### Q7: Explain the concept of defense in depth for preventing SQL injection.
**Expected Answer:**
1. **Input validation**: Whitelist validation, length limits, data type checks
2. **Parameterized queries**: Use prepared statements or stored procedures
3. **Least privilege**: Database users with minimal required permissions
4. **Error handling**: Generic error messages, proper logging
5. **Web Application Firewall**: Filter malicious requests
6. **Regular updates**: Keep frameworks and libraries updated
7. **Code review**: Regular security code reviews
8. **Security testing**: Automated and manual testing

**Follow-up:** Which layer would be most critical in this application?

### Q8: What is the difference between prepared statements and stored procedures for SQL injection prevention?
**Expected Answer:**

**Prepared Statements:**
- SQL query structure defined separately from data
- Parameters passed separately
- Database compiles query once, executes multiple times
- Portable across different databases

**Stored Procedures:**
- Pre-compiled SQL code stored in database
- Can include complex business logic
- Better performance for complex operations
- Database-specific implementation

Both prevent SQL injection by separating SQL code from data.

**Follow-up:** When would you choose one over the other?

## Application Security Concepts

### Q9: How does Spring Security help prevent SQL injection attacks?
**Expected Answer:**
Spring Security doesn't directly prevent SQL injection but provides:
1. **Authentication mechanisms**: Reduces reliance on custom authentication code
2. **Authorization controls**: Method-level and URL-based security
3. **CSRF protection**: Prevents cross-site request forgery
4. **Security headers**: XSS protection, content type options
5. **Password encoding**: BCrypt and other secure hashing algorithms

SQL injection prevention still requires secure coding practices in data access layers.

**Follow-up:** What Spring Security features would you implement in this application?

### Q10: Explain the concept of threat modeling and how it applies to this application.
**Expected Answer:**
Threat modeling is a structured approach to identify and assess security threats:

1. **STRIDE analysis**: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege
2. **Attack trees**: Map possible attack paths to achieve specific goals
3. **Data flow diagrams**: Identify trust boundaries and data flows
4. **Risk assessment**: Prioritize threats based on likelihood and impact

For this application:
- Identify SQL injection as high-risk threat
- Map attack paths through login and search functions
- Assess impact on confidentiality and integrity

**Follow-up:** How would you use threat modeling results to guide security testing?

## Testing and Validation

### Q11: Design a test plan for validating SQL injection fixes.
**Expected Answer:**
1. **Unit tests**: Test parameterized queries with malicious input
2. **Integration tests**: End-to-end testing of authentication flows
3. **Security tests**: Automated SQL injection testing
4. **Manual testing**: Exploratory testing with various payloads
5. **Code review**: Verify all database interactions use secure methods
6. **Regression testing**: Ensure fixes don't break functionality

Test cases should include:
- Authentication bypass attempts
- Data extraction payloads
- Error-based injection tests
- Time-based blind injection tests

**Follow-up:** What tools would you use for automated testing?

### Q12: How would you implement logging and monitoring to detect SQL injection attacks?
**Expected Answer:**
1. **Application logging**: Log all authentication attempts and database queries
2. **Security events**: Log failed login attempts, suspicious query patterns
3. **Database logging**: Enable query logging and slow query logs
4. **SIEM integration**: Centralized log analysis and correlation
5. **Alerting**: Real-time alerts for suspicious activities
6. **Metrics**: Track authentication failure rates, query response times

Key indicators:
- Multiple failed login attempts
- Unusual query patterns (UNION, SELECT, etc. in input)
- Database errors in logs
- Abnormal response times

**Follow-up:** What would trigger an immediate security alert?

## Advanced Topics

### Q13: Explain second-order SQL injection and provide an example.
**Expected Answer:**
Second-order SQL injection occurs when:
1. Malicious input is stored in database
2. Later retrieved and used in vulnerable SQL query
3. Injection executes during the second database operation

Example:
```java
// First request - store malicious username
String username = "admin'; DROP TABLE users; --";
// Stored in database (appears safe)

// Second request - vulnerable query using stored data
String sql = "SELECT * FROM audit_logs WHERE username = '" + 
             storedUsername + "'";
// Injection executes here
```

**Follow-up:** How would you test for second-order SQL injection?

### Q14: What are the challenges in implementing SQL injection protection in legacy applications?
**Expected Answer:**
1. **Code complexity**: Large codebase with multiple database interactions
2. **Framework limitations**: Older frameworks may lack security features
3. **Performance concerns**: Changing queries may impact performance
4. **Testing challenges**: Comprehensive testing of all code paths
5. **Business continuity**: Minimizing disruption during updates
6. **Resource constraints**: Limited time and budget for security updates

Mitigation strategies:
- Prioritize high-risk areas
- Implement Web Application Firewall as temporary protection
- Gradual migration to secure coding practices
- Comprehensive testing and validation

**Follow-up:** How would you approach securing this inventory application if it were a legacy system?

## Research Assignments

### Assignment 1: OWASP Top 10 Analysis
Research the latest OWASP Top 10 and analyze how SQL injection (A03:2021 - Injection) relates to other vulnerabilities. Create a presentation explaining:
- Current trends in injection attacks
- Relationship between injection and other OWASP Top 10 items
- Industry statistics on SQL injection prevalence
- Case studies of recent SQL injection incidents

### Assignment 2: Database Security Best Practices
Study database security hardening techniques and create a comprehensive guide covering:
- Database user privilege management
- Network security and access controls
- Encryption at rest and in transit
- Audit logging and monitoring
- Backup and recovery security
- Database-specific security features (MySQL, PostgreSQL, etc.)

### Assignment 3: Automated Security Testing
Research and compare different automated SQL injection testing tools:
- SQLMap capabilities and usage
- Burp Suite Professional features
- OWASP ZAP automation
- Integration with CI/CD pipelines
- Custom tool development considerations

Create a testing framework proposal for this application.

### Assignment 4: Secure Development Lifecycle
Study how SQL injection prevention fits into the Secure Development Lifecycle (SDL):
- Security requirements gathering
- Threat modeling integration
- Secure coding standards
- Security testing phases
- Security code review processes
- Deployment security considerations

## Practical Exercises

### Exercise 1: Exploit Development
Develop working exploits for the identified SQL injection vulnerabilities:
1. Authentication bypass payload
2. Data extraction script
3. Blind SQL injection automation
4. Error-based information gathering

Document the exploitation process and potential impact.

### Exercise 2: Remediation Implementation
Implement comprehensive fixes for all SQL injection vulnerabilities:
1. Convert to parameterized queries
2. Add input validation
3. Implement proper error handling
4. Add security logging
5. Create unit tests for security fixes

### Exercise 3: Security Testing Suite
Create a comprehensive security testing suite:
1. Automated SQL injection tests
2. Authentication security tests
3. Authorization bypass tests
4. Input validation tests
5. Error handling tests

## Interview Scenarios

### Scenario 1: Code Review
"You're reviewing a pull request that contains database code. Walk me through your security review process and what you would look for."

### Scenario 2: Incident Response
"We've detected suspicious database activity that looks like SQL injection. How would you investigate and respond to this incident?"

### Scenario 3: Architecture Review
"A development team wants to add a new search feature to this application. What security considerations would you discuss with them?"

### Scenario 4: Risk Assessment
"Management wants to understand the business risk of the SQL injection vulnerabilities. How would you present this information to non-technical stakeholders?"

## Additional Reading

### Books
- "The Web Application Hacker's Handbook" by Dafydd Stuttard and Marcus Pinto
- "SQL Injection Attacks and Defense" by Justin Clarke
- "Secure Coding: Principles and Practices" by Mark Graff and Kenneth van Wyk

### Online Resources
- OWASP SQL Injection Prevention Cheat Sheet
- SANS SQL Injection Prevention Guide
- PortSwigger Web Security Academy
- NIST Secure Software Development Framework

### Research Papers
- "SQL Injection: Complete Study" - International Journal of Computer Science
- "A Survey of SQL Injection Defense Mechanisms" - IEEE Security & Privacy
- "Automated Detection of SQL Injection Vulnerabilities" - ACM Computing Surveys

## Assessment Criteria

### Technical Knowledge (40%)
- Understanding of SQL injection mechanisms
- Knowledge of prevention techniques
- Familiarity with testing methodologies
- Awareness of security frameworks

### Practical Skills (35%)
- Ability to identify vulnerabilities in code
- Experience with security testing tools
- Code review and remediation skills
- Incident response capabilities

### Communication (15%)
- Ability to explain technical concepts clearly
- Risk communication to stakeholders
- Documentation and reporting skills
- Collaboration with development teams

### Problem Solving (10%)
- Analytical thinking and creativity
- Ability to prioritize security issues
- Strategic approach to security implementation
- Continuous learning and adaptation
