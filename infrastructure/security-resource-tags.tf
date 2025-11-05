module "security_tags" {
  for_each   = local.resource_tags

  source     = "github.com/Planning-Inspectorate/infrastructure-modules.git//modules/resource-tags?ref=d43de9b0ad48b7bc740b5ffcb910fcab3317bc05"
  base_tags  = local.tags
  extra_tags = each.value
}

locals {
  resource_tags = {
    manage = {
      CriticalityRating = "Level 1"
      PersonalData      = "Yes"
    }
    sql = {
      CriticalityRating = "Level 3"
      PersonalData      = "No"
    }
    portal = {
      CriticalityRating = "Level 2"
      PersonalData      = "Yes"
    }
  }
}
