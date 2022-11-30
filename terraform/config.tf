module "vpc-label" {
  source      = "../../aws-terraform-modules/modules/env-label"
  name        = "${local.domain}"
  environment = "${module.config.environment_name}"
  domain      = "${local.domain}"
  region      = "${module.config.region}"
}

module "label" {
  source = "../../aws-terraform-modules/modules/label-v2"

  name = "${local.name}"

  domain      = "${module.vpc-label.domain}"
  environment = "${module.config.environment_name}"
  branch      = "${module.config.default_environment_branch}"
}

module "git" {
  source = "../../aws-terraform-modules/modules/git"

  git_repo = "${local.git_repo}"

  git_owner     = "${module.config.git_owner}"
  git_branch    = "${local.git_branch}"
  token_payload = "${module.config.token_payload}"
}
