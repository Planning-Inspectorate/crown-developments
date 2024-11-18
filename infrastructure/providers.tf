terraform {
  backend "azurerm" {
    subscription_id      = "edb1ff78-90da-4901-a497-7e79f966f8e2"
    resource_group_name  = "pins-rg-shared-terraform-uks"
    storage_account_name = "pinssttfstateukscrowndev"
    # per-environment key & container_name specified init step
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "=4.10.0"
    }
  }
  required_version = ">= 1.1.6, < 1.10.0"
}

provider "azurerm" {
  features {}
}

provider "azurerm" {
  alias           = "tooling"
  subscription_id = var.tooling_config.subscription_id
  features {}
}
