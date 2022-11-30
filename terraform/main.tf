module "beanstalk-web-app-internal" {
  source             = "../../aws-terraform-modules/modules/beanstalk-web-internal-application"
  app_name           = "${module.label.id}"
  domain             = "${module.label.domain}"
  environment        = "${module.label.environment}"
  environment_domain = "${module.vpc-label.environment_domain}"
  original_name      = "${module.label.id_original}"
  dns_name           = "${module.label.name}"

  vpc_name                    = "${module.vpc-label.vpc_name}"
  vpc_link_expose_enabled     = "true"
  vpc_link_port               = "705"
  beanstalk_service_role_name = "${module.vpc-label.beanstalk_service_role_name}"
  ec2_instance_profile_name   = "${module.vpc-label.beanstalk_ec2_profile_name}"
  keypair                     = "${module.vpc-label.beanstalk_keypair_name}"
  nodejs_command              = "npm run starteb"

  autoscale_min                  = "${module.config.beanstalk_autoscale_min}"
  autoscale_max                  = "${module.config.beanstalk_autoscale_max}"
  availability_zones             = "${module.config.beanstalk_availability_zones}"
  managed_updates_enabled        = "${module.config.beanstalk_managed_updates_enabled}"
  autoscale_lower_bound          = "${module.config.beanstalk_autoscale_lower_bound}"
  autoscale_upper_bound          = "${module.config.beanstalk_autoscale_upper_bound}"
  health_system_type             = "${module.config.beanstalk_health_system_type}"
  deployment_policy              = "${module.config.beanstalk_deployment_policy}"
  deployment_ignore_health_check = "${module.config.beanstalk_deployment_ignore_health_check}"
  rolling_update_enabled         = "${module.config.beanstalk_rolling_update_enabled}"
  rolling_update_type            = "${module.config.beanstalk_rolling_update_type}"
  updating_min_in_service        = "${module.config.beanstalk_updating_min_in_service}"
  updating_max_batch             = "${module.config.beanstalk_updating_max_batch}"

  env_vars = {
    AWS_REGION    = "${module.config.region}"
    APP_ENV       = "${module.label.environment}"
    DOTENV_CONFIG = "${module.config.beanstalk_dotenv_config}"
  }

  tags     = "${module.label.tags}"
  vpc_tags = "${module.vpc-label.tags}"
}

module "codebuild" {
  source                  = "../../aws-terraform-modules/modules/codebuild-v2"
  project_name            = "${module.label.id_branch}"
  environment_name        = "${module.label.environment}"
  region                  = "${module.config.region}"
  domain                  = "${module.label.domain}"
  environment_domain      = "${module.vpc-label.environment_domain}"
  codebuild_docker_image  = "${module.config.docker_image_nodejs}"
  git_branch              = "${module.git.git_branch}"
  iam_role_name           = "${module.vpc-label.codebuild_role_name}"
  terraform_resource_name = "${module.label.id_invoker}"

  tags = "${module.label.tags}"
}
