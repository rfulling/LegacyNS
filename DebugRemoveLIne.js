
var myCheckVb = [];
var intPOInternalId = 142199;
    var objVendorBillRecord = nlapiTransformRecord('purchaseorder', intPOInternalId, 'vendorbill'); // *10 - 4th
   //myCheckVb.push(objVendorBillRecord);
    var numLines = objVendorBillRecord.getLineItemCount('item');
   objVendorBillRecord.setFieldValue('tranid','woeo')       
    for (nb = 1; nb <= numLines; nb++) {
        if(nb> 1){
            if (objVendorBillRecord.getLineItemValue('item', 'item', nb) == objVendorBillRecord.getLineItemValue('item', 'item', nb - 1)) {
                nb -= 1;
                numLines -=1;// objVendorBillRecord.getLineItemCount('item');
            }
            
        }
    }
    var stop = '';
    nlapiSubmitRecord(objVendorBillRecord);