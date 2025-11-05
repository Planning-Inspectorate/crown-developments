module "security_tags" {
  for_each   = local.resource_tags

  source     = "github.com/Planning-Inspectorate/infrastructure-modules.git//modules/resource-tags?ref=67299bea06b43f03774d8665b184a093e4147359"
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
