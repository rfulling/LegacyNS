

//first open the RMA and get the item reciept if none exit
var rma = nlapiLoadRecord('returnauthorization',5847269);
//get list of item reciepts
objRecCreditMemo = nlapiTransformRecord('returnauthorization', 5847269, 'creditmemo');
var linCount = objRecCreditMemo.getLineItemCount('item');

for (var i = 1; i <= linCount; i++) {
    var itemID1 = objRecCreditMemo.getLineItemValue('item', 'item', i);
    var qty = getRMAReturnedQty(itemID1, rma);
    if (qty != 0) {
        objRecCreditMemo.setLineItemValue('item', 'quantity', i, qty);
    }
    nlapiSubmitRecord(objRecCreditMemo);
}

function getRMAReturnedQty(itemID,rma) {
    var qty = 0;
    var lineCnt = rma.getLineItemCount('item');
    for (var x = 1; x <= linCount; x++) {
        var rmaItem = rma.getLineItemValue('item', 'item', x);
        if (itemID == rmaItem) {
            qty = rma.getLineItemValue('item', 'quantityreceived', x);
        }
      }
    return qty;

}


