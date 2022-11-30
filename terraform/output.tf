output "app_name" {
  value = "${module.beanstalk-web-app-internal.name}"
}

output "application_name" {
  value = "${module.beanstalk-web-app-internal.application_name}"
}

output "dns_name" {
  value = "${module.beanstalk-web-app-internal.elb_dns_name}"
}

output "host" {
  value = "${module.beanstalk-web-app-internal.host}"
}

output "security_group_id" {
  value = "${module.beanstalk-web-app-internal.security_group_id}"
}

output "beanstalk_load_balancers" {
  value = "${module.beanstalk-web-app-internal.load_balancers}"
}
