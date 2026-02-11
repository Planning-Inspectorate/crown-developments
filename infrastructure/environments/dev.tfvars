# A-Z
apps_config = {
  app_service_plan = {
    sku                      = "P0v3"
    per_site_scaling_enabled = false
    worker_count             = 1
    zone_balancing_enabled   = false
  }
  node_environment         = "development"
  private_endpoint_enabled = true

  auth = {
    client_id                = "d53a5c3f-47e8-4f0b-bdf6-fb1a532f293b"
    group_application_access = "0041a68f-91cf-4d41-8b0d-0174cf2b2481"
  }

  contact_email = "not.real@fake.example.com"

  entra = {
    group_ids = {
      # use app access group for now
      case_officers = "0041a68f-91cf-4d41-8b0d-0174cf2b2481"
      inspectors    = "0041a68f-91cf-4d41-8b0d-0174cf2b2481"
    }
  }

  feature_flags = {
    portal_not_live              = false
    upload_docs_not_live         = false
    notify_callback_not_live     = false
    application_updates_not_live = false
    multiple_applicants_not_live = true
  }

  google_analytics_id = "G-X08SNFE249"

  logging = {
    level = "info"
  }

  redis = {
    capacity = 0
    family   = "C"
    sku_name = "Basic"
  }

  gov_notify = {
    disabled = false
    templates = {
      test_template_id                = "4b8adfb1-1b7c-4333-b512-761eeedfdca2"
      pre_ack_template_id             = "298a986d-c142-46f5-804a-9cb853ba8b3d"
      ack_rep_template_id             = "52312d8e-2af8-4212-a280-bfc6106cc56d"
      lpa_qnr_template_id             = "fff17679-d63d-49e4-baaa-ccbf0bdfbf98"
      app_rec_with_fee_template_id    = "68ad45c9-3ea7-4670-a058-61383ee0bcfc"
      app_rec_without_fee_template_id = "ca391a7c-1f16-4d43-8cc9-f9a4007fa23f"
      app_not_nat_imp_template_id     = "b821dda1-839f-4093-b3d1-273f49a3b7eb"
      lpa_quest_sent_template_id      = "0930a936-73e0-4bc1-b000-5fe3061b564b"
    }
  }

  sharepoint = {
    disabled = false
  }
}

auth_config_portal = {
  auth_enabled   = true
  auth_client_id = "8e64dbf3-99f8-4b31-94ee-b621ad68c56f"
  application_id = "55e382ee-7ea4-4b2b-bb57-204a3a0c9e09"
}

common_config = {
  resource_group_name = "pins-rg-common-dev-ukw-001"
  action_group_names = {
    iap      = "pins-ag-odt-iap-dev"
    its      = "pins-ag-odt-its-dev"
    info_sec = "pins-ag-odt-info-sec-dev"
  }
}

environment = "dev"

front_door_config = {
  name        = "pins-fd-common-tooling"
  rg          = "pins-rg-common-tooling"
  ep_name     = "pins-fde-crowndev"
  use_tooling = true
}

monitoring_config = {
  app_insights_web_test_enabled        = false
  manage_app_insights_web_test_enabled = false
  log_daily_cap                        = 0.2
}

sql_config = {
  admin = {
    login_username = "pins-crown-sql-dev"
    object_id      = "1c69f6a2-c0ef-42fa-b754-5da26608299f"
  }
  sku_name    = "Basic"
  max_size_gb = 2
  retention = {
    audit_days             = 7
    short_term_days        = 7
    long_term_weekly       = "P1W"
    long_term_monthly      = "P1M"
    long_term_yearly       = "P1Y"
    long_term_week_of_year = 1
  }
  public_network_access_enabled = false
}

text_analytics_config = {
  deploy = false # use tooling subscription shared instance
}

vnet_config = {
  address_space                       = "10.20.0.0/22"
  apps_subnet_address_space           = "10.20.0.0/24"
  main_subnet_address_space           = "10.20.1.0/24"
  secondary_address_space             = "10.20.16.0/22"
  secondary_apps_subnet_address_space = "10.20.16.0/24"
  secondary_subnet_address_space      = "10.20.17.0/24"
}

web_domains = { portal = "crown-dev.planninginspectorate.gov.uk", manage = "crown-manage-dev.planninginspectorate.gov.uk" }

waf_rate_limits = {
  enabled             = true
  duration_in_minutes = 5
  threshold           = 1500
}
