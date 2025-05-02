# A-Z
apps_config = {
  app_service_plan = {
    sku                      = "P0v3"
    per_site_scaling_enabled = false
    worker_count             = 1
    zone_balancing_enabled   = false
  }
  node_environment         = "production"
  private_endpoint_enabled = true

  auth = {
    client_id                = "7776e82e-bbeb-4fe4-abf1-6359c4d31194"
    group_application_access = "409896aa-b295-4992-9ead-c580b64d7a6c"
  }

  contact_email = "not.real@fake.example.com"

  entra = {
    group_ids = {
      # use app access group for now
      case_officers = "409896aa-b295-4992-9ead-c580b64d7a6c"
      inspectors    = "409896aa-b295-4992-9ead-c580b64d7a6c"
    }
  }

  feature_flags = {
    portal_not_live      = false
    upload_docs_not_live = false
  }

  google_analytics_id = null

  logging = {
    level = "warn"
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
    }
  }

  crown_dev_contact_info = {
    email = "crown.dev@planninginspectorate.gov.uk"
  }

  sharepoint = {
    disabled = false
  }
}

auth_config_portal = {
  auth_enabled   = true
  auth_client_id = "8e64dbf3-99f8-4b31-94ee-b621ad68c56f"
  application_id = "35400f77-eff9-467c-b319-7d30388ba02e"
}

common_config = {
  resource_group_name = "pins-rg-common-training-ukw-001"
  action_group_names = {
    iap      = "pins-ag-odt-iap-training"
    its      = "pins-ag-odt-its-training"
    info_sec = "pins-ag-odt-info-sec-training"
  }
}

environment = "training"

front_door_config = {
  name        = "pins-fd-common-tooling"
  rg          = "pins-rg-common-tooling"
  ep_name     = "pins-fde-crowndev"
  use_tooling = true
}

monitoring_config = {
  app_insights_web_test_enabled = true
}

sql_config = {
  admin = {
    login_username = "pins-crown-sql-training"
    object_id      = "7c8f7774-4863-4d99-a2e6-4230abce623c"
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


vnet_config = {
  address_space                       = "10.20.8.0/22"
  apps_subnet_address_space           = "10.20.8.0/24"
  main_subnet_address_space           = "10.20.9.0/24"
  secondary_address_space             = "10.20.24.0/22"
  secondary_apps_subnet_address_space = "10.20.24.0/24"
  secondary_subnet_address_space      = "10.20.25.0/24"
}

web_domains = { portal = "crown-training.planninginspectorate.gov.uk", manage = "crown-manage-training.planninginspectorate.gov.uk" }

waf_rate_limits = {
  enabled             = true
  duration_in_minutes = 5
  threshold           = 1500
}
