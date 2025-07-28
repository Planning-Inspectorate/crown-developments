# A-Z
apps_config = {
  app_service_plan = {
    sku                      = "P1v3"
    per_site_scaling_enabled = true
    worker_count             = 3
    zone_balancing_enabled   = true
  }
  node_environment         = "production"
  private_endpoint_enabled = true

  auth = {
    client_id                = "30a34d1a-473e-4a7f-ad6d-fa574c52a509"
    group_application_access = "1abf7720-2ea6-479e-822d-218917d3d0ee"
  }

  contact_email = "crownapplications@planninginspectorate.gov.uk"

  entra = {
    group_ids = {
      case_officers = "1abf7720-2ea6-479e-822d-218917d3d0ee"
      inspectors    = "dfcab300-f268-4eb3-820e-1758fa69c150"
    }
  }

  feature_flags = {
    portal_not_live      = false
    upload_docs_not_live = true
  }

  google_analytics_id = "G-HP9Q7SY3N8"

  logging = {
    level = "warn"
  }

  redis = {
    capacity = 1
    family   = "C"
    sku_name = "Standard"
  }

  gov_notify = {
    disabled = false
    templates = {
      test_template_id                = "" #TODO
      pre_ack_template_id             = "c61134de-6fb5-4fd5-8f4a-d3707a9c15df"
      ack_rep_template_id             = "90c0595a-31f6-41b0-ab32-c046a23570c3"
      lpa_qnr_template_id             = "5bf5ac71-2498-4144-80e9-12b9d7cbd3de"
      app_rec_with_fee_template_id    = "6b7e7f49-e0da-4dc7-82dd-2faf033921d3"
      app_rec_without_fee_template_id = "c544f588-fdb2-449f-82ad-cf3f96c8aa43"
      app_not_nat_imp_template_id     = "8c8c5976-ddad-4837-8af5-b7a9ba0db4a4"
    }
  }

  sharepoint = {
    disabled = false
  }
}

auth_config_portal = {
  auth_enabled   = false
  auth_client_id = "8e64dbf3-99f8-4b31-94ee-b621ad68c56f"
  application_id = "da6cd57b-3b80-49f3-afdf-ab76bf1a6d1b"
}

common_config = {
  resource_group_name = "pins-rg-common-prod-ukw-001"
  action_group_names = {
    iap      = "pins-ag-odt-iap-prod"
    its      = "pins-ag-odt-its-prod"
    info_sec = "pins-ag-odt-info-sec-prod"
  }
}

environment = "prod"

front_door_config = {
  name        = "pins-fd-common-prod"
  rg          = "pins-rg-common-prod"
  ep_name     = "pins-fde-crowndev-prod"
  use_tooling = false
}

monitoring_config = {
  app_insights_web_test_enabled = true
}

sql_config = {
  admin = {
    login_username = "pins-crown-sql-prod"
    object_id      = "00d052c3-0a51-4f7d-93fc-7c366877aed6"
  }
  sku_name    = "S3"
  max_size_gb = 100
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
  deploy = true
}

web_domains = { portal = "find-crown-development.planninginspectorate.gov.uk", manage = "crown-developments-manage.planninginspectorate.gov.uk" }

vnet_config = {
  address_space                       = "10.20.12.0/22"
  apps_subnet_address_space           = "10.20.12.0/24"
  main_subnet_address_space           = "10.20.13.0/24"
  secondary_address_space             = "10.20.28.0/22"
  secondary_apps_subnet_address_space = "10.20.28.0/24"
  secondary_subnet_address_space      = "10.20.29.0/24"
}

waf_rate_limits = {
  enabled             = true
  duration_in_minutes = 5
  threshold           = 1500
}
