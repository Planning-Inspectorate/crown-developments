#https://2mas.github.io/blog/rotating-azure-app-registration-secrets-with-terraform/
# Two rotators, offset by half of the rotation period
resource "time_rotating" "session_secret_a" {
  rotation_months = 6
}

resource "time_rotating" "session_secret_b" {
  rfc3339         = timeadd(time_rotating.session_secret_a.rfc3339, "2160h") # + 3 months
  rotation_months = 6

  lifecycle {
    ignore_changes = [rfc3339]
  }
}
