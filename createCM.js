// JavaScript source code
/**
 *@NApiVersion 2.x
 */
require(['N/record'],
    function (record) {
        function createAndSaveContactRecord() {
            var recordObj = record.create({
                type: record.Type.CREDIT_MEMO,
                defaultValues: { entity: 23 },
                isDynamic: true
            });


            //here loop hrought the apply lines get the cm to apply 

            var recordId = recordObj.save({
                enableSourcing: false,
                ignoreMandatoryFields: false
            });
        }
        createAndSaveContactRecord();
    });