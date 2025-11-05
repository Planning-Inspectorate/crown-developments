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
      version = "> 4"
    }
  }
  required_version = ">= 1.11.0, < 1.15.0"
}

provider "azurerm" {
  features {}
}

provider "azurerm" {
  # either tooling or prod for shared FD instance
  alias           = "front_door"
  subscription_id = var.front_door_config.use_tooling == true ? var.tooling_config.subscription_id : null

  features {}
}

provider "azurerm" {
  alias           = "tooling"
  subscription_id = var.tooling_config.subscription_id
  features {}
}

# module "security_tags" {
#   source = "github.com/Planning-Inspectorate/infrastructure-modules.git//modules/resource-tags?ref=d43de9b0ad48b7bc740b5ffcb910fcab3317bc05"
#   base_tags  = local.tags
#   extra_tags = {
#     CriticalityRating = var.criticality_rating
#     PersonalData      = var.personal_data
#   }
# }

# variable "criticality_rating" {
#   type        = string
#   description = "Criticality rating for this resource"
#   validation {
#     condition     = contains(["Level 1", "Level 2", "Level 3"], var.criticality_rating)
#     error_message = "Criticality rating must be one of: Level 1, Level 2, Level 3."
#   }
# }

# variable "personal_data" {
#   type        = string
#   description = "Whether this resource processes personal data"
#   validation {
#     condition     = contains(["Yes", "No"], var.personal_data)
#     error_message = "PersonalData must be Yes or No."
#   }
# }
