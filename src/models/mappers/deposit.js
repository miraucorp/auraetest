const moment = require("moment");

exports.toPaymentResponse = (payment, fiatFees) => {
  return {
    id: payment.id,
    rate: payment.rate,
    amount: payment.amount,
    fee: payment.fee,
    total: payment.totalAmount,
    currency: payment.currencyCode || payment.currency,
    created: payment.created,
    expires: payment.expires,
    address: payment.address,
    fiatAmount: payment.fiatAmount,
    fiatCurrency: payment.fiatCurrencyCode || payment.fiatCurrency,
    status: payment.transactionStatus,
    reference: payment.reference,
    latestConfirmation: payment.latestConfirmation,
    fiatFee: isDefined(fiatFees.paymentFiatFee) ? fiatFees.paymentFiatFee : fiatFees.fiatFee,
    fiatTotal: isDefined(fiatFees.paymentFiatTotal) ? fiatFees.paymentFiatTotal : fiatFees.fiatTotal,
    fiatRate: isDefined(fiatFees.paymentFiatRate) ? fiatFees.paymentFiatRate : fiatFees.fiatRate,
  }
};

exports.toRateResponse = (rate) => {
  return {
    amount: rate.paymentAmount,
    currency: rate.paymentCurrency,
    fee: rate.paymentFee,
    fiatAmount: rate.paymentFiatAmount,
    fiatCurrency: rate.paymentFiatCurrency,
    rate: rate.paymentRate,
    total: rate.paymentTotal,
    created: rate.rateCreated,
    expires: rate.rateExpires,
    fiatFee: rate.paymentFiatFee,
    fiatRate: rate.paymentFiatRate,
    fiatTotal: rate.paymentFiatTotal,
  }
};

exports.toReceivedAmount = (confs = []) => {
  let txSeenAt = undefined;
  // all confirmations should have the same amount
  const txAmount = confs.length > 0 ? confs[0].amount: 0;
  confs.forEach(conf => {
    if (conf.received && !txSeenAt) {
      txSeenAt = moment(conf.received);
    } else if (conf.received && txSeenAt) {
      const rec = moment(conf.received);
      txSeenAt = rec.isBefore(txSeenAt) ? rec : txSeenAt;
    }
  });
  return { txSeenAt, txAmount };
}

function isDefined(val) {
  return val !== undefined && val !== null;
}
