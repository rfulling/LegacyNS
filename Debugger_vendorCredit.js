FLD_COOP_BILLCREDIT = 'custbody_coop_bc_ref';
FLD_DEFECT_BILLCREDIT = 'custbody_defect_bc_ref';
FLD_COOP_REFERENCE = 'custcol_si_coop_cm_ref';
FLD_DEFECT_REFERENCE = 'custcol_si_defective_cm_ref';
FLD_COOP_PERCENT = 'custcol_si_coop_percent';
FLD_DEFECT_PERCENT = 'custcol_si_defective_percent';
var stForm = 125;
var stExpenseAccountParam = 113;
var linACT = 116;
var stId = 1810273;
var coopPerc=323;
var defAllo = 367;

var stLoggerTitle = 'MyDebugger';
var recCoop;
var recDefective;
var bIsBillChanged = false;
recBill = nlapiLoadRecord('vendorbill', 1810273);
var stVendor = recBill.getFieldValue('entity');
var stRefNo = recBill.getFieldValue('tranid');
for (var x = 1; x <= recBill.getLineItemCount('item') ; x++) {
    try {
        recBill.selectLineItem('item', x);
        var flCoopPercent = recBill.getCurrentLineItemValue('item', 'custcol_si_coop_percent');
        var flDefectivePercent = recBill.getCurrentLineItemValue('item', 'custcol_si_defective_percent');
        var stCoopReference = recBill.getCurrentLineItemValue('item', FLD_COOP_REFERENCE);
        var stDefectReference = recBill.getCurrentLineItemValue('item', FLD_DEFECT_REFERENCE);
         nlapiLogExecution('DEBUG', stLoggerTitle, 'coop %: ' + flCoopPercent
                + ', defective %: ' + flDefectivePercent
                + ', coop ref: ' + stCoopReference
                + ', defective ref: ' + stDefectReference);

        /*
         if ((!isEmpty(stCoopReference) || !isEmpty(stDefectReference))) // 9/12/2016 mbuenavides - do not create Bill Credit for this line if there is already an existing coop/defective bill credit
        {
            nlapiLogExecution('DEBUG', stLoggerTitle, 'There is an existing Coop/Defective Reference for line ' + x + '. Proceed to the next line (if any).');
            continue;
        }
        */
        var stItem = recBill.getLineItemValue('item', 'item', x);
        if (!isEmpty(flCoopPercent)) {
            // 9/12/2016 mbuenavides - create vendor credit per applicable coop line
            recCoop = nlapiCreateRecord('vendorcredit', { recordmode: 'dynamic', 'customform': stForm });
            recCoop.setFieldValue('entity', stVendor);
            recCoop.setFieldValue('account', stExpenseAccountParam);

            var stMemo = 'Co-op allow for Int Id ' + stId + ' Item ' + stItem;
            recCoop.setFieldValue('memo', stMemo);
            recCoop.setFieldValue('tranid', stRefNo);

            recCoop.selectNewLineItem('expense');
            recCoop.setCurrentLineItemValue('expense', 'account', coopPerc);
            recCoop.setCurrentLineItemValue('expense', 'location', recBill.getLineItemValue('item', 'location', x));
           // recCoop.setCurrentLineItemValue('item', 'quantity', recBill.getLineItemValue('item', 'quantity', x));
            recCoop.setCurrentLineItemValue('expense', 'amount', forceFloat(recBill.getLineItemValue('item', 'amount', x)) * (forceFloat(flCoopPercent) / forceFloat(100)));
            recCoop.commitLineItem('expense');

            stCoopRecId = nlapiSubmitRecord(recCoop, false, true);
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Successfully created COOP Bill Credit (id) ' + stCoopRecId);

            recBill.setLineItemValue('expense', FLD_COOP_REFERENCE, x, stCoopRecId); // 9/12/2016 mbuenavides - update the coop reference on the bill
            bIsBillChanged = true;
        }
        if (!isEmpty(flDefectivePercent)) {
            // 9/12/2016 mbuenavides - create vendor credit per applicable defective line
            recDefective = nlapiCreateRecord('vendorcredit', { recordmode: 'dynamic', 'customform': stForm });
            recDefective.setFieldValue('entity', stVendor);
            recDefective.setFieldValue('account', stExpenseAccountParam);
            recDefective.setFieldValue('tranid', stRefNo);

            var stMemo = 'Def allow for Int Id ' + stId + ' Item ' + stItem;
            recDefective.setFieldValue('memo', stMemo);  // 9/9/2016 mbuenavides - reference to the originating Bill

            recDefective.selectNewLineItem('expense');
            recDefective.setCurrentLineItemValue('expense', 'account', defAllo);
            recDefective.setCurrentLineItemValue('expense', 'location', recBill.getLineItemValue('item', 'location', x));
            //recDefective.setCurrentLineItemValue('item', 'quantity', recBill.getLineItemValue('item', 'quantity', x));
            recDefective.setCurrentLineItemValue('expense', 'amount', forceFloat(recBill.getLineItemValue('item', 'amount', x)) * (forceFloat(flDefectivePercent) / forceFloat(100)));
            recDefective.commitLineItem('expense');

            stDefectRecId = nlapiSubmitRecord(recDefective, false, true);
            nlapiLogExecution('AUDIT', stLoggerTitle, 'Successfully created Defective Bill Credit (id) ' + stDefectRecId);

            recBill.setLineItemValue('item', FLD_DEFECT_REFERENCE, x, stDefectRecId); // 9/12/2016 mbuenavides - update the defective reference on the bill
            bIsBillChanged = true;
        }
    }
    catch (e) {
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Error in processing line ' + x + '. Proceed to the next line (if any). Details: ' + e.toString());
    }
    nlapiLogExecution('DEBUG', 'test', 'remaining units: ' + objContext.getRemainingUsage());
}


function isEmpty(stValue) {
    if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
        return true;
    }
    else {
        if (typeof stValue == 'string') {
            if ((stValue == '')) {
                return true;
            }
        }
        else if (typeof stValue == 'object') {
            if (stValue.length == 0 || stValue.length == 'undefined') {
                return true;
            }
        }

        return false;
    }
}

function forceFloat (stValue) {
    var flValue = parseFloat(stValue);

    if (isNaN(flValue) || (stValue == Infinity)) {
        return 0.00;
    }

    return flValue;
}