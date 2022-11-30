# deployment sets

module "crypto-payments" {
  source            = "../../aws-terraform-modules/modules/dynamodb-table"
  service_full_name = "${module.label.id}"
  table_name        = "crypto-payments"
  read_capacity     = "${module.config.dynamodb_read_capacity}"
  write_capacity    = "${module.config.dynamodb_write_capacity}"

  hash_key       = "id"
  attribute_name = "id"
  attribute_type = "S"

  tags = "${module.vpc-label.tags}"
}

module "crypto-payments-parameter" {
  source             = "../../aws-terraform-modules/modules/ssm-parameter"
  original_name      = "${module.label.id_original}"
  environment_domain = "${module.vpc-label.environment_domain}"

  key   = "DDB_CRYPTO_PAYMENTS_TABLE"
  value = "${module.crypto-payments.table_name}"

  tags = "${module.vpc-label.tags}"
}

module "crypto-payments-balances" {
  source            = "../../aws-terraform-modules/modules/dynamodb-table"
  service_full_name = "${module.label.id}"
  table_name        = "crypto-payments-balances"
  read_capacity     = "${module.config.dynamodb_read_capacity}"
  write_capacity    = "${module.config.dynamodb_write_capacity}"

  hash_key       = "id"
  attribute_name = "id"
  attribute_type = "S"

  tags = "${module.vpc-label.tags}"
}

module "crypto-payments-balances-parameter" {
  source             = "../../aws-terraform-modules/modules/ssm-parameter"
  original_name      = "${module.label.id_original}"
  environment_domain = "${module.vpc-label.environment_domain}"

  key   = "DDB_CRYPTO_PAYMENTS_BALANCES_TABLE"
  value = "${module.crypto-payments-balances.table_name}"

  tags = "${module.vpc-label.tags}"
}

module "crypto-payments-confirmations" {
  source            = "../../aws-terraform-modules/modules/dynamodb-table"
  service_full_name = "${module.label.id}"
  table_name        = "crypto-payments-confirmations"
  read_capacity     = "${module.config.dynamodb_read_capacity}"
  write_capacity    = "${module.config.dynamodb_write_capacity}"

  hash_key       = "id"
  attribute_name = "id"
  attribute_type = "S"

  tags = "${module.vpc-label.tags}"
}

module "crypto-payments-confirmations-parameter" {
  source             = "../../aws-terraform-modules/modules/ssm-parameter"
  original_name      = "${module.label.id_original}"
  environment_domain = "${module.vpc-label.environment_domain}"

  key   = "DDB_CRYPTO_PAYMENTS_CONFIRMATIONS_TABLE"
  value = "${module.crypto-payments-confirmations.table_name}"

  tags = "${module.vpc-label.tags}"
}

module "crypto-payments-fxs" {
  source            = "../../aws-terraform-modules/modules/dynamodb-table"
  service_full_name = "${module.label.id}"
  table_name        = "crypto-payments-fxs"
  read_capacity     = "${module.config.dynamodb_read_capacity}"
  write_capacity    = "${module.config.dynamodb_write_capacity}"

  hash_key       = "id"
  attribute_name = "id"
  attribute_type = "S"

  tags = "${module.vpc-label.tags}"
}

module "crypto-payments-fxs-parameter" {
  source             = "../../aws-terraform-modules/modules/ssm-parameter"
  original_name      = "${module.label.id_original}"
  environment_domain = "${module.vpc-label.environment_domain}"

  key   = "DDB_CRYPTO_PAYMENTS_FXS_TABLE"
  value = "${module.crypto-payments-fxs.table_name}"

  tags = "${module.vpc-label.tags}"
}
