locals {
  resource_tags = {
    # ========================================
    # app-manage.tf
    # ========================================
    key_vault_secret_manage_session_secret = {
      CriticalityRating = "Level 1"
      PersonalData      = "No"
    }
    linux_web_app_manage = {
      CriticalityRating = "Level 1"
      PersonalData      = "Yes"
    }
    monitor_metric_alert_manage_http_5xx = {
      CriticalityRating = "Level 2"
      PersonalData      = "No"
    }
    monitor_metric_alert_manage_response_time = {
      CriticalityRating = "Level 3"
      PersonalData      = "No"
    }
    monitor_metric_alert_manage_health_check = {
      CriticalityRating = "Level 3"
      PersonalData      = "No"
    }

    # ========================================
    # app-portal.tf
    # ========================================
    key_vault_secret_session_secret = {
      CriticalityRating = "Level 1"
      PersonalData      = "No"
    }
    linux_web_app_portal = {
      CriticalityRating = "Level 1"
      PersonalData      = "Yes"
    }

    # ========================================
    # app-service-plan.tf
    # ========================================
    service_plan_apps = {
      CriticalityRating = "Level 1"
      PersonalData      = "No"
    }

    # ========================================
    # app-web-redis.tf
    # ========================================
    key_vault_secret_redis_web_connection_string = {
      CriticalityRating = "Level 1"
      PersonalData      = "No"
    }
    private_endpoint_redis_web = {
      CriticalityRating = "Level 1"
      PersonalData      = "No"
    }
    redis_cache_web = {
      CriticalityRating = "Level 1"
      PersonalData      = "No"
    }

    # ========================================
    # database.tf
    # ========================================
    key_vault_secret_sql_admin_connection_string = {
      CriticalityRating = "Level 1"
      PersonalData      = "Yes"
    }
    key_vault_secret_sql_app_connection_string = {
      CriticalityRating = "Level 1"
      PersonalData      = "Yes"
    }
    mssql_database_primary = {
      CriticalityRating = "Level 1"
      PersonalData      = "Yes"
    }
    mssql_server_primary = {
      CriticalityRating = "Level 1" # Should this be a level 3?
      PersonalData      = "Yes"
    }
    private_endpoint_sql_primary = {
      CriticalityRating = "Level 1"
      PersonalData      = "No"
    }

    # ========================================
    # database-secondary.tf
    # ========================================
    mssql_failover_group_sql_failover = {
      CriticalityRating = "Level 1"
      PersonalData      = "No"
    }
    mssql_server_secondary = {
      CriticalityRating = "Level 3"
      PersonalData      = "No"
    }
    private_endpoint_sql_secondary = {
      CriticalityRating = "Level 1"
      PersonalData      = "No"
    }

    # ========================================
    # database-monitoring.tf
    # ========================================
    monitor_metric_alert_sql_db_cpu = {
      CriticalityRating = "Level 4"
      PersonalData      = "No"
    }
    monitor_metric_alert_sql_db_deadlock = {
      CriticalityRating = "Level 4"
      PersonalData      = "No"
    }
    monitor_metric_alert_sql_db_dtu = {
      CriticalityRating = "Level 4"
      PersonalData      = "No"
    }
    monitor_metric_alert_sql_db_log_io = {
      CriticalityRating = "Level 4"
      PersonalData      = "No"
    }
    storage_account_sql_server = {
      CriticalityRating = "Level 1"
      PersonalData      = "Yes"
    }

    # ========================================
    # front-door-manage.tf
    # ========================================
    cdn_frontdoor_firewall_policy_manage = {
      CriticalityRating = "Level 1"
      PersonalData      = "No"
    }

    # ========================================
    # front-door-portal.tf
    # ========================================
    cdn_frontdoor_firewall_policy_portal = {
      CriticalityRating = "Level 1"
      PersonalData      = "No"
    }

    # ========================================
    # main.tf
    # ========================================
    key_vault_main = {
      CriticalityRating = "Level 1"
      PersonalData      = "No"
    }
    key_vault_secret_manual_secrets = {
      CriticalityRating = "Level 1"
      PersonalData      = "Yes"
    }
    resource_group_primary = {
      CriticalityRating = "Level 1"
      PersonalData      = "No"
    }
    resource_group_secondary = {
      CriticalityRating = "Level 1"
      PersonalData      = "No"
    }

    # ========================================
    # monitoring.tf
    # ========================================
    application_insights_main = {
      CriticalityRating = "Level 3"
      PersonalData      = "No"
    }
    application_insights_standard_web_test_portal = {
      CriticalityRating = "Level 3"
      PersonalData      = "No"
    }
    key_vault_secret_app_insights_connection_string = {
      CriticalityRating = "Level 3"
      PersonalData      = "No"
    }
    log_analytics_workspace_main = {
      CriticalityRating = "Level 4"
      PersonalData      = "No"
    }
    monitor_action_group_crown_service_manager = {
      CriticalityRating = "Level 3"
      PersonalData      = "No"
    }
    monitor_action_group_crown_tech = {
      CriticalityRating = "Level 3"
      PersonalData      = "No"
    }
    monitor_metric_alert_portal_availability = {
      CriticalityRating = "Level 4"
      PersonalData      = "No"
    }

    # ========================================
    # networking.tf
    # ========================================
    virtual_network_main = {
      CriticalityRating = "Level 2"
      PersonalData      = "No"
    }

    # ========================================
    # text-analytics.tf
    # ========================================
    cognitive_account_text_analytics = {
      CriticalityRating = "Level 2"
      PersonalData      = "No"
    }
    private_endpoint_text_analytics = {
      CriticalityRating = "Level 1"
      PersonalData      = "No"
    }
  }
}
