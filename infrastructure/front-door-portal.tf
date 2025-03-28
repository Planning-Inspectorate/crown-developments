resource "azurerm_cdn_frontdoor_origin_group" "portal" {
  name                     = "${local.org}-fd-${local.service_name}-portal-${var.environment}"
  cdn_frontdoor_profile_id = data.azurerm_cdn_frontdoor_profile.shared.id
  session_affinity_enabled = true
  provider                 = azurerm.front_door

  health_probe {
    interval_in_seconds = 240
    path                = "/"
    protocol            = "Https"
    request_type        = "HEAD"
  }

  load_balancing {
    additional_latency_in_milliseconds = 0
    sample_size                        = 16
    successful_samples_required        = 3
  }
}

resource "azurerm_cdn_frontdoor_origin" "portal" {
  name                          = "${local.org}-fd-${local.service_name}-portal-${var.environment}"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.portal.id
  enabled                       = true

  certificate_name_check_enabled = true
  provider                       = azurerm.front_door

  host_name          = module.app_portal.default_site_hostname
  origin_host_header = module.app_portal.default_site_hostname
  http_port          = 80
  https_port         = 443
  priority           = 1
  weight             = 1000
}

resource "azurerm_cdn_frontdoor_custom_domain" "portal" {
  name                     = "${local.org}-fd-${local.service_name}-portal-${var.environment}"
  cdn_frontdoor_profile_id = data.azurerm_cdn_frontdoor_profile.shared.id
  host_name                = var.web_domains.portal
  provider                 = azurerm.front_door

  tls {
    certificate_type    = "ManagedCertificate"
    minimum_tls_version = "TLS12"
  }
}

resource "azurerm_cdn_frontdoor_route" "portal" {
  name                          = "${local.org}-fd-${local.service_name}-portal-${var.environment}"
  cdn_frontdoor_endpoint_id     = data.azurerm_cdn_frontdoor_endpoint.shared.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.portal.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.portal.id]
  provider                      = azurerm.front_door

  forwarding_protocol    = "MatchRequest"
  https_redirect_enabled = true
  patterns_to_match      = ["/*"]
  supported_protocols    = ["Http", "Https"]


  cdn_frontdoor_custom_domain_ids = [azurerm_cdn_frontdoor_custom_domain.portal.id]
  link_to_default_domain          = false
}

resource "azurerm_cdn_frontdoor_custom_domain_association" "portal" {
  cdn_frontdoor_custom_domain_id = azurerm_cdn_frontdoor_custom_domain.portal.id
  cdn_frontdoor_route_ids        = [azurerm_cdn_frontdoor_route.portal.id]
  provider                       = azurerm.front_door
}

