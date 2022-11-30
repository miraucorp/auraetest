# pipeline sets

locals {
  git_branch = "${module.config.default_environment_branch}"
}

module "codepipeline" {
  source      = "../../aws-terraform-modules/modules/sets/pipelines/source-build-invoker-beanstalk"
  aws_profile = "${local.aws_profile}"
  region      = "${module.config.region}"
  environment = "${module.config.environment_name}"
  domain      = "${local.domain}"

  name          = "${local.name}"
  git_repo      = "${local.git_repo}"
  git_branch    = "${local.git_branch}"
  token_payload = "${module.config.token_payload}"

  codebuild_project_name     = "${module.codebuild.project_name}"
  beanstalk_application_name = "${module.beanstalk-web-app-internal.name}"
}

output "pretty_pipeline" {
  value = "${module.codepipeline.pretty}"
}
