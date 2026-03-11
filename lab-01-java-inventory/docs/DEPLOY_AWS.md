# AWS Deployment Guide - Java Inventory Service

## Overview
This guide provides comprehensive instructions for deploying the Java Inventory Service to AWS using Infrastructure as Code (IaC) with Terraform. The deployment creates a production-ready environment with proper security, monitoring, and scalability.

## Architecture Overview
The AWS deployment includes:
- **ECS Fargate** for containerized application hosting
- **RDS MySQL** for managed database service
- **Application Load Balancer** for traffic distribution
- **VPC** with public/private subnets for network isolation
- **CloudWatch** for logging and monitoring
- **IAM** roles and policies for security
- **Route 53** for DNS management (optional)
- **ACM** for SSL/TLS certificates

## Prerequisites

### Required Tools
- **AWS CLI 2.0+** configured with appropriate credentials
- **Terraform 1.0+** for infrastructure provisioning
- **Docker** for building and pushing container images
- **Git** for version control

### AWS Account Setup
- AWS account with appropriate permissions
- AWS CLI configured with access keys
- Default region set (recommended: us-east-1 or us-west-2)

### Required AWS Permissions
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:*",
                "ecs:*",
                "rds:*",
                "iam:*",
                "logs:*",
                "elasticloadbalancing:*",
                "route53:*",
                "acm:*",
                "ecr:*"
            ],
            "Resource": "*"
        }
    ]
}
```

## Quick Deployment

### 1. Clone and Setup
```bash
git clone <repository-url>
cd labs/lab-01-java-inventory/deploy/aws
```

### 2. Configure Variables
```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your specific values
```

### 3. Deploy Infrastructure
```bash
terraform init
terraform plan
terraform apply
```

### 4. Build and Deploy Application
```bash
./scripts/deploy.sh
```

## Detailed Setup

### 1. Environment Configuration

Create `terraform.tfvars`:
```hcl
# Project Configuration
project_name = "inventory-service"
environment  = "production"
region      = "us-east-1"

# Network Configuration
vpc_cidr = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]

# Application Configuration
app_port = 8080
app_cpu  = 512
app_memory = 1024
app_desired_count = 2

# Database Configuration
db_instance_class = "db.t3.micro"
db_allocated_storage = 20
db_name = "inventory_db"
db_username = "inventory_user"
db_password = "SecurePassword123!"

# Domain Configuration (Optional)
domain_name = "inventory.yourdomain.com"
create_route53_record = false

# Security Configuration
allowed_cidr_blocks = ["0.0.0.0/0"]  # Restrict in production
enable_deletion_protection = false   # Enable in production

# Monitoring Configuration
log_retention_days = 30
enable_detailed_monitoring = true

# Tags
tags = {
  Project     = "SecureShop Inventory"
  Environment = "production"
  Owner       = "security-team"
  Purpose     = "appsec-training"
}
```

### 2. Infrastructure Components

#### VPC and Networking
```hcl
# deploy/aws/modules/networking/main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-vpc"
  })
}

resource "aws_subnet" "public" {
  count = length(var.availability_zones)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-public-${count.index + 1}"
    Type = "public"
  })
}

resource "aws_subnet" "private" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.tags, {
    Name = "${var.project_name}-private-${count.index + 1}"
    Type = "private"
  })
}
```

#### ECS Cluster and Service
```hcl
# deploy/aws/modules/ecs/main.tf
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = var.tags
}

resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.app_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "inventory-app"
    container_port   = var.app_port
  }

  depends_on = [var.alb_listener]

  tags = var.tags
}
```

#### RDS Database
```hcl
# deploy/aws/modules/rds/main.tf
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-db"

  engine         = "mysql"
  engine_version = "8.0"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 2
  storage_type          = "gp2"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = !var.enable_deletion_protection
  deletion_protection = var.enable_deletion_protection

  tags = var.tags
}
```

### 3. Security Configuration

#### Security Groups
```hcl
# Application Security Group
resource "aws_security_group" "app" {
  name_prefix = "${var.project_name}-app-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-app-sg"
  })
}

# Database Security Group
resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-rds-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-rds-sg"
  })
}
```

#### IAM Roles and Policies
```hcl
# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role
resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}
```

### 4. Application Load Balancer

```hcl
# deploy/aws/modules/alb/main.tf
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.enable_deletion_protection

  tags = var.tags
}

resource "aws_lb_target_group" "app" {
  name        = "${var.project_name}-tg"
  port        = var.app_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/inventory/actuator/health"
    matcher             = "200"
    port                = "traffic-port"
    protocol            = "HTTP"
  }

  tags = var.tags
}

resource "aws_lb_listener" "app" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

### 5. Container Registry and Task Definition

#### ECR Repository
```hcl
resource "aws_ecr_repository" "app" {
  name                 = "${var.project_name}-app"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.tags
}
```

#### ECS Task Definition
```hcl
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project_name}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.app_cpu
  memory                   = var.app_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "inventory-app"
      image = "${aws_ecr_repository.app.repository_url}:latest"
      
      portMappings = [
        {
          containerPort = var.app_port
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "SPRING_PROFILES_ACTIVE"
          value = "aws"
        },
        {
          name  = "SPRING_DATASOURCE_URL"
          value = "jdbc:mysql://${var.db_endpoint}:3306/${var.db_name}"
        },
        {
          name  = "SPRING_DATASOURCE_USERNAME"
          value = var.db_username
        },
        {
          name  = "SPRING_DATASOURCE_PASSWORD"
          value = var.db_password
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.app.name
          awslogs-region        = var.region
          awslogs-stream-prefix = "ecs"
        }
      }

      essential = true
    }
  ])

  tags = var.tags
}
```

## Deployment Process