# WAF policy
resource "azurerm_cdn_frontdoor_firewall_policy" "portal" {
  name                              = replace("${local.org}-waf-${local.service_name}-portal-${var.environment}", "-", "")
  resource_group_name               = var.front_door_config.rg
  sku_name                          = "Premium_AzureFrontDoor"
  enabled                           = true
  mode                              = "Prevention"
  redirect_url                      = "https://${var.web_domains.portal}/error/firewall-error"
  custom_block_response_status_code = 403
  provider                          = azurerm.front_door

  tags = local.tags

  # custom rules in priority order to match the API
  custom_rule {
    name     = "IpBlock"
    action   = "Block"
    enabled  = true
    priority = 10
    type     = "MatchRule"

    match_condition {
      match_variable     = "RemoteAddr"
      operator           = "IPMatch"
      negation_condition = false
      match_values = [
        "10.255.255.255" # placeholder value
      ]
    }
  }

  custom_rule {
    name                           = "RateLimitHttpRequest"
    enabled                        = var.waf_rate_limits.enabled
    priority                       = 100
    rate_limit_duration_in_minutes = var.waf_rate_limits.duration_in_minutes
    rate_limit_threshold           = var.waf_rate_limits.threshold
    type                           = "RateLimitRule"
    action                         = "Block"

    match_condition {
      match_variable = "RequestMethod"
      operator       = "Equal"
      match_values = [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "COPY",
        "MOVE",
        "HEAD",
        "OPTIONS"
      ]
    }
  }

  managed_rule {
    type    = "Microsoft_DefaultRuleSet"
    version = "2.1"
    action  = "Block"


    override {
      rule_group_name = "LFI"

      rule {
        # Path Traversal Attack (/../)
        action  = "Log"
        enabled = true
        rule_id = "930100"

        exclusion {
          # Exclusion to allow acceptance of cookies
          match_variable = "RequestCookieNames" # "CookieValue:cookie_policy"
          operator       = "Equals"
          selector       = "cookie_policy"
        }
      }

      rule {
        # Path Traversal Attack (/../)
        action  = "Log"
        enabled = true
        rule_id = "930110"

        exclusion {
          # Exclusion to allow acceptance of cookies
          match_variable = "RequestCookieNames" # "CookieValue:cookie_policy"
          operator       = "Equals"
          selector       = "cookie_policy"
        }
      }
    }

    override {
      rule_group_name = "SQLI"

      rule {
        # Common SQL injection testing
        action  = "Log"
        enabled = true
        rule_id = "942110"
      }

      rule {
        # Detects MySQL comment-/space-obfuscated injections and backtick termination
        action  = "Log"
        enabled = true
        rule_id = "942200"

        exclusion {
          # Exclusion to allow acceptance of cookies
          match_variable = "RequestCookieNames" # "CookieValue:cookie_policy"
          operator       = "Equals"
          selector       = "cookie_policy"
        }
      }

      rule {
        # Detects basic SQL authentication bypass attempts 2/3
        action  = "Log"
        enabled = true
        rule_id = "942260"

        exclusion {
          # Exclusion to allow acceptance of cookies
          match_variable = "RequestCookieNames" # "CookieValue:cookie_policy"
          operator       = "Equals"
          selector       = "cookie_policy"
        }
      }

      rule {
        # Suspicious use of SQL keywords
        action  = "Log"
        enabled = true
        rule_id = "942400"
      }

      rule {
        # SQL Comment Sequence Detected
        action  = "Log"
        enabled = true
        rule_id = "942440"
      }

      rule {
        # Restricted SQL Character Anomaly Detection (args): # of special characters exceeded (12)
        action  = "Log"
        enabled = true
        rule_id = "942430"
      }

      rule {
        # SQL Injection Attack
        action  = "Log"
        enabled = true
        rule_id = "942150"
      }

      rule {
        # SQL Injection Attack
        action  = "Log"
        enabled = true
        rule_id = "942410"
      }

      rule {
        # SQL Injection Attack Detected via libinjection
        action  = "Log"
        enabled = true
        rule_id = "942100"
      }

      rule {
        # SQL Hex Encoding Identified
        action  = "Log"
        enabled = true
        rule_id = "942450"

        exclusion {
          # Exclusion to allow cookie connect.sid
          match_variable = "RequestCookieNames" # "CookieValue:connect.sid"
          operator       = "Equals"
          selector       = "connect.sid"
        }
      }

      rule {
        # SQL Injection Attack: SQL Operator Detected
        action  = "Log"
        enabled = true
        rule_id = "942120"
      }

      rule {
        # SQL Injection Attack: Common DB Names Detected
        action  = "Log"
        enabled = true
        rule_id = "942140"
      }

      rule {
        # Detects blind sqli tests using sleep() or benchmark()
        action  = "Log"
        enabled = true
        rule_id = "942160"
      }

      rule {
        # Detects SQL benchmark and sleep injection attempts including conditional queries
        action  = "Log"
        enabled = true
        rule_id = "942170"
      }

      rule {
        # Detects basic SQL authentication bypass attempts 1/3
        action  = "Log"
        enabled = true
        rule_id = "942180"
      }

      rule {
        # Detects MSSQL code execution and information gathering attempts
        action  = "Log"
        enabled = true
        rule_id = "942190"
      }

      rule {
        # Detects chained SQL injection attempts 1/2
        action  = "Log"
        enabled = true
        rule_id = "942210"
      }

      rule {
        # Looking for integer overflow attacks, these are taken from skipfish, except 3.0.00738585072007e-308 is the "magic number" crash
        action  = "Log"
        enabled = true
        rule_id = "942220"
      }

      rule {
        # Detects conditional SQL injection attempts
        action  = "Log"
        enabled = true
        rule_id = "942230"
      }

      rule {
        # Detects MySQL charset switch and MSSQL DoS attempts
        action  = "Log"
        enabled = true
        rule_id = "942240"
      }

      rule {
        # Detects MATCH AGAINST, MERGE and EXECUTE IMMEDIATE injections
        action  = "Log"
        enabled = true
        rule_id = "942250"
      }

      rule {
        # Looking for basic sql injection. Common attack string for mysql, oracle, and others.
        action  = "Log"
        enabled = true
        rule_id = "942270"
      }

      rule {
        # Detects Postgres pg_sleep injection, waitfor delay attacks and database shutdown attempts
        action  = "Log"
        enabled = true
        rule_id = "942280"
      }

      rule {
        # Finds basic MongoDB SQL injection attempts
        action  = "Log"
        enabled = true
        rule_id = "942290"
      }

      rule {
        # Detects MySQL comments, conditions, and ch(a)r injections
        action  = "Log"
        enabled = true
        rule_id = "942300"
      }

      rule {
        # Detects chained SQL injection attempts 2/2
        action  = "Log"
        enabled = true
        rule_id = "942310"
      }

      rule {
        # Detects MySQL and PostgreSQL stored procedure/function injections
        action  = "Log"
        enabled = true
        rule_id = "942320"
      }

      rule {
        # Detects classic SQL injection probings 1/2
        action  = "Log"
        enabled = true
        rule_id = "942330"
      }

      rule {
        # Detects basic SQL authentication bypass attempts 3/3
        action  = "Log"
        enabled = true
        rule_id = "942340"
      }

      rule {
        # Detects MySQL UDF injection and other data/structure manipulation attempts
        action  = "Log"
        enabled = true
        rule_id = "942350"
      }

      rule {
        # Detects concatenated basic SQL injection and SQLLFI attempts
        action  = "Log"
        enabled = true
        rule_id = "942360"
      }

      rule {
        # Detects basic SQL injection based on keyword alter or union
        action  = "Log"
        enabled = true
        rule_id = "942361"
      }

      rule {
        # Detects classic SQL injection probings 2/3
        action  = "Log"
        enabled = true
        rule_id = "942370"
      }

      rule {
        # SQL Injection Attack
        action  = "Log"
        enabled = true
        rule_id = "942380"
      }

      rule {
        # SQL Injection Attack
        action  = "Log"
        enabled = true
        rule_id = "942390"
      }

      rule {
        # SQL Injection Attack
        action  = "Log"
        enabled = true
        rule_id = "942470"
      }

      rule {
        # SQL Injection Attack
        action  = "Log"
        enabled = true
        rule_id = "942480"
      }
    }
    override {
      rule_group_name = "RCE"

      rule {
        # Remote Command Execution: Direct Unix Command Execution
        action  = "Log"
        enabled = true
        rule_id = "932150"
      }
    }

    override {
      rule_group_name = "XSS"

      rule {
        # XSS Filter - Category 2: Event Handler Vector	Log
        action  = "Log"
        enabled = true
        rule_id = "941120"
      }
    }

    # Exception for ASB-2059 - Exclude all rules for this selector.
    exclusion {
      match_variable = "RequestBodyPostArgNames"
      operator       = "Equals"
      selector       = "comment"
    }

    # cross site request forgery token
    exclusion {
      match_variable = "RequestBodyPostArgNames"
      operator       = "Equals"
      selector       = "_csrf"
    }

    # session cookie
    exclusion {
      match_variable = "RequestCookieNames"
      operator       = "Equals"
      selector       = "connect.sid"
    }
  }

  managed_rule {
    type    = "Microsoft_BotManagerRuleSet"
    version = "1.1"
    action  = "Block"

  }

  lifecycle {
    ignore_changes = [
      # match the first custom rule (IpBlock) and ignore the match values (IPs)
      # managed in Portal
      custom_rule[0].match_condition[0].match_values
    ]
  }
}

resource "azurerm_cdn_frontdoor_security_policy" "portal" {
  name                     = replace("${local.org}-sec-${local.service_name}-portal-${var.environment}", "-", "")
  cdn_frontdoor_profile_id = data.azurerm_cdn_frontdoor_profile.shared.id
  provider                 = azurerm.front_door

  security_policies {
    firewall {
      cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.portal.id

      association {
        domain {
          cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_custom_domain.portal.id
        }
        patterns_to_match = ["/*"]
      }
    }
  }
}
