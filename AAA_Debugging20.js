
require(['N/record','N/search'], function (record,search) {
    function createAndSaveContactRecord() {

        var openInvoiceSearch = search.create({
            type: search.Type.INVOICE,
            filters:
                [
                    ["type", "anyof", "CustInvc"],
                    "AND",
                    ["status", "anyof", "CustInvc:A"],
                    "AND",
                    ["custbody_yp_pdf", "isempty", ""],
                    "AND"
                    ["mainline", "is", "T"],
                    "AND",
                    ["memorized", "is", "F"],
                    "AND",
                    ["internalidnumber", "equalto", "142028"],

                ],
            columns:
                [
                    "custbody_yp_pdf",
                    "entity"
                ]
        });

        var arrChildren = openInvoiceSearch.run().getRange({
            start: 0,
            end: 10
        });

        for (var a = 0; a < arrChildren.length; a++) {
            var itemId = arrChildren[a].getValue({ name: 'custrecord_bsg_asset_item' });
            var itemSerial = arrChildren[a].getValue({ name: 'custrecord_bsg_asset_serial' });
            var invLocation = arrChildren[a].getValue({ name: 'custrecord_bsg_asset_inventory_location' });
            var invDetail = getSerialNumber(itemId, invLocation, itemSerial);

            arrUpdateSO.push({'itemId': itemId, 'invDetail': invDetail, 'invLocation': invLocation} );
         }
        updateSo(arrUpdateSO);
       function getSerialNumber(searchRelatedItem, invLocation, serialNumber) {

            var serialNumberSearch = search.create({
                type: record.Type.INVENTORY_NUMBER,
                filters: [
                    ['inventorynumber', 'is', serialNumber], 'and', ['item', 'is', searchRelatedItem],
                    'and', ['location', 'anyof', invLocation]
                ],
                columns: ['internalid']

            });
            var arrSerial = serialNumberSearch.run().getRange({ start: 0, end: 10 });
            return parseInt(arrSerial[0].getValue('internalid'));;
        }

        //loop through the child assets and get get the serial number ids for each
        //build an array to pass to the the sales order udpate routine.
        //
        function updateSo(arrUpdateSo) {
            var soRec = record.load({ type: record.Type.SALES_ORDER, id: 72312, isDynamic: true });
            //lloo through the array
            for (var a = 0; a < arrUpdateSo.length; a++) {
                var lineNum = soRec.selectNewLine('item');

                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item',  value: parseInt(arrUpdateSo[a].itemId) });

                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: -1 });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 0 });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: parseInt(arrUpdateSo[a].invLocation) });

                var subrec = soRec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });
                subrec.selectNewLine({ sublistId: 'inventoryassignment' });
                subrec.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: 1 });
                subrec.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: parseInt(arrUpdateSo[a].invDetail) });
                subrec.commitLine({ sublistId: 'inventoryassignment' });
                soRec.commitLine({ sublistId: 'item' });
            }

                soRec.save();

        }



        var sotp = '';
    

        var getCreatedFromPO = search.create({
            type: record.Type.SALES_ORDER,
            filters: [
                {
                    name: 'internalid',
                    operator: 'anyof',
                    values: soid,
                },
                {
                    name: 'item',
                    operator: search.Operator.ANYOF,
                    values: itemId,
                },
                {
                    name: 'mainline',
                    operator: search.Operator.IS,
                    values: false,
                }
            ],
            columns: [
                {
                    name: 'purchaseorder'
                }
            ],
        });

        var arrPO = getCreatedFromPO.run().getRange({ start: 0, end: 10 });
        var createPO = parseInt(arrPO[0].getValue('purchaseorder'));






        var serialNumberSearch = search.create({
            type: record.Type.INVENTORY_NUMBER,
            filters: [

                ['inventorynumber', 'is', serialNumber, 'and', 'item', 'is', relatedItem]
            ],
            columns: ['internalid']
        });

        var arrSerial = serialNumberSearch.run().getRange({ start: 0, end: 10 });

        var serialId = arrSerial[0].getValue('internalid');

        


        var arrContext = [];

        arrContext = ["{\"recordType\":\"customrecord_bsg_asset_card\",\"id\":\"39280\",\"values\":{\"custrecord_bsg_asset_item\":{\"value\":\"20680\",\"text\":\"T15\"},\"custrecord_bsg_asset_sell_price\":\"\",\"custrecord_bsg_asset_serial\":\"123\"}}"]

        var serialNumber = arrContext.custrecord_bsg_asset_serial;

        var transactionSearch = search.lookupFields({
            type: 'transaction',
            id: 59093,
            columns: ['createdfrom', 'createdFrom.customform', 'createdfrom.custbody_bsg_asset_card', 'createdfrom.name', 'type','recordType']
        });

        var soText = transactionSearch.tranid;
        var soId = transactionSearch.createdfrom;
        var transType = transactionSearch.type;


        if ( transactionSearch && transactionSearch['createdfrom.custbody_bsg_asset_card'][0]) {
            var myAsset = transactionSearch['createdfrom.custbody_bsg_asset_card'][0].value;
                                    
        }

        if (myAsset) {
            log.debug('my asset is ', myAsset);
        }
            


        var arrTran = [];
        arrTran = { "type": "message", "isDynamic": false, "fields": { "preview": "F", "subject": "Total Warehouse: Invoice #117433", "_eml_nkey_": "232251023", "requestreadreceipt": "F", "type": "crmmessage", "emailpreference": "DEFAULT", "nsapiCT": "1538668612372", "sys_id": "-1149680475512948", "compressattachments": "F", "editsource": "F", "templatetype": "EMAIL", "mergetypesmessages": "Transaction", "whence": "/app/accounting/transactions/custinvc.nl?id=54169", "author": "27917", "entryformquerystring": "transaction=54169&entity=20288&l=T&templatetype=EMAIL", "_csrf": "sVApgVfx_tSd1vpjMJNDl3D-UV0_nfnHab2Ud4fE69MdOMqBQMxWDioRbRB2FkI9aSJ-doGWkXJDver1P48x-QGFkptV1vP_LISFfRP-vXDlAJlhoU1RxtJKd7KDv7mvpD-ZsUu6SHUkT9fPcgcZcQhaDl4lOVm63ree9p-EhSc=", "l": "T", "entitytype": "custjob", "templatecategory": "0", "recipient": "20288", "includetransaction": "T", "recipienttype": "Customer", "updatetemplate": "F", "transaction": "54169", "entity": "20288" } }

        var item = '1234';
        var loc = '2334';
        var qty = 1;
        var tType = ['CustInvc', 'SalesOrd'];

        var tStatsu = [
            'CustCred:A',
            'CustInvc:A',
            'SalesOrd:D',
            'SalesOrd:A',
            'SalesOrd:F',
            'SalesOrd:E',
            'SalesOrd:B'
        ];

        

        var curEntity = parseInt(20288);
        var transAction = 9872;
        var filters = [];
        filters.push(['type', 'anyof', tType], 'and',[ 'mainline', 'is', 'T'], 'and',[ 'status', 'anyof', tStatsu ]);
          filters.push('and');
       // filters.push(['mainline', 'id', 'T']);
      //  filters.push('and');


        var tFilter = [];
        tFilter.push(['entity', 'anyof', curEntity]);
        if (transAction) {
            tFilter.push('or');
            tFilter.push(['internalid', 'anyof', transAction]);
        }
       

        filters.push(tFilter);

        var contactSearch = search.create({
            type: 'transaction',
            filters: filters,
            columns: ['entity']
        });

        var searchFilter = search.createFilter({
            name: 'internalid',
            join: 'customer',
            operator: search.Operator.ANYOF,
            values: curEntity
        });
     
        if (transAction) {
            var searchFilterCurrentTrans = search.createFilter({
                name: 'internalid',
                operator: search.Operator.ANYOF,
                values: transAction
            });
        }
        var assetID = search.createColumn({
            name: 'custbody_bsg_asset_card',
            join: 'createdfrom'
        });

        var searchToRun = 'customsearch_bjh_email_transaction';
        var tranSearch = search.load({ id: searchToRun });

        tranSearch.filters.push(searchFilter);
                if (transAction) {
                    tranSearch.filters.push(searchFilterCurrentTrans);
                }
        tranSearch.columns.push(assetID);


        var arrInv = contactSearch.run().getRange({
            start: 0,
            end: 500
        });

        var arrSAVED = tranSearch.run().getRange({
            start: 0,
            end: 500
        });

        var objRecord = record.create({
            type: record.Type.PURCHASE_ORDER,
            isDynamic: true,
            isDropShip: true
        });


        objRecord.setValue({
            fieldId: 'entity',
            value: '8'
        });
        objRecord.setValue({
            fieldId: 'createdfrom',
            value: '5582'
        });

        objRecord.setValue({
            fieldId: 'custbody_nsts_gaw_tran_requestor',
            value: '3'
        });

        objRecord.setValue({
            fieldId: 'custbody_nsts_gaw_tran_requestor',
            value: '3'
        });

        var recordId = objRecord.save({
            enableSourcing: false,
            ignoreMandatoryFields: false
        });
    }
    createAndSaveContactRecord();
});