### 1. Infrastructure Deployment

#### Initialize Terraform
```bash
cd deploy/aws
terraform init
```

#### Plan Deployment
```bash
terraform plan -var-file="terraform.tfvars"
```

#### Apply Infrastructure
```bash
terraform apply -var-file="terraform.tfvars"
```

### 2. Application Deployment

#### Build and Push Container
```bash
# Build application image
docker build -t inventory-service .

# Get ECR login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push image
docker tag inventory-service:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/inventory-service-app:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/inventory-service-app:latest
```

#### Update ECS Service
```bash
aws ecs update-service \
  --cluster inventory-service-cluster \
  --service inventory-service-service \
  --force-new-deployment
```

### 3. Database Setup

#### Connect to RDS
```bash
mysql -h <rds-endpoint> -u inventory_user -p inventory_db
```

#### Run Migrations
```bash
# From local machine with database access
mvn flyway:migrate \
  -Dflyway.url=jdbc:mysql://<rds-endpoint>:3306/inventory_db \
  -Dflyway.user=inventory_user \
  -Dflyway.password=<password>
```

## Monitoring and Logging

### 1. CloudWatch Configuration

#### Log Groups
```hcl
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.project_name}-app"
  retention_in_days = var.log_retention_days

  tags = var.tags
}
```

#### Metrics and Alarms
```hcl
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${var.project_name}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "120"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ecs cpu utilization"

  dimensions = {
    ServiceName = aws_ecs_service.app.name
    ClusterName = aws_ecs_cluster.main.name
  }

  tags = var.tags
}
```

### 2. Application Monitoring

#### Health Checks
```bash
# Check application health
curl https://inventory.yourdomain.com/inventory/actuator/health

# Check load balancer health
aws elbv2 describe-target-health \
  --target-group-arn <target-group-arn>
```

#### Log Analysis
```bash
# View application logs
aws logs tail /ecs/inventory-service-app --follow

# Search for errors
aws logs filter-log-events \
  --log-group-name /ecs/inventory-service-app \
  --filter-pattern "ERROR"

# Monitor SQL injection attempts
aws logs filter-log-events \
  --log-group-name /ecs/inventory-service-app \
  --filter-pattern "SQL"
```

## Security Hardening

### 1. Network Security
- VPC with private subnets for application and database
- Security groups with minimal required access
- NAT Gateway for outbound internet access from private subnets

### 2. Application Security
- ECS tasks run in private subnets
- IAM roles with least privilege principles
- Secrets stored in AWS Systems Manager Parameter Store

### 3. Database Security
- RDS in private subnets
- Encryption at rest enabled
- Automated backups configured
- Security group restricting access to application only

## Scaling and Performance

### 1. Auto Scaling Configuration
```hcl
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "scale_up" {
  name               = "${var.project_name}-scale-up"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

### 2. Database Performance
- RDS Performance Insights enabled
- Read replicas for read-heavy workloads
- Connection pooling in application

## Disaster Recovery

### 1. Backup Strategy
- RDS automated backups (7 days retention)
- Point-in-time recovery enabled
- Cross-region backup replication (optional)

### 2. High Availability
- Multi-AZ deployment for RDS
- ECS service across multiple availability zones
- Application Load Balancer health checks

## Cost Optimization

### 1. Resource Sizing
- Use appropriate instance sizes for workload
- Enable auto-scaling to handle traffic variations
- Use Spot instances for non-critical workloads

### 2. Monitoring Costs
```bash
# Check current costs
aws ce get-cost-and-usage \
  --time-period Start=2023-01-01,End=2023-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

## Troubleshooting

### Common Issues

#### ECS Service Not Starting
```bash
# Check service events
aws ecs describe-services \
  --cluster inventory-service-cluster \
  --services inventory-service-service

# Check task definition
aws ecs describe-task-definition \
  --task-definition inventory-service-app
```

#### Database Connection Issues
```bash
# Test database connectivity
aws rds describe-db-instances \
  --db-instance-identifier inventory-service-db

# Check security groups
aws ec2 describe-security-groups \
  --group-ids <security-group-id>
```

#### Load Balancer Issues
```bash
# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn <target-group-arn>

# Check load balancer status
aws elbv2 describe-load-balancers \
  --load-balancer-arns <load-balancer-arn>
```

## Cleanup

### 1. Destroy Infrastructure
```bash
# Destroy all resources
terraform destroy -var-file="terraform.tfvars"

# Confirm destruction
terraform show
```

### 2. Manual Cleanup
```bash
# Delete ECR images
aws ecr batch-delete-image \
  --repository-name inventory-service-app \
  --image-ids imageTag=latest

# Empty S3 buckets (if any)
aws s3 rm s3://bucket-name --recursive
```

## Security Testing in AWS

### 1. Penetration Testing
- Follow AWS penetration testing guidelines
- Test from external networks
- Monitor CloudTrail for security events

### 2. Vulnerability Scanning
```bash
# Use AWS Inspector for container scanning
aws inspector2 batch-get-account-status

# Check ECR scan results
aws ecr describe-image-scan-findings \
  --repository-name inventory-service-app
```

## Next Steps

After successful AWS deployment:

1. **Configure Monitoring**: Set up comprehensive monitoring and alerting
2. **Security Hardening**: Implement additional security controls
3. **Performance Testing**: Conduct load testing and optimization
4. **Disaster Recovery Testing**: Test backup and recovery procedures
5. **Cost Optimization**: Monitor and optimize resource usage

## Support and Documentation

### AWS Resources
- [ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [RDS Documentation](https://docs.aws.amazon.com/rds/)
- [VPC Documentation](https://docs.aws.amazon.com/vpc/)
- [CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)

### Terraform Resources
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
