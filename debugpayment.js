require(['N/search',
         'N/record'
], function (search, record) {
    function loadAndRunSearch() {
        //get all accounting periods
        var rec = record.load({
            type: record.Type.CUSTOMER_PAYMENT,
            id: 56171

        });
        var payTotal = rec.getValue({
            fieldId: 'payment'
        })

        log.debug('REDUCEPay total ', payTotal);

        var numLines = rec.getLineCount({
            sublistId: 'apply'
        });
   
        for (var i = 0; i < numLines ; i++) {

            var sublistValue = rec.getSublistValue({
                sublistId: 'apply',
                fieldId: 'due',
                line: i
            });
            var sublistApply = rec.getSublistValue({
                sublistId: 'apply',
                fieldId: 'apply',
                line: i
            });

            if (parseFloat(payTotal) == parseFloat(sublistValue) && sublistApply == false) {
                rec.setSublistValue({
                    sublistId: 'apply',
                    fieldId: 'apply',
                    value: true,
                    line: i
                });
                rec.setValue({
                    fieldId: 'payment',
                    value: payTotal
                });
                rec.setValue({
                    fieldId: 'account',
                    value: 116
                });

              //  log.debug('Updating payment  ', context.key);
                rec.save({ enableSourcing: false, ignoreMandatoryFields: true });
                break;

            }


        }

    }
    loadAndRunSearch();
});